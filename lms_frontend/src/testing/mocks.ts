/**
 * Mock Data for Testing
 * Aligned with domain types from @/types/domain
 */

import type { 
  Task, 
  Knowledge, 
  Quiz, 
  Question, 
  QuestionOption,
  UserBasic,
  TaskAssignment,
  QuizQuestion
} from "@/types/domain";

// ============================================
// Mock Users
// ============================================

export const MOCK_USER: UserBasic = {
  id: 1,
  username: 'mentor_zhang',
  real_name: '张导师',
  employee_id: 'EMP001',
};

export const MOCK_STUDENT: UserBasic = {
  id: 2,
  username: 'student_li',
  real_name: '李学员',
  employee_id: 'STU001',
};

// ============================================
// Mock Knowledge
// ============================================

export const MOCK_KNOWLEDGE: Knowledge[] = [
  {
    id: 101,
    title: 'Kubernetes Pod CrashLoopBackOff 诊断',
    summary: '容器故障诊断标准操作流程',
    knowledge_type: 'EMERGENCY',
    primary_category: { id: 1, name: '云计算', level: 1 },
    operation_tags: ['调试', '日志分析'],
    created_by: MOCK_USER,
    updated_at: '2025-12-15T10:00:00Z',
    view_count: 156,
    emergency_content: {
      fault_scenario: 'Pod 持续重启，状态显示 CrashLoopBackOff',
      trigger_process: '1. 检查 Pod 日志\n2. 检查资源限制\n3. 检查探针配置',
      solution: '根据日志分析结果修复应用配置或资源限制',
      verification: '确认 Pod 状态变为 Running',
      recovery: '监控 Pod 运行状态 30 分钟',
    },
  },
  {
    id: 102,
    title: 'Redis 缓存淘汰策略',
    summary: '理解缓存层中的 LRU 与 LFU',
    knowledge_type: 'OTHER',
    primary_category: { id: 2, name: '数据库', level: 1 },
    operation_tags: ['性能优化'],
    created_by: MOCK_USER,
    updated_at: '2025-12-14T10:00:00Z',
    view_count: 89,
    content: '# Redis 缓存淘汰策略\n\n## LRU (Least Recently Used)\n\n最近最少使用策略...',
  },
  {
    id: 103,
    title: '核心交换机冗余检查',
    summary: '如何验证 Core-A/B 交换机的主备状态',
    knowledge_type: 'EMERGENCY',
    primary_category: { id: 3, name: '网络', level: 1 },
    operation_tags: ['检查', '维护'],
    created_by: MOCK_USER,
    updated_at: '2025-12-10T10:00:00Z',
    view_count: 234,
  },
];

// ============================================
// Mock Questions
// ============================================

const MOCK_QUESTION_OPTIONS_1: QuestionOption[] = [
  { key: 'A', content: '立即重启交换机' },
  { key: 'B', content: '通过备用交换机验证对等链路状态' },
  { key: 'C', content: '断开所有光纤电缆' },
  { key: 'D', content: '清除 ARP 表' },
];

const MOCK_QUESTION_OPTIONS_2: QuestionOption[] = [
  { key: 'A', content: 'show ip ospf neighbor' },
  { key: 'B', content: 'show ip route ospf' },
  { key: 'C', content: 'display ospf peer' },
  { key: 'D', content: 'ping 127.0.0.1' },
];

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'SINGLE_CHOICE',
    content: '检测到核心交换机心跳故障时，首要操作是什么？',
    options: MOCK_QUESTION_OPTIONS_1,
    answer: 'B',
    explanation: '在采取破坏性操作之前，始终先验证状态。重启会删除日志，如果未先隔离可能导致脑裂。',
    created_by: MOCK_USER,
  },
  {
    id: 2,
    type: 'MULTIPLE_CHOICE',
    content: '哪些命令可以验证 OSPF 邻居邻接关系？',
    options: MOCK_QUESTION_OPTIONS_2,
    answer: ['A', 'C'],
    explanation: '在我们的混合环境中，Cisco (show) 和华为 (display) 命令都有效。',
    created_by: MOCK_USER,
  },
  {
    id: 3,
    type: 'TRUE_FALSE',
    content: 'Redis 的 LRU 策略会精确淘汰最近最少使用的键。',
    options: [
      { key: 'A', content: '正确' },
      { key: 'B', content: '错误' },
    ],
    answer: 'B',
    explanation: 'Redis 使用近似 LRU 算法，通过采样来决定淘汰哪些键，而非精确的 LRU。',
    created_by: MOCK_USER,
  },
  {
    id: 4,
    type: 'SHORT_ANSWER',
    content: '简述 Kubernetes 中 Pod 的生命周期阶段。',
    answer: 'Pending, Running, Succeeded, Failed, Unknown',
    explanation: 'Pod 生命周期包括：Pending（等待调度）、Running（运行中）、Succeeded（成功完成）、Failed（失败）、Unknown（未知状态）。',
    created_by: MOCK_USER,
  },
];

// ============================================
// Mock Quiz Questions (with order and score)
// ============================================

export const MOCK_QUIZ_QUESTIONS: QuizQuestion[] = MOCK_QUESTIONS.slice(0, 2).map((q, index) => ({
  question: q,
  order: index + 1,
  score: index === 0 ? 5 : 10,
}));

// ============================================
// Mock Quiz / Paper
// ============================================

export const MOCK_QUIZ: Quiz = {
  id: 1,
  title: '网络隔离标准流程测试',
  description: '交换机故障隔离协议演练',
  questions: MOCK_QUIZ_QUESTIONS,
  total_score: 15,
  created_by: MOCK_USER,
};

export const MOCK_PAPER = MOCK_QUIZ; // Alias for backward compatibility

export const MOCK_EXAM: Quiz = {
  id: 2,
  title: '年终能力评估',
  description: '涵盖云计算、网络和数据库模块的综合评估',
  questions: MOCK_QUESTIONS.map((q, index) => ({
    question: q,
    order: index + 1,
    score: 25,
  })),
  total_score: 100,
  created_by: MOCK_USER,
};

// ============================================
// Mock Tasks
// ============================================

export const MOCK_TASKS: Task[] = [
  {
    id: 1,
    title: '数据库故障应急协议学习',
    description: '学习 Oracle 数据库节点的核心恢复步骤，理解主备切换流程。',
    type: 'LEARNING',
    status: 'ACTIVE',
    deadline: '2025-12-20T23:59:59Z',
    created_by: MOCK_USER,
    knowledge_items: MOCK_KNOWLEDGE.slice(0, 2),
  },
  {
    id: 2,
    title: '网络隔离演练 - Q4',
    description: '在模拟环境中练习隔离程序，确保无用户流量泄漏。',
    type: 'PRACTICE',
    status: 'ACTIVE',
    deadline: '2025-12-18T23:59:59Z',
    created_by: MOCK_USER,
    quizzes: [MOCK_QUIZ],
    knowledge_items: [MOCK_KNOWLEDGE[0]],
  },
  {
    id: 3,
    title: '年终能力评估',
    description: '涵盖云计算、网络和数据库模块的期末考试，时长 60 分钟。',
    type: 'EXAM',
    status: 'ACTIVE',
    deadline: '2025-12-30T18:00:00Z',
    start_time: '2025-12-30T09:00:00Z',
    duration: 60,
    pass_score: 60,
    created_by: MOCK_USER,
    quizzes: [MOCK_EXAM],
  },
  {
    id: 4,
    title: 'DevOps CI/CD 流水线基础',
    description: '复习更新后的 Jenkins 流水线配置标准。',
    type: 'LEARNING',
    status: 'CLOSED',
    deadline: '2025-12-10T23:59:59Z',
    created_by: MOCK_USER,
    knowledge_items: [MOCK_KNOWLEDGE[1]],
  },
];

// ============================================
// Mock Task Assignments
// ============================================

export const MOCK_ASSIGNMENTS: TaskAssignment[] = MOCK_TASKS.map((task, index) => ({
  id: index + 1,
  task,
  user: MOCK_STUDENT,
  status: index === 3 ? 'COMPLETED' : index === 2 ? 'PENDING_EXAM' : 'IN_PROGRESS',
  progress: index === 3 ? 100 : index === 0 ? 33 : index === 1 ? 45 : 0,
  completed_at: index === 3 ? '2025-12-09T15:30:00Z' : undefined,
}));