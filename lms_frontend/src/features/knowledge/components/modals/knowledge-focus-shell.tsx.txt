import * as React from 'react';

import { ScrollContainer } from '@/components/ui/scroll-container';
import { SlashQuillEditor } from '../editor/rich-text-editor';
import '../shared/knowledge-editor-shared.css';

interface KnowledgeFocusShellProps {
  content: string;
  onContentChange: (content: string) => void;
  onExit: () => void;
  children?: React.ReactNode;
  shellClassName?: string;
  editorClassName?: string;
  editorMaxWidth?: number;
  editorPadding?: string;
  editorMinHeight?: number;
  minimizeIconSize?: number;
  fixed?: boolean;
  zIndex?: number;
  fadeInDuration?: string;
  readOnly?: boolean;
}

type FocusShellStyle = React.CSSProperties & {
  '--kfs-editor-max-width': string;
  '--kfs-editor-padding': string;
  '--kfs-z-index': string;
  '--kfs-fade-in-duration': string;
};

export const KnowledgeFocusShell: React.FC<KnowledgeFocusShellProps> = ({
  content,
  onContentChange,
  onExit,
  children,
  shellClassName,
  editorClassName,
  editorMaxWidth = 960,
  editorPadding = '72px 40px 120px',
  editorMinHeight = 380,
  minimizeIconSize = 16,
  fixed = false,
  zIndex = 500,
  fadeInDuration = '0.18s',
  readOnly = false,
}) => {
  const classes = ['kfs-shell', fixed ? 'kfs-shell-fixed' : '', shellClassName].filter(Boolean).join(' ');
  const editorClasses = ['kfs-editor', 'ke-content-focus', editorClassName].filter(Boolean).join(' ');
  const shellStyle: FocusShellStyle = {
    '--kfs-editor-max-width': `${editorMaxWidth}px`,
    '--kfs-editor-padding': editorPadding,
    '--kfs-z-index': String(zIndex),
    '--kfs-fade-in-duration': fadeInDuration,
  };

  return (
    <div className={classes} style={shellStyle}>
      <button
        type="button"
        onClick={onExit}
        className="kfs-minimize-btn"
        title="收起"
        aria-label="收起"
      >
        <svg
          width={minimizeIconSize}
          height={minimizeIconSize}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 6V18H18"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 16L18 6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <ScrollContainer className="kfs-editor-area">
        <div className="kfs-editor-inner">
          <SlashQuillEditor
            key={readOnly ? 'readonly' : 'editable'}
            value={content}
            onChange={onContentChange}
            placeholder="键入 / 调出快捷指令"
            autoFocus
            className={editorClasses}
            minHeight={editorMinHeight}
            readOnly={readOnly}
          />
        </div>
      </ScrollContainer>

      {children}
    </div>
  );
};
