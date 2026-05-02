// ───── PG ERROR TYPES ──────────────────────────────

export interface PgErrorDetail {
  constraint: string | null;
  table: string | null;
  schema: string | null;
  detail: string | null;
  column: string | null;
}

export interface PgClassifiedError {
  httpStatus: number;
  userMessage: string;
  pgCode: string;
  pgDetail: PgErrorDetail;
  retryable: boolean;
}
