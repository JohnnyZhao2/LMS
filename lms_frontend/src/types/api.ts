/**
 * API 类型定义
 * 从 OpenAPI Schema 提取
 */

// ==================== 枚举类型 ====================

/**
 * 角色代码
 */
export type RoleCode = 'STUDENT' | 'MENTOR' | 'DEPT_MANAGER' | 'ADMIN' | 'TEAM_MANAGER';

/**
 * 任务类型
 */
export type TaskType = 'LEARNING' | 'PRACTICE' | 'EXAM';

/**
 * 任务状态
 */
export type TaskStatus = 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'PENDING_EXAM';

/**
 * 提交状态
 */
export type SubmissionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADING' | 'GRADED';

/**
 * 题目类型
 */
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

/**
 * 知识类型
 */
export type KnowledgeType = 'EMERGENCY' | 'OTHER';

/**
 * 知识发布状态
 */
export type KnowledgeStatus = 'DRAFT' | 'PUBLISHED';

/**
 * 通知类型
 */
export type NotificationType = 'TASK_ASSIGNED' | 'DEADLINE_REMINDER' | 'GRADING_COMPLETED' | 'SPOT_CHECK';

/**
 * 难度等级
 */
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

/**
 * 标签类型
 */
export type TagType = 'LINE' | 'SYSTEM' | 'OPERATION';

/**
 * 统一标签
 */
export interface Tag {
  id: number;
  name: string;
  tag_type: TagType;
  tag_type_display: string;
  parent?: number | null;
  parent_name?: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * 简单标签（用于列表显示）
 */
export interface SimpleTag {
  id: number;
  name: string;
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
}

/**
 * 用户信息
 */
export interface UserInfo {
  id: number;
  employee_id: string;
  username: string;
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

// ==================== 认证相关 ====================

/**
 * 登录请求
 */
export interface LoginRequest {
  employee_id: string;
  password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
  available_roles: Role[];
  current_role: RoleCode;
}

/**
 * 刷新令牌请求
 */
export interface RefreshTokenRequest {
  refresh: string;
}

/**
 * 刷新令牌响应
 */
export interface RefreshTokenResponse {
  access: string;
  refresh: string;
}

/**
 * 切换角色请求
 */
export interface SwitchRoleRequest {
  role_code: RoleCode;
}

/**
 * 切换角色响应
 */
export interface SwitchRoleResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
  available_roles: Role[];
  current_role: RoleCode;
}

/**
 * 登出请求
 */
export interface LogoutRequest {
  refresh_token?: string;
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

// ==================== 知识相关 ====================

/**
 * 知识分类
 */
export interface KnowledgeCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  level: 'PRIMARY' | 'SECONDARY';
  knowledge_count: string;
}

/**
 * 学员知识列表项
 */
export interface StudentKnowledgeList {
  id: number;
  title: string;
  summary?: string;
  knowledge_type: KnowledgeType;
  knowledge_type_display: string;
  operation_tags?: Record<string, unknown>;
  primary_category_name?: string;
  secondary_category_name?: string;
  updated_by_name?: string;
  created_by_name?: string;
  updated_at: string;
  view_count: number;
}

/**
 * 学员知识详情
 */
export interface StudentKnowledgeDetail {
  id: number;
  title: string;
  knowledge_type: KnowledgeType;
  knowledge_type_display: string;
  summary?: string;
  content?: string;
  operation_tags?: Record<string, unknown>;
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification_plan?: string;
  recovery_plan?: string;
  structured_content?: string;
  table_of_contents?: string;
  primary_category_name?: string;
  secondary_category_name?: string;
  created_by_name?: string;
  updated_by_name?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 最新知识
 */
export interface LatestKnowledge {
  id: number;
  title: string;
  summary?: string;
  updated_at: string;
}

/**
 * 知识文档列表项（管理员视图）
 */
export interface KnowledgeListItem {
  id: number;
  resource_uuid: string;
  version_number: number;
  title: string;
  knowledge_type: KnowledgeType;
  knowledge_type_display: string;
  status: KnowledgeStatus;
  status_display: string;
  is_current: boolean;
  published_at?: string;
  line_type?: SimpleTag | null;
  content_preview?: string;
  system_tags: SimpleTag[];
  operation_tags: SimpleTag[];
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 知识文档详情（管理员视图）
 */
export interface KnowledgeDetail {
  id: number;
  resource_uuid: string;
  version_number: number;
  title: string;
  knowledge_type: KnowledgeType;
  knowledge_type_display: string;
  status: KnowledgeStatus;
  status_display: string;
  is_current: boolean;
  published_at?: string;
  line_type?: SimpleTag | null;
  // 应急类知识结构化字段
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification_plan?: string;
  recovery_plan?: string;
  // 其他类型知识正文
  content?: string;
  // 标签
  system_tags: SimpleTag[];
  operation_tags: SimpleTag[];
  // 元数据
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSnapshot {
  id: number;
  resource_uuid: string;
  version_number: number;
  title: string;
  knowledge_type: KnowledgeType;
  knowledge_type_display?: string;
  summary?: string;
  content?: string;
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification_plan?: string;
  recovery_plan?: string;
  line_type?: SimpleTag | null;
  system_tags?: SimpleTag[];
  operation_tags?: SimpleTag[];
}

export interface QuizQuestionSnapshot {
  id: number;
  resource_uuid: string;
  version_number: number;
  order: number;
  question_type: string;
  score: number;
  content: string;
  options?: Array<{ key: string; value: string }>;
  answer?: unknown;
  explanation?: string;
}

export interface QuizSnapshot {
  id: number;
  resource_uuid: string;
  version_number: number;
  title: string;
  description?: string;
  question_count: number;
  total_score: number;
  has_subjective_questions: boolean;
  objective_question_count: number;
  subjective_question_count: number;
  questions: QuizQuestionSnapshot[];
}

/**
 * 创建知识文档请求
 */
export interface KnowledgeCreateRequest {
  title: string;
  knowledge_type: KnowledgeType;
  // 条线类型（使用 ID 或名称）
  line_type_id?: number;
  line_type_name?: string;
  // 应急类知识结构化字段
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification_plan?: string;
  recovery_plan?: string;
  // 其他类型知识正文
  content?: string;
  // 标签（使用名称，支持自定义输入）
  system_tag_names?: string[];
  operation_tag_names?: string[];
}

/**
 * 更新知识文档请求
 */
export interface KnowledgeUpdateRequest {
  title?: string;
  knowledge_type?: KnowledgeType;
  line_type_id?: number;
  line_type_name?: string;
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification_plan?: string;
  recovery_plan?: string;
  content?: string;
  system_tag_names?: string[];
  operation_tag_names?: string[];
}


// ==================== 任务相关 ====================

/**
 * 任务分配
 */
export interface TaskAssignment {
  id: number;
  assignee: number;
  assignee_name: string;
  assignee_employee_id: string;
  status: TaskStatus;
  completed_at?: string;
  score?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 任务知识项
 */
export interface TaskKnowledge {
  id: number;
  knowledge: number;
  knowledge_title: string;
  knowledge_type: string;
  order: number;
  resource_uuid: string;
  version_number: number;
  snapshot: KnowledgeSnapshot;
}

/**
 * 任务试卷项
 */
export interface TaskQuiz {
  id: number;
  quiz: number;
  quiz_title: string;
  order: number;
  resource_uuid: string;
  version_number: number;
  snapshot: QuizSnapshot;
}

/**
 * 任务详情
 */
export interface TaskDetail {
  id: number;
  title: string;
  description?: string;
  task_type: TaskType;
  task_type_display: string;
  deadline: string;
  start_time?: string;
  duration?: number;
  pass_score?: string;
  is_closed: boolean;
  closed_at?: string;
  knowledge_items: TaskKnowledge[];
  quizzes: TaskQuiz[];
  assignments: TaskAssignment[];
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * 学员学习任务进度
 */
export interface LearningTaskProgress {
  completed: number;
  total: number;
  percentage: number;
}

/**
 * 学员学习任务知识项
 */
export interface LearningTaskKnowledgeItem {
  id: number;
  knowledge_id: number;
  title?: string;
  knowledge_type: string;
  knowledge_type_display?: string;
  summary?: string;
  order: number;
  is_completed: boolean;
  completed_at?: string | null;
}

/**
 * 学员学习任务详情
 */
export interface StudentLearningTaskDetail {
  id: number;
  task_id: number;
  task_title: string;
  task_description?: string;
  task_type: TaskType;
  task_type_display: string;
  deadline: string;
  created_by_name: string;
  status: TaskStatus;
  status_display: string;
  progress: LearningTaskProgress;
  completed_at?: string;
  knowledge_items: LearningTaskKnowledgeItem[];
  created_at: string;
  updated_at: string;
}

/**
 * 创建学习任务请求
 */
export interface LearningTaskCreateRequest {
  title: string;
  description?: string;
  deadline: string;
  knowledge_ids: number[];
  assignee_ids: number[];
}

/**
 * 创建练习任务请求
 */
export interface PracticeTaskCreateRequest {
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
export interface ExamTaskCreateRequest {
  title: string;
  description?: string;
  deadline: string;
  start_time: string;
  duration: number;
  pass_score: number | string;
  quiz_id: number;
  assignee_ids: number[];
}

/**
 * 学员待办任务
 */
export interface StudentPendingTask {
  id: number;
  title: string;
  task_type: TaskType;
  task_type_display: string;
  deadline: string;
  assignment_id: number;
}

/**
 * 学员任务中心列表项
 */
export interface TaskProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface StudentTaskCenterItem {
  id: number;
  task_id: number;
  task_title: string;
  task_description?: string;
  task_type: TaskType;
  task_type_display: string;
  deadline: string;
  status: TaskStatus;
  status_display: string;
  progress: TaskProgress;
  created_by_name: string;
  start_time?: string;
  duration?: number;
  pass_score?: string;
  score?: string;
  completed_at?: string;
  created_at: string;
}

export interface StudentTaskCenterResponse {
  results: StudentTaskCenterItem[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TaskListItem {
  id: number;
  title: string;
  description?: string;
  task_type: TaskType;
  task_type_display: string;
  deadline: string;
  start_time?: string;
  duration?: number;
  pass_score?: string;
  is_closed: boolean;
  closed_at?: string;
  knowledge_count: number;
  quiz_count: number;
  assignee_count: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// ==================== 仪表盘相关 ====================

/**
 * 学员仪表盘
 */
export interface StudentDashboard {
  pending_tasks: StudentPendingTask[];
  latest_knowledge: LatestKnowledge[];
  task_summary: Record<string, unknown>;
}

/**
 * 导师仪表盘
 */
export interface MentorDashboard {
  mentees_count: number;
  completion_rate: string;
  average_score?: string;
  pending_grading_count: number;
}

// ==================== 题目相关 ====================

/**
 * 题目
 */
export interface Question {
  id: number;
  content: string;
  question_type: QuestionType;
  question_type_display: string;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  score: string;
  difficulty?: Difficulty;
  difficulty_display?: string;
  line_type?: SimpleTag;
  is_objective?: boolean;
  is_subjective?: boolean;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建题目请求
 */
export interface QuestionCreateRequest {
  content: string;
  question_type: QuestionType;
  options?: Array<{ key: string; value: string }>;
  answer?: string | string[];
  explanation?: string;
  score?: string | number;
  difficulty?: Difficulty;
  line_type_id?: number;
}

// ==================== 试卷相关 ====================

/**
 * 试卷题目关联
 */
export interface QuizQuestion {
  id: number;
  question: number;
  question_content: string;
  question_type: QuestionType;
  question_type_display: string;
  order: number;
  score: string;
}

/**
 * 试卷列表项
 */
export interface QuizListItem {
  id: number;
  title: string;
  description?: string;
  question_count: number;
  total_score: string;
  has_subjective_questions: boolean;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 试卷详情
 */
export interface QuizDetail {
  id: number;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  question_count?: number;
  total_score: string;
  has_subjective_questions?: boolean;
  objective_question_count?: number;
  subjective_question_count?: number;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建试卷请求
 */
export interface QuizCreateRequest {
  title: string;
  description?: string;
  existing_question_ids?: number[];
  new_questions?: QuestionCreateRequest[];
}

/**
 * 添加题目到试卷请求
 */
export interface AddQuestionsToQuizRequest {
  question_ids: number[];
}

// ==================== 答题相关 ====================

/**
 * 答案
 */
export interface Answer {
  id: number;
  question: number;
  question_content: string;
  question_type: QuestionType;
  question_type_display?: string;
  question_options?: Record<string, string> | Array<{ key?: string; value?: string }>;
  question_score?: string;
  score?: string;
  user_answer?: Record<string, unknown>;
  correct_answer?: Record<string, unknown>;
  is_correct?: boolean;
  obtained_score?: string;
  explanation?: string;
  graded_by?: number;
  graded_by_name?: string;
  graded_at?: string;
  comment?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 保存答案请求
 */
export interface SaveAnswerRequest {
  question_id: number;
  user_answer?: unknown;
}

/**
 * 提交详情
 */
export interface SubmissionDetail {
  id: number;
  quiz: number;
  quiz_title: string;
  user: number;
  user_name: string;
  task_title: string;
  task_type: TaskType;
  attempt_number: number;
  status: SubmissionStatus;
  status_display: string;
  total_score: string;
  obtained_score?: string;
  pass_score: string;
  is_passed: boolean;
  started_at: string;
  submitted_at?: string;
  remaining_seconds?: number;
  answers: Answer[];
  created_at: string;
  updated_at: string;
}

/**
 * 练习结果
 */
export interface PracticeResult {
  id: number;
  quiz: number;
  quiz_title: string;
  attempt_number: number;
  status: SubmissionStatus;
  status_display: string;
  total_score: string;
  obtained_score?: string;
  started_at: string;
  submitted_at?: string;
  answers: Answer[];
  created_at: string;
}

// ==================== 评分相关 ====================

/**
 * 评分详情
 */
export interface GradingDetail {
  id: number;
  submission: number;
  quiz_title: string;
  user_name: string;
  task_title: string;
  total_score: string;
  obtained_score?: string;
  answers: Answer[];
  created_at: string;
  updated_at: string;
}

/**
 * 评分列表项
 */
export interface GradingList {
  id: number;
  submission: number;
  quiz_title: string;
  user_name: string;
  task_title: string;
  submitted_at?: string;
}

/**
 * 提交评分请求
 */
export interface GradeAnswerRequest {
  answer_id: number;
  obtained_score: string;
  comment?: string;
}

// ==================== 抽查相关 ====================

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

// ==================== 通知相关 ====================

/**
 * 通知
 */
export interface Notification {
  id: number;
  notification_type: NotificationType;
  notification_type_display: string;
  title: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  task_id?: number;
  task_title?: string;
  task_type?: string;
  created_at: string;
}

// ==================== 分页相关 ====================

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  count: number;
  total_pages?: number;
  current_page?: number;
  page_size?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

