import * as React from 'react';
import {
  Pencil,
  Eye,
  List,
} from 'lucide-react';
import type { KnowledgeListItem } from '@/types/api';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserInfoRow } from '@/components/common/user-info-row';
import { StatusDot } from '@/components/common/status-dot';

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

  onEdit,
  variant = 'admin',
}) => {
  const shouldShowActions = showActions ?? (variant === 'admin');


  const isEmergency = item.knowledge_type === 'EMERGENCY';



  // 内容预览（后端已清洗 HTML 标签）
  const contentPreview = item.content_preview || '暂无详细内容...';

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full bg-background rounded-lg p-6 transition duration-200 cursor-pointer hover:scale-[1.02] border-0"
      )}
      onClick={() => onView(item.id)}
    >
      {/* 状态排布 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <StatusDot
            size="lg"
            color={isEmergency ? "bg-destructive" : "bg-secondary"}
          />
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isEmergency ? "text-destructive" : "text-secondary"
          )}>
            {isEmergency ? '应急类' : '标准类'}
          </span>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
          {shouldShowActions && (
            <button
              className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-text-muted hover:bg-primary-100 hover:text-primary-700 transition-all duration-200"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(item.id);
              }}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 标题 */}
      <div className="relative mb-4">
        <h3 className="text-lg font-bold text-foreground leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {item.title}
        </h3>
      </div>

      {/* 内容预览区域 (替代原有的目录结构) */}
      <div className="flex-1 bg-muted rounded-lg p-4 mb-6 group-hover:bg-primary-100 transition-colors duration-200 overflow-hidden min-h-[160px] max-h-[160px]">
        <div className="flex items-center gap-2 mb-3">
          <List className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">内容预览</span>
        </div>
        <div className="text-xs font-medium text-text-muted leading-relaxed line-clamp-6">
          {contentPreview}
        </div>
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {item.system_tags?.slice(0, 2).map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="bg-muted text-foreground border-0 rounded-md font-semibold text-[10px]"
          >
            {tag.name}
          </Badge>
        ))}
      </div>

      {/* 底部信息 */}
      <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
        <UserInfoRow
          name={item.updated_by_name || item.created_by_name || '系统'}
          metadata={dayjs(item.updated_at).format('YYYY.MM.DD')}
          avatarText={(item.updated_by_name || item.created_by_name || 'U').charAt(0)}
        />

        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1 text-text-muted">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">{item.view_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
