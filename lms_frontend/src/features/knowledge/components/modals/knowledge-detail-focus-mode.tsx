import * as React from 'react';

import { SlashQuillEditor } from '../editor/rich-text-editor';

interface KnowledgeDetailFocusModeProps {
  activeContent: string;
  canSubmit: boolean;
  isSaving: boolean;
  onContentChange: (content: string) => void;
  onExitFocus: () => void;
  onSave: () => void;
}

export const KnowledgeDetailFocusMode: React.FC<KnowledgeDetailFocusModeProps> = ({
  activeContent,
  canSubmit,
  isSaving,
  onContentChange,
  onExitFocus,
  onSave,
}) => (
  <div className="kd-immersive-shell">
    <button
      type="button"
      onClick={onExitFocus}
      className="kd-immersive-minimize-btn"
      title="收起"
      aria-label="收起"
    >
      <svg
        width="22"
        height="22"
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

    <div className="kd-immersive-editor-area scrollbar-subtle">
      <div className="kd-immersive-editor-inner">
        <SlashQuillEditor
          value={activeContent}
          onChange={onContentChange}
          placeholder="Type / for shortcuts"
          className="kd-immersive-editor"
          minHeight={380}
          autoFocus
        />
      </div>
    </div>

    <div className="kd-immersive-bottom">
      <button
        type="button"
        onClick={onSave}
        disabled={!canSubmit || isSaving}
        className="kd-immersive-save-btn"
      >
        {isSaving ? '保存中…' : '保存'}
      </button>
    </div>

    <style>{`
      .kd-immersive-shell {
        position: relative;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        animation: kdFadeIn .18s ease;
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
      .kd-immersive-minimize-btn {
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
      .kd-immersive-minimize-btn:hover {
        background: rgba(255, 255, 255, 0.98);
        color: #53627b;
        transform: translateY(-1px) scale(1.02);
        box-shadow: 0 9px 20px rgba(37, 49, 72, 0.13);
      }
      .kd-immersive-editor-area {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        display: flex;
        justify-content: center;
      }
      .kd-immersive-editor-inner {
        width: 100%;
        max-width: 1040px;
        padding: 64px 40px 144px;
      }
      .kd-immersive-editor .ql-editor {
        font-size: 16px;
        line-height: 2;
        color: #2a2a2e;
        font-family: 'Georgia', 'Times New Roman', 'PingFang SC', serif;
      }
      .kd-immersive-editor .ql-editor.ql-blank::before {
        color: #c0c4cc;
      }
      .kd-immersive-editor .ql-editor h1 {
        font-size: 40px;
        margin-bottom: 18px;
        color: #1f2937;
      }
      .kd-immersive-editor .ql-editor p {
        margin-bottom: 14px;
      }
      .kd-immersive-editor .sqe-menu {
        min-width: 240px;
      }
      .kd-immersive-bottom {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        display: flex;
        justify-content: flex-end;
        padding: 20px 26px 26px;
        pointer-events: none;
      }
      .kd-immersive-save-btn {
        pointer-events: auto;
        border: none;
        border-radius: 24px;
        padding: 10px 28px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.04em;
        cursor: pointer;
        font-family: inherit;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(8px);
        color: #555;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        transition: all 0.18s ease;
      }
      .kd-immersive-save-btn:hover {
        background: #fff;
        color: #333;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      }
      .kd-immersive-save-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    `}</style>
  </div>
);
