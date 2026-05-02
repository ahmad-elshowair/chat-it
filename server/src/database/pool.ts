import { Pool } from 'pg';
import config from '../configs/config.js';

// ───── POOL CONFIGURATION ──────────────────────────────

const pool = new Pool({
  user: config.pg_user,
  password: config.pg_password,
  host: config.pg_host,
  port: config.pg_port,
  database: config.pg_database,
  max: config.db_pool_max,
  connectionTimeoutMillis: config.db_connection_timeout_ms,
  idleTimeoutMillis: config.db_idle_timeout_ms,
});

pool.on('error', (error: Error) => {
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'Unexpected error on idle client',
      errorMessage: error.message,
    }),
  );
});

export default pool;
