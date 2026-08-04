import type { ReactNode, RefObject } from 'react';
import { Calendar, Check, Eye, Link as LinkIcon, Plus, Trash2, User, X } from 'lucide-react';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { TagAssignmentSection } from '@/entities/tag/components/tag-assignment-section';
import { RelatedLinksEditor } from '../shared/related-links-editor';
import { StepsEditor } from '../shared/steps-editor';
import { getRelatedLinkDisplayText } from '../../utils/related-links';
import type { KnowledgeDetail as KnowledgeDetailType, RelatedLink } from '@/types/knowledge';
import type { SimpleTag } from '@/types/common';
import dayjs from '@/lib/dayjs';
import { sanitizeStepsHtml } from '../../utils/content-utils';

type KnowledgeRelatedLinksSectionProps = {
  activeRelatedLinks: RelatedLink[];
  canUpdateKnowledge: boolean;
  editingLinks: boolean;
  relatedLinksSectionRef: RefObject<HTMLDivElement | null>;
  onOpenRelatedLinksEditor: (appendEmpty?: boolean) => void;
  onAddRelatedLink: () => void;
  onRelatedLinkChange: (index: number, field: keyof RelatedLink, value: string) => void;
  onRelatedLinksBlur: () => void;
  onRemoveRelatedLink: (index: number) => void;
};

const KnowledgeRelatedLinksSection: React.FC<KnowledgeRelatedLinksSectionProps> = ({
  activeRelatedLinks,
  canUpdateKnowledge,
  editingLinks,
  relatedLinksSectionRef,
  onOpenRelatedLinksEditor,
  onAddRelatedLink,
  onRelatedLinkChange,
  onRelatedLinksBlur,
  onRemoveRelatedLink,
}) => {
  if (!canUpdateKnowledge && activeRelatedLinks.length === 0) {
    return null;
  }

  return (
    <div className="kd-section" ref={relatedLinksSectionRef}>
      <div className="kd-links-header">
        <p className="kd-label">相关链接</p>
        {canUpdateKnowledge && (
          <button
            type="button"
            onClick={() => {
              if (editingLinks) {
                onAddRelatedLink();
                return;
              }
              onOpenRelatedLinksEditor(activeRelatedLinks.length === 0);
            }}
            className="kg-ghost-icon-btn krl-add-btn"
            aria-label="添加相关链接"
          >
            <Plus style={{ width: 12, height: 12 }} />
          </button>
        )}
      </div>

      {canUpdateKnowledge && editingLinks ? (
        <RelatedLinksEditor
          links={activeRelatedLinks}
          onChange={onRelatedLinkChange}
          onRemove={onRemoveRelatedLink}
          onSubmit={onRelatedLinksBlur}
          titlePlaceholder="链接名称"
          urlPlaceholder="https://..."
        />
      ) : activeRelatedLinks.length > 0 ? (
        <div className="kd-links-list">
          {activeRelatedLinks.map((link, index) => (
            <a
              key={`detail-link-view-${index}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="kd-related-link"
            >
              <LinkIcon className="kd-related-link-icon" />
              <span className="kd-related-link-title">
                {getRelatedLinkDisplayText(link)}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};

interface KnowledgeDetailSidePanelProps {
  knowledge: KnowledgeDetailType;
  activeTitle: string;
  activeContent: string;
  activeExternalDocUrl: string;
  showStepsInSidebar?: boolean;
  activeTags: SimpleTag[];
  activeRelatedLinks: RelatedLink[];
  activeSpaceTagId: number | null;
  spaces: SimpleTag[];
  updatedRelativeTime: string;
  canUpdateKnowledge: boolean;
  canDeleteKnowledge: boolean;
  shouldShowSystemTagsSection: boolean;
  showTagInput: boolean;
  showSpaceTags: boolean;
  editingMeta: boolean;
  hasMetaChanges: boolean;
  editingLinks: boolean;
  isSaving: boolean;
  learningAction: ReactNode;
  relatedLinksSectionRef: RefObject<HTMLDivElement | null>;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onExternalDocUrlChange: (value: string) => void;
  onShowTagInputChange: (open: boolean) => void;
  onAddTag: (tag: { id: number; name: string }) => void;
  onRemoveTag: (tagId: number) => void;
  onOpenRelatedLinksEditor: (appendEmpty?: boolean) => void;
  onAddRelatedLink: () => void;
  onRelatedLinkChange: (index: number, field: keyof RelatedLink, value: string) => void;
  onRelatedLinksBlur: () => void;
  onRemoveRelatedLink: (index: number) => void;
  onToggleSpaceTags: () => void;
  onSpaceTagSelect: (spaceTagId: number) => void | Promise<void>;
  onStartEditingMeta: () => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
}

export const KnowledgeDetailSidePanel: React.FC<KnowledgeDetailSidePanelProps> = ({
  knowledge,
  activeTitle,
  activeContent,
  activeExternalDocUrl,
  showStepsInSidebar = true,
  activeTags,
  activeRelatedLinks,
  activeSpaceTagId,
  spaces,
  updatedRelativeTime,
  canUpdateKnowledge,
  canDeleteKnowledge,
  shouldShowSystemTagsSection,
  showTagInput,
  showSpaceTags,
  editingMeta,
  hasMetaChanges,
  editingLinks,
  isSaving,
  learningAction,
  relatedLinksSectionRef,
  onTitleChange,
  onContentChange,
  onExternalDocUrlChange,
  onShowTagInputChange,
  onAddTag,
  onRemoveTag,
  onOpenRelatedLinksEditor,
  onAddRelatedLink,
  onRelatedLinkChange,
  onRelatedLinksBlur,
  onRemoveRelatedLink,
  onToggleSpaceTags,
  onSpaceTagSelect,
  onStartEditingMeta,
  onDelete,
  onCancelEdit,
  onSave,
}) => (
  <div className="kd-right">
    <div className="kd-right-header">
      {canUpdateKnowledge && editingMeta ? (
        <input
          value={activeTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          placeholder="标题"
          className="kd-title-input"
        />
      ) : (
        <h2 className="kd-title">{activeTitle || '未命名知识'}</h2>
      )}
      <p className="kd-time">{updatedRelativeTime}</p>
    </div>

    <ScrollContainer className="kd-right-body">
      {canUpdateKnowledge && (
        <div className="kd-section">
          <p className="kd-label">文档链接</p>
          {editingMeta ? (
            <input
              value={activeExternalDocUrl}
              onChange={(e) => onExternalDocUrlChange(e.target.value)}
              placeholder="https://..."
              className="krl-input"
            />
          ) : (
            <p className="kd-field-text">{activeExternalDocUrl || '—'}</p>
          )}
        </div>
      )}

      {showStepsInSidebar && (
        <div className="kd-section">
          <p className="kd-label">步骤摘要</p>
          {canUpdateKnowledge && editingMeta ? (
            <StepsEditor value={activeContent} onChange={onContentChange} minHeight={64} />
          ) : activeContent ? (
            <div
              className="kd-steps-preview"
              dangerouslySetInnerHTML={{ __html: sanitizeStepsHtml(activeContent) }}
            />
          ) : (
            <p className="kd-field-text">暂无</p>
          )}
        </div>
      )}

      {shouldShowSystemTagsSection && (
        <div className="kd-section">
          <TagAssignmentSection
            applicableTo="knowledge"
            title="系统标签"
            canEdit={canUpdateKnowledge && editingMeta}
            selectedTags={activeTags}
            expanded={showTagInput}
            onExpandedChange={onShowTagInputChange}
            onAdd={onAddTag}
            onRemove={onRemoveTag}
            labelClassName="kd-label"
            addButtonClassName="kd-add-tag-btn"
            tagsWrapClassName="kd-tags"
            tagClassName="kd-tag"
            removeButtonClassName="kd-tag-remove"
          />
        </div>
      )}

      {knowledge.id > 0 && (
        <div className="kd-section">
          <p className="kd-label">详细信息</p>
          <div className="kd-meta-list">
            {(knowledge.updated_by_name || knowledge.created_by_name) && (
              <div className="kd-meta-item">
                <User className="kd-meta-icon" />
                <span>{knowledge.updated_by_name || knowledge.created_by_name}</span>
              </div>
            )}
            <div className="kd-meta-item">
              <Calendar className="kd-meta-icon" />
              <span>{dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm')}</span>
            </div>
            <div className="kd-meta-item">
              <Eye className="kd-meta-icon" />
              <span>{knowledge.view_count ?? 0} 次阅读</span>
            </div>
          </div>
        </div>
      )}

      <KnowledgeRelatedLinksSection
        activeRelatedLinks={activeRelatedLinks}
        canUpdateKnowledge={canUpdateKnowledge && editingMeta}
        editingLinks={editingLinks}
        relatedLinksSectionRef={relatedLinksSectionRef}
        onOpenRelatedLinksEditor={onOpenRelatedLinksEditor}
        onAddRelatedLink={onAddRelatedLink}
        onRelatedLinkChange={onRelatedLinkChange}
        onRelatedLinksBlur={onRelatedLinksBlur}
        onRemoveRelatedLink={onRemoveRelatedLink}
      />

      <div style={{ flex: 1 }} />
    </ScrollContainer>

    <div className="kd-bottom" style={{ position: 'relative' }}>
      {showSpaceTags && (
        <div className="kd-linetype-popover">
          {spaces.map((space) => (
            <button
              key={space.id}
              onClick={() => { void onSpaceTagSelect(space.id); }}
              disabled={isSaving}
              className="kd-linetype-item"
              style={{ background: activeSpaceTagId === space.id ? '#f0f4ff' : 'none' }}
            >
              <span
                className="kd-linetype-dot"
                style={{
                  borderColor: activeSpaceTagId === space.id ? '#e8793a' : '#ccc',
                }}
              >
                {activeSpaceTagId === space.id && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e8793a' }} />
                )}
              </span>
              {space.name}
            </button>
          ))}
        </div>
      )}

      {canUpdateKnowledge && editingMeta ? (
        <div className="kd-edit-actions">
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isSaving}
            className="kd-edit-icon-btn"
            title="取消"
            aria-label="取消"
          >
            <X style={{ width: 15, height: 15 }} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!hasMetaChanges || isSaving}
            className="kd-edit-icon-btn kd-edit-icon-btn-confirm"
            title={isSaving ? '保存中…' : '保存'}
            aria-label={isSaving ? '保存中' : '保存'}
            style={{
              opacity: !hasMetaChanges || isSaving ? 0.5 : 1,
              cursor: !hasMetaChanges || isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            <Check style={{ width: 15, height: 15 }} strokeWidth={1.9} />
          </button>
        </div>
      ) : learningAction ? (
        <div className="kd-bottom-learning">
          {learningAction}
        </div>
      ) : (
        <div className="kd-action-group">
          {canUpdateKnowledge && (
            <button
              onClick={onToggleSpaceTags}
              className="kd-action-btn"
              title="切换 space"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </button>
          )}
          {canUpdateKnowledge && (
            <button
              onClick={onStartEditingMeta}
              className="kd-action-btn"
              title="编辑信息"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
          {canDeleteKnowledge && (
            <button
              onClick={onDelete}
              className="kd-action-btn kd-action-danger"
              title="删除"
            >
              <Trash2 style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>
      )}
    </div>
  </div>
);
