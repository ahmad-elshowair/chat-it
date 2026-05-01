import type { PoolClient } from 'pg';

export type TActorType = 'user' | 'system';

export type TAuditRecord = {
  id: string;
  actor_id: string;
  actor_type: TActorType;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export type TAuditQueryParams = {
  actor_id?: string;
  actor_type?: TActorType;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
  direction?: 'next' | 'previous';
};

export type TAuditEmitParams = {
  client?: PoolClient;
  actorId: string;
  actorType: TActorType;
  action: string;
  entityType: string;
  entityId: string;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress?: string;
};
