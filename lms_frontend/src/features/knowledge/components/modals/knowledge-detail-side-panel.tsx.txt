import type { ReactNode, RefObject } from 'react';
import { Calendar, Check, Eye, Edit, Link as LinkIcon, Plus, Trash2, User, X } from 'lucide-react';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { TagAssignmentSection } from '@/entities/tag/components/tag-assignment-section';
import { RelatedLinksEditor } from '../shared/related-links-editor';
import { getRelatedLinkDisplayText } from '../../utils/related-links';
import type { KnowledgeDetail as KnowledgeDetailType, RelatedLink } from '@/types/knowledge';
import type { SimpleTag } from '@/types/common';
import dayjs from '@/lib/dayjs';

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
          variant="detail"
          links={activeRelatedLinks}
          onChange={onRelatedLinkChange}
          onAdd={onAddRelatedLink}
          onRemove={onRemoveRelatedLink}
          onSubmit={onRelatedLinksBlur}
          emptyLabel="添加相关链接"
          showColumnLabels
          titlePlaceholder="链接名称"
          urlPlaceholder="https://example.com"
        />
      ) : (
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
          {canUpdateKnowledge && activeRelatedLinks.length === 0 && (
            <button
              type="button"
              className="kd-links-empty"
              onClick={() => onOpenRelatedLinksEditor(true)}
            >
              添加相关链接
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface KnowledgeDetailSidePanelProps {
  knowledge: KnowledgeDetailType;
  activeTitle: string;
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
  editing: boolean;
  hasContentChanges: boolean;
  editingLinks: boolean;
  isSaving: boolean;
  learningAction: ReactNode;
  relatedLinksSectionRef: RefObject<HTMLDivElement | null>;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
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
  onStartEditing: () => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
}

export const KnowledgeDetailSidePanel: React.FC<KnowledgeDetailSidePanelProps> = ({
  knowledge,
  activeTitle,
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
  editing,
  hasContentChanges,
  editingLinks,
  isSaving,
  learningAction,
  relatedLinksSectionRef,
  onTitleChange,
  onTitleBlur,
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
  onStartEditing,
  onDelete,
  onCancelEdit,
  onSave,
}) => (
  <div className="kd-right">
    <div className="kd-right-header">
      {canUpdateKnowledge ? (
        <input
          value={activeTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          placeholder="Title goes here"
          className="kd-title-input"
        />
      ) : (
        <h2 className="kd-title">{activeTitle || '未命名知识'}</h2>
      )}
      <p className="kd-time">{updatedRelativeTime}</p>
    </div>

    <ScrollContainer className="kd-right-body">
      {shouldShowSystemTagsSection && (
        <div className="kd-section">
          <TagAssignmentSection
            applicableTo="knowledge"
            title="系统标签"
            canEdit={canUpdateKnowledge}
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

      <KnowledgeRelatedLinksSection
        activeRelatedLinks={activeRelatedLinks}
        canUpdateKnowledge={canUpdateKnowledge}
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

      {canUpdateKnowledge && (editing || hasContentChanges) ? (
        <div className="kd-edit-actions">
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isSaving}
            className="kd-edit-icon-btn"
            title="取消编辑"
            aria-label="取消编辑"
          >
            <X style={{ width: 15, height: 15 }} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!hasContentChanges || isSaving}
            className="kd-edit-icon-btn kd-edit-icon-btn-confirm"
            title={isSaving ? '保存中…' : '保存'}
            aria-label={isSaving ? '保存中' : '保存'}
            style={{
              opacity: !hasContentChanges || isSaving ? 0.5 : 1,
              cursor: !hasContentChanges || isSaving ? 'not-allowed' : 'pointer',
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
              onClick={onStartEditing}
              className="kd-action-btn"
              title="编辑"
            >
              <Edit style={{ width: 15, height: 15 }} />
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
