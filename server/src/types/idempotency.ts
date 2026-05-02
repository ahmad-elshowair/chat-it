// ───── IDEMPOTENCY TYPES ──────────────────────────────

export interface IdempotencyRecord {
  statusCode: number;
  body: string;
  contentType: string;
}
