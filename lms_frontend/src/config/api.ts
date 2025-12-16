/**
 * API endpoint configuration
 * Centralized API URL definitions
 */

import { config } from './index';

const BASE_URL = config.apiUrl;

export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    login: `${BASE_URL}/auth/login/`,
    logout: `${BASE_URL}/auth/logout/`,
    refresh: `${BASE_URL}/auth/refresh/`,
    switchRole: `${BASE_URL}/auth/switch-role/`,
  },
  
  // User endpoints
  users: {
    list: `${BASE_URL}/users/`,
    create: `${BASE_URL}/users/`,
    detail: (id: number | string) => `${BASE_URL}/users/${id}/`,
    update: (id: number | string) => `${BASE_URL}/users/${id}/`,
    me: `${BASE_URL}/users/me/`,
    deactivate: (id: number | string) => `${BASE_URL}/users/${id}/deactivate/`,
    activate: (id: number | string) => `${BASE_URL}/users/${id}/activate/`,
    assignRoles: (id: number | string) => `${BASE_URL}/users/${id}/assign-roles/`,
    assignMentor: (id: number | string) => `${BASE_URL}/users/${id}/assign-mentor/`,
    mentees: `${BASE_URL}/users/mentees/`,
    departmentMembers: `${BASE_URL}/users/department-members/`,
    resetPassword: `${BASE_URL}/auth/reset-password/`,
  },
  
  // Department endpoints
  departments: {
    list: `${BASE_URL}/departments/`,
    detail: (id: number | string) => `${BASE_URL}/departments/${id}/`,
    members: (id: number | string) => `${BASE_URL}/departments/${id}/members/`,
  },
  
  // Mentorship endpoints
  mentorship: {
    mentors: `${BASE_URL}/users/mentors/`,
    mentorWithMentees: (mentorId: number | string) => `${BASE_URL}/users/${mentorId}/mentees/`,
    studentsWithoutMentor: `${BASE_URL}/users/students-without-mentor/`,
    assign: (studentId: number | string) => `${BASE_URL}/users/${studentId}/assign-mentor/`,
    remove: (studentId: number | string) => `${BASE_URL}/users/${studentId}/remove-mentor/`,
  },
  
  // Knowledge endpoints
  knowledge: {
    list: `${BASE_URL}/knowledge/`,
    detail: (id: number | string) => `${BASE_URL}/knowledge/${id}/`,
    categories: `${BASE_URL}/knowledge/categories/`,
  },
  
  // Question endpoints
  questions: {
    list: `${BASE_URL}/questions/`,
    detail: (id: number | string) => `${BASE_URL}/questions/${id}/`,
    import: `${BASE_URL}/questions/import/`,
  },
  
  // Quiz endpoints
  quizzes: {
    list: `${BASE_URL}/quizzes/`,
    detail: (id: number | string) => `${BASE_URL}/quizzes/${id}/`,
  },
  
  // Task endpoints
  tasks: {
    list: `${BASE_URL}/tasks/`,
    detail: (id: number | string) => `${BASE_URL}/tasks/${id}/`,
    assignments: `${BASE_URL}/task-assignments/`,
    assignmentDetail: (id: number | string) => `${BASE_URL}/task-assignments/${id}/`,
    completeKnowledge: (assignmentId: number | string, knowledgeId: number | string) => 
      `${BASE_URL}/task-assignments/${assignmentId}/complete-knowledge/${knowledgeId}/`,
  },
  
  // Submission endpoints
  submissions: {
    list: `${BASE_URL}/submissions/`,
    detail: (id: number | string) => `${BASE_URL}/submissions/${id}/`,
    submit: `${BASE_URL}/submissions/`,
    grade: (id: number | string) => `${BASE_URL}/submissions/${id}/grade/`,
    // Practice endpoints
    practiceStart: `${BASE_URL}/submissions/practice/start/`,
    practiceHistory: (taskId: number | string) => `${BASE_URL}/submissions/practice/history/${taskId}/`,
    practiceSubmit: (id: number | string) => `${BASE_URL}/submissions/${id}/submit-practice/`,
    practiceResult: (id: number | string) => `${BASE_URL}/submissions/${id}/result/`,
    // Exam endpoints
    examStart: `${BASE_URL}/submissions/exam/start/`,
    examSubmit: (id: number | string) => `${BASE_URL}/submissions/${id}/submit-exam/`,
    examResult: (id: number | string) => `${BASE_URL}/submissions/exam/${id}/result/`,
    // Save answer
    saveAnswer: (id: number | string) => `${BASE_URL}/submissions/${id}/save-answer/`,
  },
  
  // Spot check endpoints
  spotChecks: {
    list: `${BASE_URL}/spot-checks/`,
    detail: (id: number | string) => `${BASE_URL}/spot-checks/${id}/`,
  },
  
  // Grading endpoints (评分中心)
  grading: {
    pendingList: `${BASE_URL}/submissions/pending-grading/`,
    detail: (id: number | string) => `${BASE_URL}/submissions/${id}/grading-detail/`,
    submit: (id: number | string) => `${BASE_URL}/submissions/${id}/grade/`,
  },
  
  // Dashboard endpoints (学员/导师仪表盘)
  dashboard: {
    student: `${BASE_URL}/analytics/dashboard/student/`,
    mentor: `${BASE_URL}/analytics/dashboard/mentor/`,
    team: `${BASE_URL}/analytics/team-overview/`,
  },
  
  // Student Knowledge Center (学员知识中心)
  studentKnowledge: {
    list: `${BASE_URL}/analytics/knowledge-center/`,
    detail: (id: number | string) => `${BASE_URL}/analytics/knowledge-center/${id}/`,
    categories: `${BASE_URL}/analytics/knowledge-center/categories/`,
    categoryChildren: (primaryId: number | string) => 
      `${BASE_URL}/analytics/knowledge-center/categories/${primaryId}/children/`,
  },
  
  // Student Task Center (学员任务中心)
  studentTasks: {
    list: `${BASE_URL}/analytics/task-center/`,
    detail: (assignmentId: number | string) => `${BASE_URL}/analytics/task-center/${assignmentId}/`,
  },
  
  // Student Personal Center (学员个人中心)
  personalCenter: {
    profile: `${BASE_URL}/analytics/personal-center/profile/`,
    scores: `${BASE_URL}/analytics/personal-center/scores/`,
    scoresExport: `${BASE_URL}/analytics/personal-center/scores/export/`,
    wrongAnswers: `${BASE_URL}/analytics/personal-center/wrong-answers/`,
  },
  
  // Analytics endpoints (团队经理)
  analytics: {
    teamOverview: `${BASE_URL}/analytics/team-overview/`,
    knowledgeHeat: `${BASE_URL}/analytics/knowledge-heat/`,
  },
  
  // Notification endpoints
  notifications: {
    list: `${BASE_URL}/notifications/`,
    markRead: (id: number | string) => `${BASE_URL}/notifications/${id}/read/`,
    markAllRead: `${BASE_URL}/notifications/read-all/`,
  },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
