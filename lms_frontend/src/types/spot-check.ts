/**
 * 抽查相关类型定义
 */

export interface SpotCheckItem {
  id?: number;
  topic: string;
  score: string;
  comment: string;
  order?: number;
}

/**
 * 抽查记录
 */
export interface SpotCheck {
  id: number;
  student: number;
  student_name: string;
  student_employee_id?: string;
  student_avatar_key: string;
  student_department?: string | null;
  checker: number;
  checker_name: string;
  checker_avatar_key: string;
  topic_count: number;
  topic_summary: string;
  average_score: string | null;
  items: SpotCheckItem[];
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

/**
 * 创建抽查请求
 */
export interface SpotCheckCreateRequest {
  student: number;
  items: SpotCheckItem[];
}
