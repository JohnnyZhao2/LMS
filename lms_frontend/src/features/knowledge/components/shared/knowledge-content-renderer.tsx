import * as React from 'react';

import { cn } from '@/lib/utils';

import './knowledge-editor-shared.css';

type KnowledgeContentVariant = 'detail' | 'focus' | 'card';

interface KnowledgeContentRendererProps {
  html: string;
  variant?: KnowledgeContentVariant;
  compact?: boolean;
  className?: string;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
}

const variantClass: Record<KnowledgeContentVariant, string> = {
  detail: 'ke-content-detail',
  focus: 'ke-content-detail ke-content-focus',
  card: 'ke-content-card-preview',
};

export const KnowledgeContentRenderer: React.FC<KnowledgeContentRendererProps> = ({
  html,
  variant = 'detail',
  compact = false,
  className,
  contentClassName,
  contentStyle,
}) => (
  <div
    className={cn(
      'ke-content-base',
      variantClass[variant],
      compact && 'ke-content-card-preview-short',
      className,
    )}
  >
    <div
      className={cn('sqe-content', contentClassName)}
      style={contentStyle}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  </div>
);
