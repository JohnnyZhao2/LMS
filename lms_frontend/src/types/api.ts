import type { User, Role, RoleCode } from './domain';

// ============================================
// 通用 API 响应类型
// ============================================

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * API 错误响应类型
 */
export interface ApiError {
  message: string;
  code?: string;
  status: number;
  details?: Record<string, string[]>;
}

/**
 * 字段验证错误
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * 表单验证错误响应
 */
export interface ValidationError extends ApiError {
  errors: FieldError[];
}

// ============================================
// 认证相关 API 类型
// ============================================

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  available_roles: Role[];
  current_role: RoleCode;
}

/**
 * 刷新令牌请求
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * 刷新令牌响应
 */
export interface RefreshTokenResponse {
  access_token: string;
}

/**
 * 角色切换请求
 */
export interface SwitchRoleRequest {
  role_code: RoleCode;
}

/**
 * 角色切换响应
 */
export interface SwitchRoleResponse {
  access_token: string;
  refresh_token: string;
  current_role: RoleCode;
}

/**
 * 登出请求
 */
export interface LogoutRequest {
  refresh_token?: string;
}

// ============================================
// 通用请求参数类型
// ============================================

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

/**
 * 排序请求参数
 */
export interface SortParams {
  ordering?: string;
}

/**
 * 搜索请求参数
 */
export interface SearchParams {
  search?: string;
}

/**
 * 通用列表请求参数
 */
export interface ListParams extends PaginationParams, SortParams, SearchParams {}

// ============================================
// 任务相关 API 类型
// ============================================

/**
 * 任务筛选参数
 */
export interface TaskFilterParams extends ListParams {
  type?: 'LEARNING' | 'PRACTICE' | 'EXAM';
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
}

/**
 * 创建学习任务请求
 */
export interface CreateLearningTaskRequest {
  title: string;
  description?: string;
  deadline: string;
  knowledge_ids: number[];
  assignee_ids: number[];
}

/**
 * 创建练习任务请求
 */
export interface CreatePracticeTaskRequest {
  title: string;
  description?: string;
  deadline: string;
  quiz_ids: number[];
  knowledge_ids?: number[];
  assignee_ids: number[];
}

/**
 * 创建考试任务请求
 */
export interface CreateExamTaskRequest {
  title: string;
  description?: string;
  deadline: string;
  start_time: string;
  duration: number;
  pass_score: number;
  quiz_id: number;
  assignee_ids: number[];
}

// ============================================
// 知识相关 API 类型
// ============================================

/**
 * 知识筛选参数
 */
export interface KnowledgeFilterParams extends ListParams {
  primary_category?: number;
  secondary_category?: number;
  knowledge_type?: 'EMERGENCY' | 'OTHER';
}

/**
 * 完成知识学习请求
 */
export interface CompleteKnowledgeLearningRequest {
  task_id: number;
  knowledge_id: number;
}

// ============================================
// 题目相关 API 类型
// ============================================

/**
 * 题目筛选参数
 */
export interface QuestionFilterParams extends ListParams {
  type?: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  created_by_me?: boolean;
}

/**
 * 创建题目请求
 */
export interface CreateQuestionRequest {
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  content: string;
  options?: { key: string; content: string }[];
  answer: string | string[];
  explanation: string;
}

// ============================================
// 试卷相关 API 类型
// ============================================

/**
 * 试卷筛选参数
 */
export interface QuizFilterParams extends ListParams {
  created_by_me?: boolean;
}

/**
 * 创建试卷请求
 */
export interface CreateQuizRequest {
  title: string;
  description?: string;
  questions: {
    question_id: number;
    order: number;
    score: number;
  }[];
}

// ============================================
// 答题/提交相关 API 类型
// ============================================

/**
 * 提交答案请求
 */
export interface SubmitAnswersRequest {
  task_id: number;
  quiz_id: number;
  answers: {
    question_id: number;
    user_answer: string | string[];
  }[];
}

/**
 * 评分请求
 */
export interface GradeSubmissionRequest {
  submission_id: number;
  grades: {
    answer_id: number;
    score: number;
    comment?: string;
  }[];
}

// ============================================
// 抽查相关 API 类型
// ============================================

/**
 * 创建抽查记录请求
 */
export interface CreateSpotCheckRequest {
  student_id: number;
  content: string;
  score: number;
  comment?: string;
}

// ============================================
// 用户管理相关 API 类型
// ============================================

/**
 * 用户筛选参数
 */
export interface UserFilterParams extends ListParams {
  department_id?: number;
  role?: string;
  is_active?: boolean;
}

/**
 * 创建用户请求
 */
export interface CreateUserRequest {
  username: string;
  password: string;
  real_name: string;
  employee_id: string;
  department_id: number;
  role_codes: string[];
}

/**
 * 更新用户请求
 */
export interface UpdateUserRequest {
  real_name?: string;
  employee_id?: string;
  department_id?: number;
  role_codes?: string[];
  is_active?: boolean;
}

/**
 * 指定导师请求
 */
export interface AssignMentorRequest {
  student_id: number;
  mentor_id: number;
}

// ============================================
// 仪表盘相关 API 类型
// ============================================

/**
 * 学员仪表盘数据
 */
export interface StudentDashboardData {
  pending_tasks: {
    learning: number;
    practice: number;
    exam: number;
  };
  recent_tasks: Array<{
    id: number;
    title: string;
    type: 'LEARNING' | 'PRACTICE' | 'EXAM';
    deadline: string;
    progress: number;
  }>;
  latest_knowledge: Array<{
    id: number;
    title: string;
    summary: string;
    updated_at: string;
  }>;
}

/**
 * 导师/室经理仪表盘数据
 */
export interface MentorDashboardData {
  student_count: number;
  completion_rate: number;
  average_score: number;
  pending_grading_count: number;
  recent_submissions: Array<{
    id: number;
    student_name: string;
    task_title: string;
    submitted_at: string;
  }>;
}

/**
 * 团队经理仪表盘数据
 */
export interface TeamDashboardData {
  department_stats: Array<{
    department_id: number;
    department_name: string;
    completion_rate: number;
    average_score: number;
    student_count: number;
  }>;
  knowledge_heat: Array<{
    id: number;
    title: string;
    view_count: number;
  }>;
}
