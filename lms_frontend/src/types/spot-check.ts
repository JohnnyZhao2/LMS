/**
 * 抽查相关类型定义
 */

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
  content: string;
  score: string;
  comment?: string;
  checked_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建抽查请求
 */
export interface SpotCheckCreateRequest {
  student: number;
  content: string;
  score: string;
  comment?: string;
  checked_at: string;
}
