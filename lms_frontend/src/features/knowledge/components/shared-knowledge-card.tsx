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
    if (isRevising) return <Badge className="bg-orange-500/10 text-orange-600 border-none px-2 py-0.5 text-[10px] font-bold">REVISING</Badge>;
    if (isPublished) return <Badge className="bg-success-500/10 text-success-600 border-none px-2 py-0.5 text-[10px] font-bold">PUBLISHED</Badge>;
    return <Badge className="bg-gray-100 text-gray-500 border-none px-2 py-0.5 text-[10px] font-bold">DRAFT</Badge>;
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full bg-white rounded-[2rem] p-6 transition-all duration-500 ease-out border border-transparent shadow-sm hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-2",
        isDraft && "bg-gray-50/50 border-dashed border-gray-200"
      )}
      onClick={() => onView(item.id)}
    >
      {/* 状态排布 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full animate-pulse",
            isEmergency ? "bg-error-500 shadow-[0_0_10px_var(--color-error-500)]" : "bg-success-500"
          )} />
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            isEmergency ? "text-error-500" : "text-success-500"
          )}>
            {isEmergency ? 'Emergency' : 'Standard'}
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {shouldShowStatus && getStatusBadge()}
          {shouldShowActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-900 hover:text-white transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-none shadow-premium animate-fadeIn">
                <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2">Management</DropdownMenuLabel>
                <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold cursor-pointer" onClick={() => onEdit?.(item.id)}>
                  <Pencil className="w-4 h-4 mr-2" /> 编辑内容
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-50 mx-2" />
                {isPublished ? (
                  <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold text-error-500 focus:bg-error-50 cursor-pointer" onClick={() => onUnpublish?.(item.id)}>
                    <XCircle className="w-4 h-4 mr-2" /> 取消发布
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold text-success-500 focus:bg-success-50 cursor-pointer" onClick={() => onPublish?.(item.id)}>
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
        <h3 className="text-lg font-black text-gray-900 leading-tight mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {item.title}
        </h3>
        <p className="text-sm font-medium text-gray-400 line-clamp-2 leading-relaxed italic">
          {item.summary || item.content_preview || 'No strategic summary available...'}
        </p>
      </div>

      {/* 目录 Map */}
      <div className="flex-1 bg-gray-50/50 rounded-2xl p-4 mb-6 border border-gray-100 group-hover:bg-white transition-colors duration-500">
        <div className="flex items-center gap-2 mb-3">
          <List className="w-3.5 h-3.5 text-primary-500" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Procedural Map</span>
        </div>
        <div className="space-y-2">
          {item.table_of_contents && item.table_of_contents.length > 0 ? (
            item.table_of_contents.slice(0, MAX_TOC_ITEMS).map((toc, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs font-bold text-gray-600">
                <span className="text-primary-400 mt-1 shrink-0">◇</span>
                <span className="line-clamp-1">{toc.text}</span>
              </div>
            ))
          ) : <span className="text-[10px] text-gray-300 italic">No structure defined</span>}
          {item.table_of_contents && item.table_of_contents.length > MAX_TOC_ITEMS && (
            <div className="text-[10px] font-bold text-primary-500 pl-4">
              +{item.table_of_contents.length - MAX_TOC_ITEMS} Sections
            </div>
          )}
        </div>
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-2 mb-8">
        {item.system_tags?.slice(0, 2).map((tag) => (
          <Badge key={tag.id} variant="secondary" className="bg-gray-100/80 text-gray-500 border-none rounded-lg font-bold text-[10px]">
            # {tag.name}
          </Badge>
        ))}
      </div>

      {/* 底部信息 */}
      <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gray-900 rounded-xl flex items-center justify-center text-white font-black text-sm group-hover:scale-110 transition-transform shadow-lg">
            {(item.updated_by_name || 'U').charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-gray-900 leading-none mb-1">{item.updated_by_name || 'System'}</span>
            <span className="text-[10px] font-bold text-gray-400">{dayjs(item.updated_at).format('YYYY.MM.DD')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-gray-400">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">{item.view_count || 0}</span>
          </div>
          <div className="h-8 w-8 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-all transform group-hover:translate-x-1">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
