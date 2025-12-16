// ============================================
// 用户相关类型
// ============================================

/**
 * 角色代码 (新版 - 与后端对齐)
 */
export type RoleCode = 'STUDENT' | 'MENTOR' | 'DEPT_MANAGER' | 'ADMIN' | 'TEAM_MANAGER';

/**
 * 用户角色 (旧版 - 用于当前 mock 系统)
 * Maps to RoleCode for compatibility
 */
export type UserRole = 'STUDENT' | 'MENTOR' | 'MANAGER' | 'ADMIN' | 'TEAM_LEADER';

/**
 * 角色
 */
export interface Role {
  code: RoleCode;
  name: string;
}

/**
 * 部门/室
 */
export interface Department {
  id: number;
  name: string;
  manager?: UserBasic;
}

/**
 * 用户基础信息（用于嵌套引用，避免循环）
 */
export interface UserBasic {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
}

/**
 * 用户完整信息 (API 版本)
 */
export interface UserFull extends UserBasic {
  department: Department;
  mentor?: UserBasic;
  is_active: boolean;
  roles: Role[];
}

/**
 * 简化用户类型 (用于当前 mock 系统)
 */
export interface User {
  id: string;
  name: string;
  role: UserRole;
  team: string;
  level: number;
  avatarUrl: string;
}

// ============================================
// 知识相关类型
// ============================================

/**
 * 知识类型
 */
export type KnowledgeType = 'EMERGENCY' | 'OTHER';

/**
 * 知识分类
 */
export interface KnowledgeCategory {
  id: number;
  name: string;
  level: 1 | 2;
  parent_id?: number;
  children?: KnowledgeCategory[];
}

/**
 * 应急类知识内容结构
 */
export interface EmergencyContent {
  fault_scenario?: string;
  trigger_process?: string;
  solution?: string;
  verification?: string;
  recovery?: string;
}

/**
 * 知识文档
 */
export interface Knowledge {
  id: number;
  title: string;
  summary: string;
  knowledge_type: KnowledgeType;
  primary_category: KnowledgeCategory;
  secondary_category?: KnowledgeCategory;
  operation_tags: string[];
  content?: string;                     // OTHER 类型使用
  emergency_content?: EmergencyContent; // EMERGENCY 类型使用
  created_by: UserBasic;
  updated_at: string;
  view_count: number;
}

// ============================================
// 题目相关类型
// ============================================

/**
 * 题目类型
 */
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

/**
 * 题目选项
 */
export interface QuestionOption {
  key: string;
  content: string;
}

/**
 * 题目
 */
export interface Question {
  id: number;
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  answer: string | string[];
  explanation: string;
  created_by: UserBasic;
}

// ============================================
// 试卷相关类型
// ============================================

/**
 * 试卷中的题目（包含顺序和分值）
 */
export interface QuizQuestion {
  question: Question;
  order: number;
  score: number;
}

/**
 * 试卷
 */
export interface Quiz {
  id: number;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  total_score: number;
  created_by: UserBasic;
}

// ============================================
// 任务相关类型
// ============================================

/**
 * 任务类型
 */
export type TaskType = 'LEARNING' | 'PRACTICE' | 'EXAM';

/**
 * 任务状态
 */
export type TaskStatus = 'ACTIVE' | 'CLOSED';

/**
 * 任务
 */
export interface Task {
  id: number;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  deadline: string;
  start_time?: string;        // 考试任务专用
  duration?: number;          // 考试时长（分钟）
  pass_score?: number;        // 及格分数
  created_by: UserBasic;
  knowledge_items?: Knowledge[];
  quizzes?: Quiz[];
}

/**
 * 任务分配状态
 */
export type TaskAssignmentStatus = 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'PENDING_EXAM';

/**
 * 任务分配
 */
export interface TaskAssignment {
  id: number;
  task: Task;
  user: UserBasic;
  status: TaskAssignmentStatus;
  progress: number;           // 0-100
  completed_at?: string;
}

// ============================================
// 答题/提交相关类型
// ============================================

/**
 * 提交状态
 */
export type SubmissionStatus = 'SUBMITTED' | 'GRADING' | 'GRADED';

/**
 * 答案
 */
export interface Answer {
  id: number;
  question: Question;
  user_answer: string | string[];
  is_correct?: boolean;
  score?: number;
  graded_by?: UserBasic;
  comment?: string;
}

/**
 * 提交记录
 */
export interface Submission {
  id: number;
  task: Task;
  quiz: Quiz;
  user: UserBasic;
  attempt_number: number;
  status: SubmissionStatus;
  total_score: number;
  obtained_score?: number;
  answers: Answer[];
  submitted_at: string;
}

// ============================================
// 抽查相关类型
// ============================================

/**
 * 抽查记录
 */
export interface SpotCheck {
  id: number;
  student: UserBasic;
  content: string;
  score: number;
  comment?: string;
  checked_by: UserBasic;
  checked_at: string;
}

// ============================================
// 知识学习进度类型
// ============================================

/**
 * 知识学习进度
 */
export interface KnowledgeLearningProgress {
  id: number;
  knowledge: Knowledge;
  is_completed: boolean;
  completed_at?: string;
}

// ============================================
// 试卷完成进度类型
// ============================================

/**
 * 试卷完成进度
 */
export interface QuizProgress {
  quiz: Quiz;
  attempt_count: number;
  latest_score?: number;
  best_score?: number;
  last_attempt_at?: string;
}

// ============================================
// 通知相关类型
// ============================================

/**
 * 通知类型
 */
export type NotificationType = 'TASK_ASSIGNED' | 'TASK_DEADLINE' | 'GRADE_RELEASED' | 'SYSTEM';

/**
 * 通知
 */
export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
}
