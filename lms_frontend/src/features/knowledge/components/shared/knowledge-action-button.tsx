import * as React from 'react';

import { cn } from '@/lib/utils';

import './knowledge-editor-shared.css';

interface KnowledgeActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'floating' | 'solid';
}

export const KnowledgeActionButton: React.FC<KnowledgeActionButtonProps> = ({
  variant = 'floating',
  className,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={cn('kab-btn', variant === 'solid' ? 'kab-btn-solid' : 'kab-btn-floating', className)}
    {...props}
  />
);
