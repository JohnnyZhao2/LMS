import * as React from 'react';

import { ScrollContainer } from '@/components/ui/scroll-container';
import { SlashQuillEditor } from '../editor/rich-text-editor';

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
  const editorClasses = ['kfs-editor', editorClassName].filter(Boolean).join(' ');
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

      <style>{`
        .kfs-shell {
          position: relative;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: kfsFadeIn var(--kfs-fade-in-duration) ease;
          background:
            linear-gradient(135deg,
              #f5d7d2 0%,
              #eedce8 12%,
              #e2ddf0 22%,
              #dde1f2 32%,
              #e6e3ed 42%,
              #edeaef 52%,
              #f0eff2 62%,
              #f4f3f5 75%,
              #f7f7f9 100%
            );
        }
        .kfs-shell-fixed {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          z-index: var(--kfs-z-index);
        }
        .kfs-minimize-btn {
          position: absolute;
          top: 22px;
          right: 24px;
          z-index: 12;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(14px);
          color: #6a7a92;
          box-shadow: 0 6px 18px rgba(37, 49, 72, 0.11);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease;
        }
        .kfs-minimize-btn:hover {
          background: rgba(255, 255, 255, 0.98);
          color: #53627b;
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 9px 20px rgba(37, 49, 72, 0.13);
        }
        .kfs-editor-area {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          display: flex;
          justify-content: center;
        }
        .kfs-editor-inner {
          width: 100%;
          max-width: var(--kfs-editor-max-width);
          padding: var(--kfs-editor-padding);
        }
        .kfs-editor .ql-editor {
          font-size: 16px;
          line-height: 2;
          color: #2a2a2e;
          font-family: 'Georgia', 'Times New Roman', 'PingFang SC', serif;
        }
        .kfs-editor .ql-editor.ql-blank::before {
          color: #c0c4cc;
        }
        .kfs-editor .ql-editor h1 {
          font-size: 40px;
          margin-bottom: 18px;
          color: #1f2937;
        }
        .kfs-editor .ql-editor p {
          margin-bottom: 14px;
        }
        .kfs-editor .sqe-menu {
          min-width: 240px;
        }
        @keyframes kfsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
