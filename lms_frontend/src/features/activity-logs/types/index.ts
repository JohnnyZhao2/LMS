export type ActivityLogType = 'user' | 'content' | 'operation';
export type ActivityLogStatus = 'success' | 'failed' | 'partial';

export interface ActivityLogActor {
  id: number;
  employee_id: string;
  username: string;
}

export interface ActivityLogItem {
  id: string;
  category: ActivityLogType;
  actor: ActivityLogActor | null;
  action: string;
  status: ActivityLogStatus;
  summary: string;
  description: string;
  created_at: string;
}

export interface ActivityLogMember {
  user: ActivityLogActor;
  activity_count: number;
  last_activity_at: string;
}

export interface ActivityLogListResponse {
  members: ActivityLogMember[];
  results: ActivityLogItem[];
  count: number;
  page: number;
  page_size: number;
}

export interface ActivityLogsQuery {
  type: ActivityLogType;
  page: number;
  pageSize: number;
  memberIds?: number[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  action?: string;
  status?: Exclude<ActivityLogStatus, 'partial'> | ActivityLogStatus;
}

export interface ActivityLogPolicy {
  id: number;
  key: string;
  category: 'user' | 'content' | 'operation';
  group: string;
  label: string;
  enabled: boolean;
  updated_at: string;
}
