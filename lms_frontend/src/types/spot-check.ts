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
  checker: number;
  checker_name: string;
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
