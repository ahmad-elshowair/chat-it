import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './configs/config.js';
import pool from './database/pool.js';
import redisClient from './database/redis.js';
import errorMiddleware from './middlewares/error.js';
import routes from './routes/index.js';
import { scheduledTokenCleanup } from './utilities/scheduledTasks.js';
import { shutdownController } from './utilities/shutdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Application = express();

const port: number = config.port;

app.use('/api/images', express.static(path.join(__dirname, '../public/images')));

// use the middleware of express.json and helmet and morgan
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const prodCSPDirectives: Record<string, string[]> = {
  'script-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'img-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
};

const devCSPDirectives: Record<string, string[]> = {
  'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'http://localhost:3000'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'img-src': ["'self'", 'http://localhost:3000'],
  'style-src': ["'self'", "'unsafe-inline'", 'http://localhost:3000'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'http://localhost:3000', 'ws://localhost:3000'],
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: config.node_env === 'development' ? devCSPDirectives : prodCSPDirectives,
    },
  }),
);
app.use(morgan('dev'));
app.use(cookieParser());

const allowedOrigins =
  config.node_env === 'development'
    ? ['http://localhost:3000', config.client_url_dev]
    : [config.client_url_prod];

// use the cors
app.use(
  cors({
    origin: function (origin, callback) {
      // IN development MODE, ACCEPT REQUESTS FROM ANT ORIGIN.
      if (config.node_env === 'development') {
        callback(null, true);
      } else if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('Block by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Fingerprint',
      'csrf-token',
      'CSRF-Token',
      'Origin',
      'Accept',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-CSRF-Token'],
  }),
);

// create a get request of home endpoint
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello World!');
});

// use all routes
app.use('/api', routes);

// use middleware of error
app.use(errorMiddleware);

app.use((_req: Request, res: Response) => {
  res.status(404).json('YOU HAVE GOT LOST !');
});

// Start the scheduled token cleanup
scheduledTokenCleanup();

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// ───── GRACEFUL SHUTDOWN ──────────────────────────────

let isShuttingDown = false;

const gracefulShutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.info(
    JSON.stringify({
      level: 'info',
      message: 'Shutdown initiated',
    }),
  );

  shutdownController.abort();

  server.close(() => {
    console.info(
      JSON.stringify({
        level: 'info',
        message: 'Shutdown completed — all connections closed',
      }),
    );

    Promise.all([pool.end(), redisClient.quit()])
      .then(() => {
        console.info('PostgreSQL pool and Redis connection closed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Error closing connections:', error);
        process.exit(1);
      });
  });

  setTimeout(() => {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Forced shutdown — grace period expired',
      }),
    );
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
