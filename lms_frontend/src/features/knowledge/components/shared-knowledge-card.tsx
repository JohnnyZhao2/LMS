import { useMemo } from 'react';
import {
  MoreHorizontal,
  Pencil,
  CheckCircle,
  XCircle,
  Eye,
  List,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { KnowledgeListItem, SimpleTag, TableOfContentsItem } from '@/types/api';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';

/** 目录显示的最大条目数 */
const MAX_TOC_ITEMS = 5;

/**
 * 知识卡片 Props
 */
export interface SharedKnowledgeCardProps {
  /** 知识项数据 */
  item: KnowledgeListItem;
  /** 点击查看回调 */
  onView: (id: number) => void;
  /** 是否显示管理操作（编辑、发布等） */
  showActions?: boolean;
  /** 是否显示状态徽章 */
  showStatus?: boolean;
  /** 编辑回调（管理端） */
  onEdit?: (id: number) => void;
  /** 发布回调（管理端） */
  onPublish?: (id: number) => Promise<void>;
  /** 取消发布回调（管理端） */
  onUnpublish?: (id: number) => Promise<void>;
  /** 卡片变体：admin 显示完整功能，student 隐藏管理功能 */
  variant?: 'admin' | 'student';
}

/**
 * 共用知识卡片组件
 * 管理端和学员端使用相同的布局风格
 * 区别：学员端不显示状态徽章和操作菜单
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
  // 根据 variant 设置默认值
  const shouldShowActions = showActions ?? (variant === 'admin');
  const shouldShowStatus = showStatus ?? (variant === 'admin');

  const isEmergency = item.knowledge_type === 'EMERGENCY';
  const isPublished = item.status === 'PUBLISHED';
  const isRevising = item.edit_status === 'REVISING';
  const isDraft = item.status === 'DRAFT';

  /**
   * 获取状态样式类和文本
   */
  const getStatusInfo = () => {
    if (isRevising) {
      return { className: 'text-[#D4A017]', text: '修订中' };
    }
    if (isPublished) {
      return { className: 'text-[#10B759]', text: '已发布' };
    }
    return { className: 'text-gray-500', text: '草稿' };
  };

  const statusInfo = getStatusInfo();

  /**
   * 处理操作菜单点击
   */
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(item.id);
    }
  };

  const handlePublish = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPublish) {
      const idToPublish = item.pending_draft_id || item.id;
      await onPublish(idToPublish);
    }
  };

  const handleUnpublish = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnpublish) {
      await onUnpublish(item.id);
    }
  };

  /**
   * 获取所有标签（系统标签 + 操作标签）
   */
  const allTags = useMemo(() => {
    const tags: SimpleTag[] = [];
    if (item.system_tags) tags.push(...item.system_tags);
    if (item.operation_tags) tags.push(...item.operation_tags);
    return tags;
  }, [item.system_tags, item.operation_tags]);

  /**
   * 显示的标签（最多3个）
   */
  const displayTags = allTags.slice(0, 3);
  const moreTags = allTags.length - 3;

  return (
    <div
      className={cn(
        // 基础卡片样式
        "bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col p-5",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]",
        "hover:border-primary-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]",
        // 修订中卡片 - 琥珀色边框
        shouldShowStatus && isRevising && "border-[1.5px] border-[#E0A860] hover:border-[#C9924D] hover:shadow-[0_8px_24px_rgba(224,168,96,0.15)]",
        // 草稿卡片 - 虚线边框 + 灰色背景
        shouldShowStatus && isDraft && "border-[1.5px] border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-white"
      )}
      onClick={() => onView(item.id)}
    >
      {/* 卡片头部：文档类型 + 状态 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isEmergency ? "bg-[#FF4D6A]" : "bg-[#10B759]"
            )}
          />
          <span
            className={cn(
              "text-[11px] font-semibold tracking-wide uppercase text-gray-500",
              isEmergency && "text-[#FF4D6A]"
            )}
          >
            {isEmergency ? 'EMERGENCY' : 'STANDARD'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 状态徽章 - 仅管理端显示 */}
          {shouldShowStatus && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium border border-current",
                statusInfo.className
              )}
            >
              {statusInfo.text}
            </span>
          )}
          {/* 操作菜单 - 仅管理端显示 */}
          {shouldShowActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-7 h-7 rounded-md bg-transparent border-none text-gray-400 cursor-pointer flex items-center justify-center transition-all hover:bg-gray-100 hover:text-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                {isRevising ? (
                  <DropdownMenuItem onClick={handlePublish}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    发布修订
                  </DropdownMenuItem>
                ) : isPublished ? (
                  <DropdownMenuItem onClick={handleUnpublish}>
                    <XCircle className="w-4 h-4 mr-2" />
                    取消发布
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handlePublish}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    发布
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 卡片主体 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 上半部分：标题 + 概要 + 标签 */}
        <div className="shrink-0">
          {/* 标题 */}
          <h3 className="text-[17px] font-bold text-gray-900 leading-[1.4] mb-2 line-clamp-2 group-hover:text-primary-600 hover:text-primary-600">
            {item.title}
          </h3>

          {/* 知识概要（固定两行） */}
          <div className="text-[13px] italic text-gray-500 leading-[1.5] line-clamp-2 mb-3 min-h-[39px]">
            {item.summary ? `"${item.summary}"` : (item.content_preview || '暂无概要')}
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <span
                key={tag.id}
                className="py-1 px-2.5 bg-transparent border border-gray-200 rounded-full text-[11px] text-gray-600 flex items-center gap-1"
              >
                <span className="text-[10px] text-gray-400">◇</span>
                {tag.name}
              </span>
            ))}
            {moreTags > 0 && (
              <span className="py-1 px-2.5 bg-transparent border border-gray-200 rounded-full text-[11px] text-gray-400">
                +{moreTags}
              </span>
            )}
          </div>
        </div>

        {/* 分割线 */}
        <div className="h-px bg-gray-100 my-4 shrink-0" />

        {/* 下半部分：目录映射（固定区域） */}
        <div className="flex flex-col">
          {item.table_of_contents && item.table_of_contents.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 tracking-wide uppercase">
                <List className="w-3 h-3" />
                <span>PROCEDURAL MAP</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {item.table_of_contents.slice(0, MAX_TOC_ITEMS).map((tocItem: TableOfContentsItem, index: number) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-1.5 text-[13px] text-gray-700 leading-[1.4]",
                      "before:content-['•'] before:text-primary-400 before:text-[10px] before:shrink-0",
                      tocItem.level === 2 && "pl-3",
                      tocItem.level === 3 && "pl-6"
                    )}
                  >
                    {tocItem.level === 1 ? `${index + 1}. ` : ''}{tocItem.text}
                  </div>
                ))}
                {item.table_of_contents.length > MAX_TOC_ITEMS && (
                  <div className="text-[11px] text-gray-400 mt-1">
                    +{item.table_of_contents.length - MAX_TOC_ITEMS} more...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">
              暂无目录
            </div>
          )}
        </div>
      </div>

      {/* 卡片底部 */}
      <div className="flex items-center justify-between mt-4 pt-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-600">
            {(item.updated_by_name || item.created_by_name || '?').charAt(0)}
          </div>
          <div className="flex flex-col gap-px">
            <span className="text-xs font-medium text-gray-700">
              {item.updated_by_name || item.created_by_name || '-'}
            </span>
            <span className="text-[11px] text-gray-400">
              {item.updated_at ? dayjs(item.updated_at).format('YYYY-MM-DD') : '-'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Eye className="w-3 h-3" />
          <span>{item.view_count || 0}</span>
        </div>
      </div>
    </div>
  );
};
