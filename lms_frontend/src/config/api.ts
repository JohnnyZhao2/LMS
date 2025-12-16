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
    detail: (id: number | string) => `${BASE_URL}/users/${id}/`,
    me: `${BASE_URL}/users/me/`,
    resetPassword: (id: number | string) => `${BASE_URL}/users/${id}/reset-password/`,
    toggleActive: (id: number | string) => `${BASE_URL}/users/${id}/toggle-active/`,
  },
  
  // Department endpoints
  departments: {
    list: `${BASE_URL}/departments/`,
    detail: (id: number | string) => `${BASE_URL}/departments/${id}/`,
    members: (id: number | string) => `${BASE_URL}/departments/${id}/members/`,
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
  },
  
  // Spot check endpoints
  spotChecks: {
    list: `${BASE_URL}/spot-checks/`,
    detail: (id: number | string) => `${BASE_URL}/spot-checks/${id}/`,
  },
  
  // Dashboard endpoints
  dashboard: {
    student: `${BASE_URL}/dashboard/student/`,
    mentor: `${BASE_URL}/dashboard/mentor/`,
    team: `${BASE_URL}/dashboard/team/`,
  },
  
  // Analytics endpoints
  analytics: {
    personal: `${BASE_URL}/analytics/personal/`,
    wrongAnswers: `${BASE_URL}/analytics/wrong-answers/`,
    export: `${BASE_URL}/analytics/export/`,
  },
  
  // Notification endpoints
  notifications: {
    list: `${BASE_URL}/notifications/`,
    markRead: (id: number | string) => `${BASE_URL}/notifications/${id}/read/`,
    markAllRead: `${BASE_URL}/notifications/read-all/`,
  },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
