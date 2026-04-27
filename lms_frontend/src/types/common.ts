/**
 * 通用类型定义
 * 包括枚举类型、基础类型、标签和分页
 */

// ==================== 枚举类型 ====================

/**
 * 角色代码
 */
export type RoleCode = 'STUDENT' | 'MENTOR' | 'DEPT_MANAGER' | 'ADMIN' | 'TEAM_MANAGER' | 'SUPER_ADMIN';

/**
 * 任务状态
 */
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_GRADING' | 'COMPLETED' | 'OVERDUE';
export type TaskExecutionStatus = TaskStatus | 'COMPLETED_ABNORMAL';

/**
 * 提交状态
 */
export type SubmissionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADING' | 'GRADED';

/**
 * 题目类型
 */
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

/**
 * 标签类型
 */
export type TagType = 'SPACE' | 'TAG';

// ==================== 标签相关 ====================

/**
 * 统一标签
 */
export interface Tag {
  id: number;
  name: string;
  color: string;
  tag_type: TagType;
  tag_type_display: string;
  sort_order: number;
  allow_knowledge: boolean;
  allow_question: boolean;
}

/**
 * 简单标签（用于列表显示）
 */
export interface SimpleTag {
  id: number;
  name: string;
  color?: string;
}

// ==================== 基础类型 ====================

/**
 * 部门
 */
export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
}

/**
 * 角色
 */
export interface Role {
  code: RoleCode;
  name: string;
}

/**
 * 导师信息
 */
export interface Mentor {
  id: number;
  username: string;
  employee_id: string;
  avatar_key: string;
}

/**
 * 用户信息
 */
export interface UserInfo {
  id: number;
  employee_id: string;
  username: string;
  avatar_key: string;
  department: Department;
  mentor?: Mentor;
  is_active: boolean;
  is_superuser?: boolean;
}

/**
 * 用户列表项
 */
export interface UserList extends UserInfo {
  roles: Role[];
  created_at: string;
  updated_at: string;
}

// ==================== 分页相关 ====================

/**
 * 统一分页响应格式
 * 后端返回格式：{code, message, data}，其中 data 包含以下字段
 */
export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
