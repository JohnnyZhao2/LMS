import * as React from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { SimpleTag } from '@/types/common';
import type { RelatedLink } from '@/types/knowledge';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { TagInput } from '@/entities/tag/components/tag-input';
import { cn } from '@/lib/utils';
import { KnowledgeActionButton } from '../shared/knowledge-action-button';
import { RelatedLinksEditor } from '../shared/related-links-editor';
import { sanitizeRelatedLinks } from '../../utils/related-links';
import '../shared/knowledge-editor-shared.css';

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

  const toolButtonClassName = (active: boolean) => cn(
    'akm-tool-btn',
    'kg-glass-pill',
    active && 'akm-tool-btn-active',
  );

  return (
    <>
      {showTagPanel ? (
        <div className="akm-tag-panel kg-glass-panel">
          <TagInput
            applicableTo="knowledge"
            selectedTags={selectedTags}
            onAdd={onAddTag}
            onRemove={onRemoveTag}
          />
        </div>
      ) : null}

      <div className="akm-bottom-bar">
        <div className={cn('akm-bottom-tools-zone', keepBottomToolsVisible && 'akm-bottom-tools-zone-open')}>
          <div className="akm-bottom-tools-trigger" aria-hidden="true" />

          <div className="akm-bottom-tools">
            <Popover open={showSpacePanel} onOpenChange={setShowSpacePanel}>
              <div className={cn(
                'akm-space-trigger-wrap',
                'kg-glass-pill',
                showSpacePanel && 'akm-space-trigger-wrap-active',
              )}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="选择 space"
                    className="akm-space-trigger"
                  >
                    <span className="akm-space-trigger-label">{activeSpace?.name ?? '未设置'}</span>
                    {activeSpace ? null : (
                      <ChevronDown
                        size={14}
                        className={cn('akm-space-trigger-icon', showSpacePanel && 'akm-space-trigger-icon-open')}
                      />
                    )}
                  </button>
                </PopoverTrigger>

                {activeSpace ? (
                  <button
                    type="button"
                    aria-label="清除 space"
                    className="kg-ghost-icon-btn akm-space-clear-inline"
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
                className="akm-space-popover kg-glass-panel"
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
                        className={cn('akm-space-item', selected && 'akm-space-item-active')}
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
              className={toolButtonClassName(showTagPanel)}
            >
              标签{selectedTags.length > 0 ? ` (${selectedTags.length})` : ''}
            </button>

            <div className="akm-links-anchor">
              <button
                type="button"
                onClick={() => onShowRelatedLinksPanelChange(!showRelatedLinksPanel)}
                className={toolButtonClassName(showRelatedLinksPanel)}
              >
                相关链接{sanitizedRelatedLinks.length > 0 ? ` (${sanitizedRelatedLinks.length})` : ''}
              </button>

              {showRelatedLinksPanel ? (
                <div className="akm-links-panel kg-glass-panel">
                  <RelatedLinksEditor
                    variant="focus"
                    links={relatedLinks}
                    onChange={onRelatedLinkChange}
                    onAdd={onAddRelatedLink}
                    onRemove={onRemoveRelatedLink}
                    title="相关链接"
                    subtitle="标题可选，URL 必填"
                    emptyLabel="添加相关链接"
                  />
                </div>
              ) : null}
            </div>

            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="标题（可选）"
              className="akm-title-input kg-glass-pill"
            />

            {extraTools}
          </div>
        </div>

        <div className="akm-bottom-actions">
          {trailingActions}
          <KnowledgeActionButton
            onClick={onSave}
            disabled={saveDisabled || isSaving}
          >
            {isSaving ? savingLabel : saveLabel}
          </KnowledgeActionButton>
        </div>
      </div>
    </>
  );
};
