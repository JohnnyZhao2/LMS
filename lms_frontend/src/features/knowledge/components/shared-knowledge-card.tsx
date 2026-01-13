"use client"

import * as React from 'react';
import {
  Pencil,
  Eye,
  List,
  ArrowUpRight,
} from 'lucide-react';
import type { KnowledgeListItem } from '@/types/api';
import dayjs from '@/lib/dayjs';
import { cn, stripHtml } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface SharedKnowledgeCardProps {
  item: KnowledgeListItem;
  onView: (id: number) => void;
  showActions?: boolean;
  showStatus?: boolean;
  onEdit?: (id: number) => void;
  variant?: 'admin' | 'student';
}

/**
 * 知识卡片组件 - 极致美学版
 */
export const SharedKnowledgeCard: React.FC<SharedKnowledgeCardProps> = ({
  item,
  onView,
  showActions,
  showStatus,
  onEdit,
  variant = 'admin',
}) => {
  const shouldShowActions = showActions ?? (variant === 'admin');
  const shouldShowStatus = showStatus ?? (variant === 'admin');

  const isEmergency = item.knowledge_type === 'EMERGENCY';

  // 根据新的版本管理系统，管理端只显示当前版本
  // 不再需要 edit_status 判断
  const getStatusBadge = () => {
    // 学生视图不显示状态
    if (variant === 'student') return null;

    // 管理员视图：所有显示的都是当前版本，显示绿色徽章
    return <Badge className="bg-[#10B981] text-white border-0 px-2 py-0.5 text-[10px] font-bold rounded-md shadow-none">当前版本</Badge>;
  };

  // 清洗摘要和预览内容
  const cleanSummary = stripHtml(item.summary || '');
  const cleanPreview = stripHtml(item.content_preview || item.summary || '') || '暂无详细内容...';

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full bg-white rounded-lg p-6 transition-all duration-200 cursor-pointer hover:scale-[1.02] border-0 shadow-none"
      )}
      style={{ fontFamily: "'Outfit', sans-serif" }}
      onClick={() => onView(item.id)}
    >
      {/* 状态排布 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            isEmergency ? "bg-[#DC2626]" : "bg-[#10B981]"
          )} />
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isEmergency ? "text-[#DC2626]" : "text-[#10B981]"
          )}>
            {isEmergency ? '应急类' : '标准类'}
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {shouldShowStatus && getStatusBadge()}
          {shouldShowActions && (
            <button
              className="h-8 w-8 rounded-md bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:bg-[#111827] hover:text-white transition-all duration-200 shadow-none"
              onClick={() => onEdit?.(item.id)}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 标题 & 摘要 */}
      <div className="relative mb-4">
        <h3 className="text-lg font-bold text-[#111827] leading-tight mb-2 line-clamp-2 group-hover:text-[#3B82F6] transition-colors duration-200">
          {item.title}
        </h3>
        {cleanSummary && (
          <p className="text-sm font-normal text-[#6B7280] line-clamp-1 leading-relaxed">
            {cleanSummary}
          </p>
        )}
      </div>

      {/* 内容预览区域 (替代原有的目录结构) */}
      <div className="flex-1 bg-[#F3F4F6] rounded-lg p-4 mb-6 group-hover:bg-[#DBEAFE] transition-colors duration-200 overflow-hidden min-h-[160px] max-h-[160px]">
        <div className="flex items-center gap-2 mb-3">
          <List className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">内容预览</span>
        </div>
        <div className="text-xs font-medium text-[#4B5563] leading-relaxed line-clamp-6">
          {cleanPreview}
        </div>
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {item.system_tags?.slice(0, 2).map((tag) => (
          <Badge key={tag.id} variant="secondary" className="bg-[#F3F4F6] text-[#111827] border-0 rounded-md font-semibold text-[10px] shadow-none">
            {tag.name}
          </Badge>
        ))}
      </div>

      {/* 底部信息 */}
      <div className="mt-auto pt-6 border-t border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-[#111827] rounded-md flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform duration-200">
            {(item.updated_by_name || 'U').charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#111827] leading-none mb-1">{item.updated_by_name || '系统'}</span>
            <span className="text-[10px] font-medium text-[#6B7280]">{dayjs(item.updated_at).format('YYYY.MM.DD')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[#6B7280]">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">{item.view_count || 0}</span>
          </div>
          <div className="h-8 w-8 rounded-md bg-[#3B82F6] text-white flex items-center justify-center group-hover:bg-[#2563EB] transition-all duration-200 group-hover:scale-110">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
