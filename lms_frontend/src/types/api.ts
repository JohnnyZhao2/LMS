/**
 * API 类型定义
 * 统一导出所有类型模块，保持向后兼容
 * 
 * 注意：此文件已拆分为多个模块文件，建议直接导入具体模块：
 * - @/types/common - 枚举类型、基础类型、标签、分页
 * - @/types/auth - 认证相关
 * - @/types/knowledge - 知识相关
 * - @/types/task - 任务相关
 * - @/types/dashboard - 仪表盘相关
 * - @/types/question - 题目相关
 * - @/types/quiz - 试卷相关
 * - @/types/submission - 答题相关
 * - @/types/spot-check - 抽查相关
 * - @/types/notification - 通知相关
 */

// 导出通用类型
export * from './common';

// 导出认证相关类型
export * from './auth';

// 导出知识相关类型
export * from './knowledge';

// 导出任务相关类型
export * from './task';

// 导出仪表盘相关类型
export * from './dashboard';

// 导出题目相关类型
export * from './question';

// 导出试卷相关类型
export * from './quiz';

// 导出答题相关类型
export * from './submission';

// 导出抽查相关类型
export * from './spot-check';

// 导出通知相关类型
export * from './notification';
