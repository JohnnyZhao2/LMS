import * as React from 'react';
import {
  Pencil,
  Trash2,
  MoreVertical,
  Link as LinkGlyph,
} from 'lucide-react';
import type { KnowledgeListItem } from '@/types/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { plain, isLong, bionicHtml } from '../utils/content-utils';

interface KnowledgeCardMymindProps {
  item: KnowledgeListItem;
  onClick: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
  index: number;
}

export const KnowledgeCardMymind: React.FC<KnowledgeCardMymindProps> = ({
  item,
  onClick,
  onEdit,
  onDelete,
  showActions,
  index,
}) => {
  const [hovered, setHovered] = React.useState(false);

  const long = isLong(item.content);
  const text = plain(item.content);
  const short = !long && text.length < 80;

  const getSourceHost = React.useCallback((url?: string) => {
    if (!url) return '';
    try {
      return new URL(url).host;
    } catch {
      return url.replace(/^https?:\/\//i, '').split('/')[0] ?? '';
    }
  }, []);

  const sourceHost = getSourceHost(item.source_url);

  return (
    <div
      style={{
        breakInside: 'avoid',
        marginBottom: 22,
        animation: 'mymind-appear .25s ease both',
        animationDelay: `${index * 0.015}s`,
      }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onClick(item.id)}
        style={{
          background: '#fff',
          borderRadius: 7,
          padding: short ? '28px 26px 24px' : '24px 26px 22px',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'box-shadow .22s ease, border-color .22s ease',
          boxShadow: hovered
            ? '0 4px 20px rgba(0,0,0,0.08)'
            : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
          border: hovered
            ? '2.5px solid #a8b8cc'
            : '2.5px solid transparent',
        }}
      >
        {/* 操作菜单 */}
        {showActions && (onEdit || onDelete) && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              opacity: hovered ? 1 : 0,
              transition: 'opacity .18s',
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-7 w-7 rounded-full bg-muted/80 flex items-center justify-center text-text-muted hover:bg-muted hover:text-foreground transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
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

        {/* 内容显示 */}
        {long ? (
          <div
            className="card-rich"
            style={{
              maxHeight: 400,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 15,
              WebkitBoxOrient: 'vertical',
            }}
            dangerouslySetInnerHTML={{ __html: bionicHtml(item.content) }}
          />
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: short ? 18 : 14.5,
              lineHeight: short ? 1.48 : 1.68,
              color: '#1a1a1a',
              letterSpacing: short ? '-0.015em' : '-0.008em',
            }}
            dangerouslySetInnerHTML={{ __html: bionicHtml(text) }}
          />
        )}

        {sourceHost && item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 9px',
              borderRadius: '7px 0 0 0',
              background: '#ffffff',
              border: '1px solid #d9e0ea',
              color: '#1f2937',
              fontSize: 10.5,
              textDecoration: 'none',
              maxWidth: '62%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'none' : 'translateY(4px)',
              pointerEvents: hovered ? 'auto' : 'none',
              transition: 'opacity .16s ease, transform .16s ease',
            }}
          >
            <LinkGlyph size={10} />
            {sourceHost}
          </a>
        )}

      </div>

      {/* 标题显示在卡片底部中间 */}
      {item.title && (
        <p
          style={{
            margin: '5px 6px 0',
            fontSize: 12.5,
            color: '#8ea0b5',
            lineHeight: 1.3,
            textAlign: 'center',
          }}
        >
          {item.title}
        </p>
      )}
    </div>
  );
};
