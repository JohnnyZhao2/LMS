import * as React from 'react';
import { Link as LinkGlyph } from 'lucide-react';
import type { KnowledgeListItem } from '@/types/knowledge';
import { plain, sanitizeStepsHtml } from '../../utils/content-utils';
import { FocusOrbIcon } from '../shared/focus-icon';

interface KnowledgeCardMymindProps {
  item: KnowledgeListItem;
  onClick: (id: number) => void;
  onFocusOpen?: (id: number) => void;
  index: number;
}

/**
 * 知识瀑布流卡片：标题 + 步骤摘要；悬停显示专注球
 */
export const KnowledgeCardMymind: React.FC<KnowledgeCardMymindProps> = ({
  item,
  onClick,
  onFocusOpen,
  index,
}) => {
  const stepsHtml = sanitizeStepsHtml(item.content_preview || '');
  const text = plain(stepsHtml);
  const long = text.length > 120;
  const short = !long && text.length < 80;

  const firstRelatedLink = item.related_links?.[0];
  let sourceHost = '';
  if (firstRelatedLink?.url) {
    try {
      sourceHost = new URL(firstRelatedLink.url).host;
    } catch {
      sourceHost = firstRelatedLink.url.replace(/^https?:\/\//i, '').split('/')[0] ?? '';
    }
  }

  return (
    <div
      className="group [break-inside:avoid]"
      style={{
        marginBottom: 22,
        animation: 'mymind-appear .25s ease both',
        animationDelay: `${Math.min(index, 24) * 0.015}s`,
      }}
    >
      <div
        onClick={() => onClick(item.id)}
        className="relative cursor-pointer overflow-hidden rounded-[7px] border-[2.5px] border-transparent bg-card transition-[box-shadow,border-color] duration-[220ms] hover:border-gray-300 hover:[box-shadow:0_4px_20px_rgba(0,0,0,0.08)] [box-shadow:0_2px_8px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)]"
        style={{
          padding: short ? '28px 26px 24px' : '24px 26px 22px',
        }}
      >
        {onFocusOpen ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFocusOpen(item.id);
            }}
            className="absolute top-[10px] right-[10px] z-[3] flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent p-0 opacity-0 transition-opacity duration-180 group-hover:opacity-100"
            title="专注"
            aria-label="专注"
          >
            <FocusOrbIcon size={16} interactive />
          </button>
        ) : null}

        {item.title ? (
          <h3
            style={{
              margin: '0 0 10px',
              fontSize: short ? 18 : 16,
              fontWeight: 600,
              color: '#1a1a1a',
              lineHeight: 1.35,
            }}
          >
            {item.title}
          </h3>
        ) : null}

        {stepsHtml ? (
          <div
            className="card-rich"
            style={{
              maxHeight: long ? 220 : undefined,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: long ? 10 : short ? 5 : 7,
              WebkitBoxOrient: 'vertical',
              fontSize: 13.5,
              lineHeight: 1.65,
              color: '#444',
            }}
            dangerouslySetInnerHTML={{ __html: stepsHtml }}
          />
        ) : null}

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
    </div>
  );
};
