import * as React from 'react';
import {
  Link as LinkGlyph,
} from 'lucide-react';
import type { KnowledgeListItem } from '@/types/api';
import { plain, isLong, bionicHtml } from '../../utils/content-utils';
import { FocusOrbIcon } from '../shared/focus-icon';

interface KnowledgeCardMymindProps {
  item: KnowledgeListItem;
  onClick: (id: number) => void;
  onFocusOpen?: (id: number) => void;
  index: number;
}

export const KnowledgeCardMymind: React.FC<KnowledgeCardMymindProps> = ({
  item,
  onClick,
  onFocusOpen,
  index,
}) => {
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

  const firstRelatedLink = item.related_links?.[0];
  const sourceHost = getSourceHost(firstRelatedLink?.url);

  return (
    <div
      className="group [break-inside:avoid]"
      style={{
        marginBottom: 22,
        animation: 'mymind-appear .25s ease both',
        animationDelay: `${index * 0.015}s`,
      }}
    >
      <div
        onClick={() => onClick(item.id)}
        className="relative cursor-pointer overflow-hidden rounded-[7px] border-[2.5px] border-transparent bg-card transition-[box-shadow,border-color] duration-[220ms] hover:border-gray-300 hover:[box-shadow:0_4px_20px_rgba(0,0,0,0.08)] [box-shadow:0_2px_8px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)]"
        style={{
          padding: short ? '28px 26px 24px' : '24px 26px 22px',
        }}
      >
        {onFocusOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFocusOpen(item.id);
            }}
            className="absolute top-[10px] right-[10px] z-[3] flex h-7 w-7 -translate-y-[2px] items-center justify-center rounded-full border-none bg-transparent p-0 opacity-0 transition-[opacity,transform] duration-180 group-hover:translate-y-0 group-hover:opacity-100"
            style={{
              width: 28,
              height: 28,
              cursor: 'pointer',
            }}
            title="专注"
            aria-label="专注"
          >
            <FocusOrbIcon size={16} interactive />
          </button>
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
            className="text-foreground"
            style={{
              margin: 0,
              fontSize: short ? 18 : 14.5,
              lineHeight: short ? 1.48 : 1.68,
              letterSpacing: short ? '-0.015em' : '-0.008em',
            }}
            dangerouslySetInnerHTML={{ __html: bionicHtml(text) }}
          />
        )}

        {sourceHost && firstRelatedLink?.url && (
          <a
            href={firstRelatedLink.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-none absolute right-0 bottom-0 inline-flex max-w-[62%] translate-y-1 items-center gap-1 overflow-hidden rounded-tl-[7px] border border-gray-200 bg-card px-[9px] py-[5px] text-[10.5px] whitespace-nowrap text-foreground opacity-0 text-ellipsis no-underline transition-[opacity,transform] duration-160 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
          >
            <LinkGlyph size={10} />
            {sourceHost}
          </a>
        )}

      </div>

      {/* 标题显示在卡片底部中间 */}
      {item.title && (
        <p
          className="text-text-muted"
          style={{
            margin: '5px 6px 0',
            fontSize: 12.5,
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
