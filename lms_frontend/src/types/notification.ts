/**
 * 通知相关类型定义
 */

import type { NotificationType } from './common';

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
  created_at: string;
}
