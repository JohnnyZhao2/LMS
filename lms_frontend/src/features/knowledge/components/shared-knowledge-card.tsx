"use client"

import * as React from 'react';
import {
  MoreHorizontal,
  Pencil,
  CheckCircle,
  XCircle,
  Eye,
  List,
  User,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { KnowledgeListItem, SimpleTag, TableOfContentsItem } from '@/types/api';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/** 目录显示的最大条目数 */
const MAX_TOC_ITEMS = 4;

export interface SharedKnowledgeCardProps {
  item: KnowledgeListItem;
  onView: (id: number) => void;
  showActions?: boolean;
  showStatus?: boolean;
  onEdit?: (id: number) => void;
  onPublish?: (id: number) => Promise<void>;
  onUnpublish?: (id: number) => Promise<void>;
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
  onPublish,
  onUnpublish,
  variant = 'admin',
}) => {
  const shouldShowActions = showActions ?? (variant === 'admin');
  const shouldShowStatus = showStatus ?? (variant === 'admin');

  const isEmergency = item.knowledge_type === 'EMERGENCY';
  const isPublished = item.status === 'PUBLISHED';
  const isRevising = item.edit_status === 'REVISING';
  const isDraft = item.status === 'DRAFT';

  const getStatusBadge = () => {
    if (isRevising) return <Badge className="bg-[#F59E0B] text-white border-0 px-2 py-0.5 text-[10px] font-bold rounded-md shadow-none">修订中</Badge>;
    if (isPublished) return <Badge className="bg-[#10B981] text-white border-0 px-2 py-0.5 text-[10px] font-bold rounded-md shadow-none">已发布</Badge>;
    return <Badge className="bg-[#F3F4F6] text-[#6B7280] border-0 px-2 py-0.5 text-[10px] font-bold rounded-md shadow-none">草稿</Badge>;
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full bg-white rounded-lg p-6 transition-all duration-200 cursor-pointer hover:scale-[1.02] border-0 shadow-none",
        isDraft && "bg-[#F3F4F6]"
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-md bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:bg-[#111827] hover:text-white transition-all duration-200 shadow-none">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-lg p-2 border-0 bg-white shadow-none">
                <DropdownMenuLabel className="text-[10px] font-bold text-[#9CA3AF] uppercase px-3 py-2">管理</DropdownMenuLabel>
                <DropdownMenuItem className="rounded-md px-3 py-2.5 font-semibold cursor-pointer hover:bg-[#F3F4F6] text-[#111827]" onClick={() => onEdit?.(item.id)}>
                  <Pencil className="w-4 h-4 mr-2" /> 编辑内容
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#E5E7EB] mx-2" />
                {isPublished ? (
                  <DropdownMenuItem className="rounded-md px-3 py-2.5 font-semibold text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer" onClick={() => onUnpublish?.(item.id)}>
                    <XCircle className="w-4 h-4 mr-2" /> 取消发布
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="rounded-md px-3 py-2.5 font-semibold text-[#10B981] hover:bg-[#D1FAE5] cursor-pointer" onClick={() => onPublish?.(item.id)}>
                    <CheckCircle className="w-4 h-4 mr-2" /> 发布生效
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 标题 & 摘要 */}
      <div className="relative mb-5">
        <h3 className="text-lg font-bold text-[#111827] leading-tight mb-3 line-clamp-2 group-hover:text-[#3B82F6] transition-colors duration-200">
          {item.title}
        </h3>
        <p className="text-sm font-normal text-[#6B7280] line-clamp-2 leading-relaxed">
          {item.summary || item.content_preview || '暂无摘要...'}
        </p>
      </div>

      {/* 目录 Map */}
      <div className="flex-1 bg-[#F3F4F6] rounded-lg p-4 mb-6 group-hover:bg-[#DBEAFE] transition-colors duration-200">
        <div className="flex items-center gap-2 mb-3">
          <List className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">目录结构</span>
        </div>
        <div className="space-y-2">
          {item.table_of_contents && item.table_of_contents.length > 0 ? (
            item.table_of_contents.slice(0, MAX_TOC_ITEMS).map((toc, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs font-medium text-[#111827]">
                <span className="text-[#3B82F6] mt-1 shrink-0">•</span>
                <span className="line-clamp-1">{toc.text}</span>
              </div>
            ))
          ) : <span className="text-[10px] text-[#9CA3AF]">暂无目录</span>}
          {item.table_of_contents && item.table_of_contents.length > MAX_TOC_ITEMS && (
            <div className="text-[10px] font-semibold text-[#3B82F6] pl-4">
              +{item.table_of_contents.length - MAX_TOC_ITEMS} 个章节
            </div>
          )}
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
