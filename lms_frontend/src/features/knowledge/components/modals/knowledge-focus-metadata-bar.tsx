import * as React from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { SimpleTag } from '@/types/common';
import type { RelatedLink } from '@/types/knowledge';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { TagInput } from '@/entities/tag/components/tag-input';
import { sanitizeRelatedLinks } from '../../utils/related-links';

interface KnowledgeFocusMetadataBarProps {
  spaces: SimpleTag[];
  spaceTagId?: number | null;
  onSpaceTagChange: (nextSpaceTagId?: number) => void;
  selectedTags: { id: number; name?: string }[];
  onAddTag: (tag: { id: number; name: string }) => void;
  onRemoveTag: (tagId: number) => void;
  title: string;
  onTitleChange: (value: string) => void;
  relatedLinks: RelatedLink[];
  onRelatedLinkChange: (index: number, field: keyof RelatedLink, value: string) => void;
  onAddRelatedLink: () => void;
  onRemoveRelatedLink: (index: number) => void;
  showTagPanel: boolean;
  onShowTagPanelChange: (open: boolean) => void;
  showRelatedLinksPanel: boolean;
  onShowRelatedLinksPanelChange: (open: boolean) => void;
  onSave: () => void;
  saveLabel?: string;
  savingLabel?: string;
  saveDisabled?: boolean;
  isSaving?: boolean;
  extraTools?: React.ReactNode;
  trailingActions?: React.ReactNode;
}

export const KnowledgeFocusMetadataBar: React.FC<KnowledgeFocusMetadataBarProps> = ({
  spaces,
  spaceTagId,
  onSpaceTagChange,
  selectedTags,
  onAddTag,
  onRemoveTag,
  title,
  onTitleChange,
  relatedLinks,
  onRelatedLinkChange,
  onAddRelatedLink,
  onRemoveRelatedLink,
  showTagPanel,
  onShowTagPanelChange,
  showRelatedLinksPanel,
  onShowRelatedLinksPanelChange,
  onSave,
  saveLabel = '保存',
  savingLabel = '保存中…',
  saveDisabled = false,
  isSaving = false,
  extraTools,
  trailingActions,
}) => {
  const [showSpacePanel, setShowSpacePanel] = React.useState(false);
  const keepBottomToolsVisible = showSpacePanel || showTagPanel || showRelatedLinksPanel;
  const sanitizedRelatedLinks = React.useMemo(
    () => sanitizeRelatedLinks(relatedLinks),
    [relatedLinks],
  );
  const activeSpace = React.useMemo(
    () => spaces.find((item) => item.id === spaceTagId) ?? null,
    [spaceTagId, spaces],
  );

  return (
    <>
      {showTagPanel && (
        <div className="akm-tag-panel">
          <TagInput
            applicableTo="knowledge"
            selectedTags={selectedTags}
            onAdd={onAddTag}
            onRemove={onRemoveTag}
          />
        </div>
      )}

      <div className="akm-bottom-bar">
        <div className={`akm-bottom-tools-zone${keepBottomToolsVisible ? ' akm-bottom-tools-zone-open' : ''}`}>
          <div className="akm-bottom-tools-trigger" aria-hidden="true" />

          <div className="akm-bottom-tools">
            <Popover open={showSpacePanel} onOpenChange={setShowSpacePanel}>
              <div className={`akm-space-trigger-wrap ${showSpacePanel ? ' akm-space-trigger-wrap-active' : ''}`}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="选择 space"
                    className="akm-space-trigger"
                  >
                    <span className="akm-space-trigger-label">{activeSpace?.name ?? '未设置'}</span>
                    {!activeSpace ? (
                      <ChevronDown size={14} className={`akm-space-trigger-icon${showSpacePanel ? ' akm-space-trigger-icon-open' : ''}`} />
                    ) : null}
                  </button>
                </PopoverTrigger>
                {activeSpace ? (
                  <button
                    type="button"
                    aria-label="清除 space"
                    className="akm-space-clear-inline"
                    onClick={() => onSpaceTagChange(undefined)}
                  >
                    <X size={11} />
                  </button>
                ) : null}
              </div>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={14}
                className="akm-space-popover"
              >
                <ScrollContainer className="akm-space-list">
                  {spaces.map((tag) => {
                    const selected = tag.id === activeSpace?.id;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          onSpaceTagChange(tag.id);
                          setShowSpacePanel(false);
                        }}
                        className={`akm-space-item${selected ? ' akm-space-item-active' : ''}`}
                      >
                        <span className="akm-space-item-name">{tag.name}</span>
                      </button>
                    );
                  })}
                </ScrollContainer>
              </PopoverContent>
            </Popover>

            <button
              type="button"
              onClick={() => onShowTagPanelChange(!showTagPanel)}
              className={`akm-tool-btn ${showTagPanel ? ' akm-tool-btn-active' : ''}`}
            >
              标签{selectedTags.length > 0 && ` (${selectedTags.length})`}
            </button>

            <div className="akm-links-anchor">
              <button
                type="button"
                onClick={() => onShowRelatedLinksPanelChange(!showRelatedLinksPanel)}
                className={`akm-tool-btn ${showRelatedLinksPanel ? ' akm-tool-btn-active' : ''}`}
              >
                相关链接{sanitizedRelatedLinks.length > 0 && ` (${sanitizedRelatedLinks.length})`}
              </button>

              {showRelatedLinksPanel && (
                <div className="akm-links-panel">
                  <div className="akm-links-panel-header">
                    <div>
                      <p className="akm-links-panel-title">相关链接</p>
                      <p className="akm-links-panel-subtitle">标题可选，URL 必填</p>
                    </div>
                    <button
                      type="button"
                      onClick={onAddRelatedLink}
                      className="akm-links-add-btn"
                      aria-label="添加相关链接"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {relatedLinks.length > 0 && (
                    <div className="akm-links-list">
                      {relatedLinks.map((item, index) => (
                        <div key={`focus-link-${index}`} className="akm-link-row">
                          <input
                            value={item.title ?? ''}
                            onChange={(e) => onRelatedLinkChange(index, 'title', e.target.value)}
                            placeholder=""
                            aria-label="链接标题"
                            className="akm-link-row-input akm-link-row-title"
                          />
                          <input
                            value={item.url}
                            onChange={(e) => onRelatedLinkChange(index, 'url', e.target.value)}
                            placeholder=""
                            aria-label="链接地址"
                            className="akm-link-row-input akm-link-row-url"
                          />
                          <button
                            type="button"
                            onClick={() => onRemoveRelatedLink(index)}
                            className="akm-link-row-remove"
                            aria-label="删除相关链接"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {relatedLinks.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddRelatedLink();
                        if (!showRelatedLinksPanel) {
                          onShowRelatedLinksPanelChange(true);
                        }
                      }}
                      className="akm-links-empty"
                    >
                      添加相关链接
                    </button>
                  )}
                </div>
              )}
            </div>

            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="标题（可选）"
              className="akm-title-input"
            />

            {extraTools}
          </div>
        </div>

        <div className="akm-bottom-actions">
          {trailingActions}
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled || isSaving}
            className="akm-save-btn"
          >
            {isSaving ? savingLabel : saveLabel}
          </button>
        </div>
      </div>

      <style>{`
        .akm-tag-panel {
          position: absolute;
          bottom: 56px;
          left: 22px;
          width: 340px;
          background: rgba(255,255,255,0.45);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          border: 1px solid rgba(255,255,255,0.5);
          z-index: 10;
          animation: akmSlideUp .15s ease;
          pointer-events: auto;
        }
        .akm-links-anchor {
          position: relative;
          display: flex;
          align-items: center;
        }
        .akm-space-trigger-wrap,
        .akm-title-input {
          background: rgba(255,255,255,0.7);
          font-family: inherit;
        }
        .akm-space-trigger-wrap {
          width: 106px;
          height: 34px;
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 0 10px 0 14px;
          backdrop-filter: blur(6px);
          color: #777;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          transition: all 0.15s ease;
        }
        .akm-space-trigger-wrap:hover,
        .akm-space-trigger-wrap-active {
          background: rgba(255,255,255,0.94);
          color: #5c657c;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .akm-space-trigger {
          min-width: 0;
          flex: 1;
          height: 100%;
          border: none;
          background: transparent;
          padding: 0;
          color: inherit;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
        }
        .akm-space-trigger-label {
          min-width: 0;
          flex: 1;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          text-align: left;
          font-size: 12px;
        }
        .akm-space-trigger-icon {
          flex-shrink: 0;
          color: #8f95a3;
          transition: transform 0.15s ease, color 0.15s ease;
        }
        .akm-space-trigger-icon-open {
          transform: rotate(180deg);
          color: #687385;
        }
        .akm-space-clear-inline {
          width: 18px;
          height: 18px;
          border: none;
          border-radius: 999px;
          background: rgba(255,255,255,0.84);
          color: #8a90a2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .akm-space-clear-inline:hover {
          background: rgba(255,255,255,0.98);
          color: #5c657c;
        }
        .akm-space-popover {
          width: 176px;
          padding: 0;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.42);
          backdrop-filter: blur(20px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          z-index: 620;
          overflow: hidden;
        }
        .akm-space-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: min(284px, calc(100dvh - 140px));
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-gutter: auto;
          box-sizing: border-box;
          padding: 10px;
        }
        .akm-space-item {
          width: 100%;
          border: none;
          border-radius: 14px;
          background: transparent;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #3f4755;
          font-size: 12px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }
        .akm-space-item:hover {
          background: rgba(255,255,255,0.58);
          color: #3a4352;
        }
        .akm-space-item-active {
          background: rgba(255,255,255,0.94);
          color: #3a4352;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.65), 0 4px 14px rgba(148, 163, 184, 0.12);
        }
        .akm-space-item-name {
          min-width: 0;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .akm-links-panel {
          position: absolute;
          left: 0;
          bottom: calc(100% + 14px);
          width: min(440px, calc(100vw - 56px));
          background: rgba(255,255,255,0.42);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          border: 1px solid rgba(255,255,255,0.5);
          z-index: 10;
          animation: akmSlideUp .15s ease;
          pointer-events: auto;
        }
        .akm-links-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .akm-links-panel-title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #4a5466;
        }
        .akm-links-panel-subtitle {
          margin: 4px 0 0;
          font-size: 11px;
          color: #8a90a2;
        }
        .akm-links-add-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          padding: 0;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #7a8698;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .akm-links-add-btn:hover {
          background: rgba(255,255,255,0.32);
          color: #526277;
        }
        .akm-links-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 240px;
          overflow-y: auto;
          scrollbar-gutter: auto;
        }
        .akm-link-row {
          display: grid;
          grid-template-columns: minmax(0, 124px) minmax(0, 1fr) 28px;
          gap: 10px;
          align-items: center;
        }
        .akm-link-row-input {
          border: none;
          border-bottom: 1px solid rgba(95, 109, 132, 0.18);
          outline: none;
          border-radius: 0;
          padding: 8px 2px 6px;
          font-size: 12px;
          background: transparent;
          color: #475569;
          min-width: 0;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .akm-link-row-input::placeholder {
          color: transparent;
        }
        .akm-link-row-title {
          max-width: 124px;
        }
        .akm-link-row-input:focus {
          border-bottom-color: rgba(86, 109, 145, 0.42);
          color: #334155;
        }
        .akm-link-row-remove {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #7a8698;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .akm-link-row-remove:hover {
          background: rgba(255,255,255,0.32);
          color: #526277;
        }
        .akm-links-empty {
          width: 100%;
          border: 1px dashed rgba(126, 141, 161, 0.24);
          border-radius: 14px;
          background: rgba(255,255,255,0.54);
          color: #8a93a0;
          font-size: 12px;
          padding: 14px 12px;
          cursor: pointer;
          font-family: inherit;
        }
        .akm-tag-panel .taginput-row {
          background: rgba(255,255,255,0.7);
          box-shadow: none;
          border-radius: 10px;
        }
        .akm-tag-panel .taginput-suggestions {
          background: rgba(255,255,255,0.7);
          box-shadow: none;
        }
        .akm-tag-panel .taginput-chip {
          background: rgba(255,255,255,0.6);
        }
        .akm-tag-panel .taginput-recent-label {
          color: #9a95a8;
        }
        .akm-tag-panel .taginput-recent-item {
          color: #8b7fad;
        }
        .akm-tag-panel .taginput-recent-item:hover {
          text-decoration-color: #8b7fad;
        }
        .akm-tag-panel .taginput-field::placeholder {
          color: #b0aabb;
        }
        .akm-tag-panel .taginput-add-btn {
          background: #c5bdd4;
          color: #fff;
        }
        .akm-tag-panel .taginput-add-btn:not(:disabled) {
          background: #9b8fbc;
        }
        .akm-tag-panel .taginput-add-btn:not(:disabled):hover {
          background: #8a7dab;
        }
        .akm-tag-panel .taginput-suggestion-create {
          color: #8b7fad;
        }
        .akm-bottom-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 22px;
          pointer-events: none;
        }
        .akm-bottom-tools-zone {
          position: relative;
          display: flex;
          align-items: flex-end;
          min-height: 52px;
          pointer-events: auto;
        }
        .akm-bottom-tools-trigger {
          position: absolute;
          left: -18px;
          bottom: -18px;
          width: 240px;
          height: 92px;
        }
        .akm-bottom-tools {
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0;
          transform: translateY(8px);
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
          position: relative;
          z-index: 1;
        }
        .akm-bottom-tools-zone:hover .akm-bottom-tools,
        .akm-bottom-tools-zone:focus-within .akm-bottom-tools,
        .akm-bottom-tools-zone-open .akm-bottom-tools {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .akm-title-input {
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 6px 14px;
          backdrop-filter: blur(6px);
          outline: none;
          width: 200px;
          font-size: 12px;
          color: #555;
        }
        .akm-title-input::placeholder {
          color: #bbb;
        }
        .akm-tool-btn,
        .akm-save-btn {
          font-family: inherit;
          cursor: pointer;
        }
        .akm-tool-btn {
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          color: #777;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(6px);
          transition: all 0.15s;
        }
        .akm-tool-btn:hover,
        .akm-tool-btn-active {
          background: rgba(255,255,255,0.94);
          color: #5c657c;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .akm-bottom-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          pointer-events: auto;
        }
        .akm-save-btn {
          border: none;
          border-radius: 24px;
          padding: 10px 28px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          color: #555;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: all 0.18s ease;
        }
        .akm-save-btn:hover {
          background: #fff;
          color: #333;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .akm-save-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        @keyframes akmSlideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};
