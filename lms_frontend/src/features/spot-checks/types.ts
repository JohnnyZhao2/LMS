/**
 * 抽查相关类型定义
 */

export type SpotCheckStatus = 'PENDING' | 'SUBMITTED' | 'SCORED';

export interface SpotCheckItem {
  id?: number;
  topic: string;
  /** 导师要求说明，提交后仍保留 */
  instruction?: string;
  /** 学员填写内容 */
  content?: string;
  score?: string | null;
  comment?: string;
  images?: string[];
  order?: number;
}

interface SpotCheckActions {
  delete: boolean;
  submit: boolean;
  score: boolean;
}

export interface SpotCheck {
  id: number;
  /** 同次批量发起的批次标识 */
  batch_id: string | null;
  student: number;
  student_name: string;
  student_employee_id?: string;
  student_avatar_key: string;
  student_department?: string | null;
  checker: number;
  checker_name: string;
  checker_avatar_key: string;
  status: SpotCheckStatus;
  submitted_at: string | null;
  /** 乐观锁版本号 */
  revision: number;
  topic_count: number;
  topic_summary: string;
  average_score: string | null;
  items: SpotCheckItem[];
  actions: SpotCheckActions;
  created_at: string;
  updated_at: string;
}

export interface SpotCheckStudent {
  id: number;
  username: string;
  employee_id?: string;
  avatar_key?: string | null;
  department_name?: string | null;
}

export interface SpotCheckCreateRequest {
  students: number[];
  items: Array<{ topic: string; instruction?: string }>;
}

export interface SpotCheckSubmitRequest {
  revision: number;
  items: Array<{ id: number; content: string; images: string[] }>;
}

export interface SpotCheckScoreRequest {
  revision: number;
  items: Array<{ id: number; score: string | null; comment: string }>;
}
