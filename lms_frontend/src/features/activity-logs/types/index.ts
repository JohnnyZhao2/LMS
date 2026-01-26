/**
 * 用户日志类型
 */
export interface UserLog {
  id: number;
  user: {
    id: number;
    employee_id: string;
    username: string;
  };
  operator: {
    id: number;
    employee_id: string;
    username: string;
  } | null;
  action: string;
  description: string;
  status: 'success' | 'failed';
  created_at: string;
}

/**
 * 内容日志类型
 */
export interface ContentLog {
  id: number;
  content_type: 'knowledge' | 'quiz' | 'question' | 'assignment';
  content_id: string;
  content_title: string;
  operator: {
    id: number;
    employee_id: string;
    username: string;
  };
  action: 'create' | 'update' | 'delete' | 'publish';
  description: string;
  status: 'success' | 'failed';
  created_at: string;
}

/**
 * 操作日志类型
 */
export interface OperationLog {
  id: number;
  operator: {
    employee_id: string;
    username: string;
    role: string;
  };
  operation_type: 'task_management' | 'grading' | 'spot_check' | 'data_export' | 'submission' | 'learning';
  action: string;
  description: string;
  status: 'success' | 'failed' | 'partial';
  duration: number;
  created_at: string;
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
