import { NextFunction, Request, Response } from 'express';
import redisClient, { isRedisConnected } from '../database/redis.js';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { IdempotencyRecord } from '../types/idempotency.js';

// ───── CONSTANTS ──────────────────────────────

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_KEY_LENGTH = 128;
const TTL_SECONDS = 86400;
const MAX_CACHE_SIZE_BYTES = 1024 * 1024;
const CLAIM_SENTINEL = 'PENDING';

// ───── MIDDLEWARE ──────────────────────────────

/**
 * Idempotency-Key middleware for POST/PUT/PATCH routes only.
 * Validates UUID v4 header, claims via Redis SET NX with 'PENDING' sentinel,
 * caches non-5xx response on completion. Fail-open on Redis unavailability.
 *
 * NOTE: Only intercepts res.json(). If a handler uses res.send() or res.end()
 * directly, the response will not be cached. All project controllers use
 * sendResponse utility which calls res.json() internally.
 * @route Applied per-route to mutating endpoints only
 */
export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'DELETE') {
    return next();
  }

  const rawKey = req.headers['idempotency-key'];

  if (!rawKey || typeof rawKey !== 'string') {
    return next();
  }

  const key = rawKey.trim();

  if (key.length > MAX_KEY_LENGTH || !UUID_V4_REGEX.test(key)) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: 'Invalid Idempotency-Key format. Must be UUID v4.',
    });
  }

  const userId = (req as ICustomRequest).user?.id;
  if (!userId) {
    return next();
  }

  // ───── FAIL-OPEN: REDIS UNAVAILABLE ──────────────────────────────
  if (!isRedisConnected) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'Idempotency Redis unavailable — fail-open',
        userId,
      }),
    );
    return next();
  }

  const routePath = req.baseUrl + (req.route?.path || '');
  const redisKey = `idem:${userId}:${req.method}:${routePath}:${key}`;

  try {
    const claimed = await redisClient.set(redisKey, CLAIM_SENTINEL, 'EX', TTL_SECONDS, 'NX');

    if (!claimed) {
      const cached = await redisClient.get(redisKey);

      if (cached && cached !== CLAIM_SENTINEL && cached.startsWith('{')) {
        try {
          const record: IdempotencyRecord = JSON.parse(cached);
          console.info(
            JSON.stringify({
              level: 'info',
              message: 'Idempotency cache hit',
              userId,
              cachedStatus: record.statusCode,
            }),
          );
          return res
            .status(record.statusCode)
            .set('Content-Type', record.contentType)
            .send(record.body);
        } catch {
          // Malformed cache — treat as in-flight
        }
      }

      return res.status(409).json({
        success: false,
        status: 409,
        message: 'A request with this idempotency key is already being processed',
      });
    }

    // ───── CLAIM ACQUIRED — INTERCEPT res.json ──────────────────────────────
    const _originalJson = res.json;

    res.json = function (body: unknown) {
      res.json = _originalJson;

      const result = _originalJson.call(this, body);

      if (res.statusCode < 500) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

        if (Buffer.byteLength(bodyStr) <= MAX_CACHE_SIZE_BYTES) {
          const record: IdempotencyRecord = {
            statusCode: res.statusCode,
            body: bodyStr,
            contentType: 'application/json',
          };

          redisClient.setex(redisKey, TTL_SECONDS, JSON.stringify(record)).catch(() => {
            // Silent fail — response already sent
          });
        } else {
          console.warn(
            JSON.stringify({
              level: 'warn',
              message: 'Idempotency response exceeds 1MB cap — skipping cache',
              userId,
              routePath,
            }),
          );
        }
      }

      return result;
    };

    next();
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'Idempotency Redis error — fail-open',
        error: (error as Error).message,
      }),
    );
    next();
  }
};
