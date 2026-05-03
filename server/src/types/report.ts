export type TargetType = 'post' | 'comment' | 'user';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'impersonation'
  | 'other';

export type ReportStatus = 'pending' | 'dismissed' | 'resolved';

export type TReport = {
  report_id: string;
  reporter_id: string;
  target_type: TargetType;
  target_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
};

export type TReportInput = {
  reporter_id: string;
  target_type: TargetType;
  target_id: string;
  reason: ReportReason;
  description?: string;
};
