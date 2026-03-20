import * as React from 'react';
import {
  Pencil,
  List,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import type { KnowledgeListItem } from '@/types/api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SharedKnowledgeCardProps {
  item: KnowledgeListItem;
  onView: (id: number) => void;
  showActions?: boolean;
  showStatus?: boolean;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  variant?: 'admin' | 'student';
}

export const SharedKnowledgeCard: React.FC<SharedKnowledgeCardProps> = ({
  item,
  onView,
  showActions,
  onEdit,
  onDelete,
  variant = 'admin',
}) => {
  const shouldShowActions = showActions ?? (variant === 'admin');
  const contentPreview = item.content_preview || '暂无详细内容...';

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full bg-background rounded-lg p-6 transition duration-200 cursor-pointer hover:scale-[1.02] border-0"
      )}
      onClick={() => onView(item.id)}
    >
      {/* 操作菜单 */}
      {shouldShowActions && (onEdit || onDelete) && (
        <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-text-muted hover:bg-primary-100 hover:text-primary-700 transition-all duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item.id);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  编辑
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 标题 */}
      <div className="relative mb-4 mt-2">
        <h3 className="text-lg font-bold text-foreground leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {item.title}
        </h3>
      </div>

      {/* 内容预览区域 */}
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

    </div>
  );
};
