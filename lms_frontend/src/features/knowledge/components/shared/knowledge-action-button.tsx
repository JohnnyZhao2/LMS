import * as React from 'react';

import '@/features/knowledge/components/shared/knowledge-editor-shared.css';

type KnowledgeActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const KnowledgeActionButton: React.FC<KnowledgeActionButtonProps> = ({
  className,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`kab-btn kab-btn-solid${className ? ` ${className}` : ''}`}
    {...props}
  />
);
