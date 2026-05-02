import { NextFunction, Response } from 'express';
import config from '../configs/config.js';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { AppError } from '../utilities/appError.js';
import { classifyPgError } from '../utilities/pgError.js';

const errorMiddleware = (error: Error, req: ICustomRequest, res: Response, _next: NextFunction) => {
  const userId = req.user?.id ?? null;
  const timestamp = new Date().toISOString();

  // ───── PRIORITY 1: APP ERROR (INTENTIONAL HTTP ERRORS) ──────────────────────────────
  if (error instanceof AppError) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Operational error',
        status: error.status,
        requestMethod: req.method,
        requestPath: req.path,
        userId,
        timestamp,
        isOperational: error.isOperational,
        ...(config.node_env === 'development' && { stack: error.stack }),
      }),
    );

    return res.status(error.status).json({
      success: false,
      status: error.status,
      message: error.message,
      ...(config.node_env === 'development' && { stack: error.stack }),
    });
  }

  // ───── PRIORITY 2: PG ERROR CLASSIFICATION ──────────────────────────────
  const classified = classifyPgError(error);

  if (classified.pgCode !== 'UNKNOWN') {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Classified PG error',
        httpStatus: classified.httpStatus,
        pgCode: classified.pgCode,
        pgConstraint: classified.pgDetail.constraint,
        pgTable: classified.pgDetail.table,
        pgSchema: classified.pgDetail.schema,
        pgDetail: classified.pgDetail.detail,
        pgColumn: classified.pgDetail.column,
        retryable: classified.retryable,
        requestMethod: req.method,
        requestPath: req.path,
        userId,
        timestamp,
        ...(config.node_env === 'development' && { stack: error.stack }),
      }),
    );

    return res.status(classified.httpStatus).json({
      success: false,
      status: classified.httpStatus,
      message: classified.userMessage,
      ...(config.node_env === 'development' && { stack: error.stack }),
    });
  }

  // ───── PRIORITY 3: FALLBACK — UNEXPECTED ERROR ──────────────────────────────
  const status = (error as { status?: number }).status || 500;

  console.error(
    JSON.stringify({
      level: 'error',
      message: 'Unhandled error',
      status,
      requestMethod: req.method,
      requestPath: req.path,
      userId,
      timestamp,
      ...(config.node_env === 'development' && { stack: error.stack }),
    }),
  );

  res.status(status).json({
    success: false,
    status,
    message: status >= 500 ? 'An unexpected error occurred' : error.message,
    ...(config.node_env === 'development' && { stack: error.stack }),
  });
};

export default errorMiddleware;
