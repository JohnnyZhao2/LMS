import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Circle, Link as LinkIcon, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateTag } from '@/api/tags';
import { TagAssignmentSection } from '@/components/tags/tag-assignment-section';
import { ScrollContainer } from '@/components/ui/scroll-container';
import { Tooltip } from '@/components/ui/tooltip';
import dayjs from '@/lib/dayjs';
import { parseMultiValueExtraField, sanitizeStepsHtml } from '@/lib/knowledge-content';
import { cn } from '@/lib/utils';
import type { SimpleTag } from '@/types/common';
import { showApiError } from '@/utils/error-handler';
import type { KnowledgeDetailEditor } from '../../hooks/use-knowledge-detail-editor';
import { getRelatedLinkDisplayText } from '../../utils/related-links';
import {
  GHOST_ICON_BTN_CLASS,
  RelatedLinksEditor,
  UNDERLINE_INPUT_CLASS,
} from '../shared/related-links-editor';
import { SpacePickerList } from '../shared/space-picker-list';
import { StepsEditor } from '../shared/steps-editor';

export const SIDE_PANEL_SHELL_CLASS =
  'relative flex w-[clamp(320px,20.5vw,390px)] shrink-0 flex-col overflow-hidden bg-[#eef2f6] shadow-[0_10px_24px_rgba(21,38,61,0.08)] max-[1360px]:w-[340px] max-[1100px]:w-[310px] max-[860px]:max-h-[min(340px,44dvh)] max-[860px]:w-full';
export const SIDE_PANEL_HEADER_BG_CLASS =
  'bg-[linear-gradient(160deg,#dce4ee_0%,#eef0f3_100%)]';
const SECTION_LABEL_CLASS = 'm-0 mb-[6px] text-[12px] font-semibold tracking-[0.04em] text-[#95a0ae]';
const SECTION_HEADER_CLASS = 'mb-[6px] flex items-center justify-between gap-3';
const SECTION_HOVER_ACTIONS_CLASS =
  'flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover/section:opacity-100 group-focus-within/section:opacity-100';
const SECTION_ADD_BTN_CLASS = cn(
  GHOST_ICON_BTN_CLASS,
  'h-[20px] w-[20px] shrink-0',
);
const RELATED_LINK_CLASS =
  'flex min-w-0 items-center gap-2 text-[13.5px] text-[#556476] no-underline transition-colors duration-150 ease-in-out hover:text-[#e85d2a]';
const CIRCLE_ACTION_BTN_CLASS =
  'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-white p-0 font-inherit text-[#9aa0aa] shadow-[0_1px_4px_rgba(15,23,42,0.06)] transition-all duration-150 hover:text-[#555]';

function relTime(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return '今天';
  if (d === 1) return '昨天';
  if (d < 30) return `${d} 天前`;
  return `${Math.floor(d / 30)} 个月前`;
}

interface KnowledgeDetailSidePanelProps {
  editor: KnowledgeDetailEditor;
  spaces: SimpleTag[];
  canUpdateKnowledge: boolean;
  canDeleteKnowledge: boolean;
  canCreateSpace: boolean;
  shouldShowSystemTagsSection: boolean;
  isFocusMode: boolean;
  learningAction: ReactNode;
  relatedLinksSectionRef: RefObject<HTMLDivElement | null>;
  onSelectKnowledge?: (id: number) => void;
  onDelete?: () => void;
}

export const KnowledgeDetailSidePanel: React.FC<KnowledgeDetailSidePanelProps> = ({
  editor,
  spaces,
  canUpdateKnowledge,
  canDeleteKnowledge,
  canCreateSpace,
  shouldShowSystemTagsSection,
  isFocusMode,
  learningAction,
  relatedLinksSectionRef,
  onSelectKnowledge,
  onDelete,
}) => {
  const { knowledge } = editor;
  const [docUrlEditing, setDocUrlEditing] = useState(false);
  const [editingExtraIndex, setEditingExtraIndex] = useState<number | null>(null);
  const [editingExtraFocusTarget, setEditingExtraFocusTarget] = useState<'label' | 'value'>('value');
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [dirFilter, setDirFilter] = useState('');
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const summaryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const directoryPopoverRef = useRef<HTMLDivElement | null>(null);
  const createTag = useCreateTag();

  useEffect(() => {
    setDocUrlEditing(false);
    setEditingExtraIndex(null);
    setDirectoryOpen(false);
    setDirFilter('');
  }, [knowledge?.id]);

  // 标题与针对故障输入框随内容及栏宽变化自动重算高度，不截断也不留多余空行
  useEffect(() => {
    const el = titleTextareaRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [editor.activeTitle, knowledge?.id]);

  useEffect(() => {
    const el = summaryTextareaRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [editor.activeSummary, knowledge?.id]);

  // 目录浮层点击外部或按 Esc 自动收起
  useEffect(() => {
    if (!directoryOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (directoryPopoverRef.current && !directoryPopoverRef.current.contains(event.target as Node)) {
        setDirectoryOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setDirectoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [directoryOpen]);

  const docSiblings = knowledge?.doc_siblings ?? [];
  const hasDocSiblings = docSiblings.length > 1 && Boolean(onSelectKnowledge);
  const activeSiblingIndex = useMemo(
    () => (knowledge ? Math.max(0, docSiblings.findIndex((s) => s.id === knowledge.id)) : 0),
    [docSiblings, knowledge],
  );
  const prevSibling = activeSiblingIndex > 0 ? docSiblings[activeSiblingIndex - 1] : null;
  const nextSibling = activeSiblingIndex < docSiblings.length - 1 ? docSiblings[activeSiblingIndex + 1] : null;

  const groupedDirectory = useMemo(() => {
    const q = dirFilter.trim().toLowerCase();
    const filtered = docSiblings.filter((s) => (
      !q
      || s.title.toLowerCase().includes(q)
      || (s.section ?? '').toLowerCase().includes(q)
    ));
    const map = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const key = (item.section || '').trim();
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries());
  }, [dirFilter, docSiblings]);
  const showDirectoryGroupHeaders = groupedDirectory.length > 1 || Boolean(groupedDirectory[0]?.[0]);

  if (!knowledge) return null;

  const handleCreateSpace = async ({ name, color }: { name: string; color: string }) => {
    try {
      const created = await createTag.mutateAsync({
        name,
        tag_type: 'SPACE',
        color,
      });
      await editor.selectSpaceTag(created.id);
      toast.success('空间已添加');
    } catch (error) {
      showApiError(error, '添加空间失败');
    }
  };

  const hasDocUrl = Boolean(editor.activeExternalDocUrl.trim());
  const showDocUrlField = hasDocUrl || docUrlEditing;
  const showStepsInSidebar = hasDocUrl;
  const showSaveActions = canUpdateKnowledge && (editor.isCreateMode || editor.hasChanges);
  const updatedRelativeTime = editor.isCreateMode ? '新建' : relTime(knowledge.updated_at);
  const authorName = knowledge.updated_by_name || knowledge.created_by_name;
  const updatedExactTime = dayjs(knowledge.updated_at).format('YYYY-MM-DD HH:mm');
  const currentSpace = spaces.find((s) => s.id === editor.activeSpaceTagId) ?? knowledge.space_tag;

  const spaceSwitchButton = (
    <button
      type="button"
      onClick={editor.toggleSpaceTags}
      className={CIRCLE_ACTION_BTN_CLASS}
      title={currentSpace ? `切换空间（当前：${currentSpace.name}）` : '切换空间'}
    >
      <Circle className="h-[17px] w-[17px]" strokeWidth={1.8} />
    </button>
  );

  return (
    <div
      className={cn(
        SIDE_PANEL_SHELL_CLASS,
        isFocusMode ? 'rounded-none' : 'rounded-[6px]',
      )}
    >
      {/* 统一柔和渐变抬头：单层纯粹标题 + 元信息，多场景时原地切换无切页割裂 */}
      <div
        ref={directoryPopoverRef}
        className={cn(SIDE_PANEL_HEADER_BG_CLASS, 'relative shrink-0 px-6 pt-5 pb-3.5')}
      >
        {canUpdateKnowledge ? (
          <textarea
            ref={titleTextareaRef}
            rows={1}
            value={editor.activeTitle}
            onChange={(e) => editor.setTitle(e.target.value)}
            onBlur={editor.blurTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            placeholder="标题"
            className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-inherit text-[20px] leading-[1.38] font-medium text-[#465566] outline-none placeholder:text-[#b4bcc6]"
          />
        ) : (
          <h2 className="m-0 text-[20px] leading-[1.38] font-medium text-[#465566]">
            {editor.activeTitle || '未命名知识'}
          </h2>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          {editor.isCreateMode || knowledge.id <= 0 ? (
            <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-[#94a0ae]">
              <span>新建</span>
            </div>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-[5px] text-[12.5px] leading-[1.4] text-[#94a0ae]">
              {authorName && (
                <>
                  <Tooltip title={authorName} side="bottom">
                    <span className="max-w-[96px] truncate">{authorName}</span>
                  </Tooltip>
                  <span className="text-[#c0c8d2]" aria-hidden="true">·</span>
                </>
              )}
              <Tooltip title={`更新于 ${updatedExactTime}`} side="bottom">
                <span>{updatedRelativeTime}</span>
              </Tooltip>
              <span className="text-[#c0c8d2]" aria-hidden="true">·</span>
              <span>{knowledge.view_count ?? 0} 次阅读</span>
            </div>
          )}

          {/* 同文档场景原地切换器：< 4 / 28 ⌄ >（无外层套娃胶囊） */}
          {hasDocSiblings && (
            <div className="flex shrink-0 items-center gap-0.5 text-[#7a8797]">
              <button
                type="button"
                disabled={!prevSibling}
                onClick={() => prevSibling && onSelectKnowledge?.(prevSibling.id)}
                title={prevSibling ? `上一条：${prevSibling.title}` : '已是第一条'}
                aria-label="上一条场景"
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-inherit transition-colors hover:bg-black/[0.05] hover:text-[#2c3846] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setDirectoryOpen((v) => !v)}
                aria-expanded={directoryOpen}
                title={`选择同文档场景（共 ${docSiblings.length} 条）`}
                className={cn(
                  'inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border-0 bg-transparent px-2 text-[12px] leading-none font-medium tabular-nums text-[#5c6b7c] transition-all hover:bg-black/[0.05] hover:text-[#2c3846]',
                  directoryOpen && 'bg-white text-[#2c3846] shadow-[0_1px_4px_rgba(15,23,42,0.08)] hover:bg-white',
                )}
              >
                <span>{activeSiblingIndex + 1} / {docSiblings.length}</span>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 text-[#8a96a5] transition-transform duration-150',
                    directoryOpen && 'rotate-180 text-[#334155]',
                  )}
                  strokeWidth={2}
                />
              </button>
              <button
                type="button"
                disabled={!nextSibling}
                onClick={() => nextSibling && onSelectKnowledge?.(nextSibling.id)}
                title={nextSibling ? `下一条：${nextSibling.title}` : '已是最后一条'}
                aria-label="下一条场景"
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-inherit transition-colors hover:bg-black/[0.05] hover:text-[#2c3846] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {/* 原地场景目录浮层（直接在信息面板上点选，不跳页、不打断详情上下文） */}
        {hasDocSiblings && directoryOpen && (
          <div className="absolute inset-x-4 top-[calc(100%-6px)] z-30 flex max-h-[58vh] flex-col overflow-hidden rounded-[10px] border border-black/[0.08] bg-white/[0.97] shadow-[0_14px_38px_rgba(15,23,42,0.16)] backdrop-blur-md">
            {docSiblings.length > 6 && (
              <div className="shrink-0 px-3 pt-3 pb-1.5">
                <input
                  value={dirFilter}
                  onChange={(e) => setDirFilter(e.target.value)}
                  placeholder={`在 ${docSiblings.length} 条场景中筛选…`}
                  className="w-full rounded-[7px] border border-black/[0.08] bg-[#f6f8fb] px-3 py-1.5 text-[13px] text-[#1f2937] outline-none focus:border-primary/50 focus:bg-white"
                  autoFocus
                />
              </div>
            )}
            <ScrollContainer className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {groupedDirectory.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-[#9aa3af]">无匹配场景</div>
              ) : (
                <div className="space-y-2.5">
                  {groupedDirectory.map(([sec, rows]) => (
                    <div key={sec || 'default'}>
                      {showDirectoryGroupHeaders && (
                        <div className="mb-1 px-2.5 text-[11px] font-semibold text-[#8f9aa8]">
                          {sec || '同文档场景'} · {rows.length}
                        </div>
                      )}
                      <div className="space-y-0.5">
                        {rows.map((row) => {
                          const isCurrent = row.id === knowledge.id;
                          return (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => {
                                setDirectoryOpen(false);
                                onSelectKnowledge?.(row.id);
                              }}
                              className={cn(
                                'flex w-full cursor-pointer items-start justify-between gap-2 rounded-[7px] border-0 px-2.5 py-2 text-left text-[13px] leading-[1.45] transition-colors',
                                isCurrent
                                  ? 'bg-[#eef2f6] font-medium text-[#1f2937]'
                                  : 'bg-transparent text-[#4b5868] hover:bg-[#f4f6f9]',
                              )}
                            >
                              <span className="min-w-0 flex-1 break-words">{row.title}</span>
                              {isCurrent && (
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e87040]" strokeWidth={2.2} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollContainer>
          </div>
        )}
      </div>

      {/* 信息详情主体 */}
      <>
          <ScrollContainer className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pt-3.5 pb-4">
            {/* 1. 核心速览框（Mymind TLDR 风格：标题嵌入左上角边框缺口、透明同色底、小圆角细框） */}
            {(canUpdateKnowledge || editor.activeSummary || showStepsInSidebar) && (
              <div className="relative mt-1 rounded-[6px] border-[1.5px] border-[#dbe2ea] bg-transparent px-4 pt-3.5 pb-3">
                <span className="pointer-events-none absolute -top-[9px] -left-[2px] bg-[#eef2f6] pr-2.5 pb-[3px] text-[12px] leading-none font-medium tracking-[0.06em] text-[#e87c5d]">
                  速览
                </span>
                <div className="space-y-3">
                  {(canUpdateKnowledge || editor.activeSummary) && (
                    <div>
                      <p className="m-0 mb-1 text-[11.5px] font-medium text-[#9aa5b4]">针对故障</p>
                      {canUpdateKnowledge ? (
                        <textarea
                          ref={summaryTextareaRef}
                          rows={1}
                          value={editor.activeSummary}
                          onChange={(e) => editor.setSummary(e.target.value)}
                          onBlur={editor.blurSummary}
                          placeholder="填写针对故障或适用场景…"
                          className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-inherit text-[14px] leading-[1.68] text-[#637182] outline-none placeholder:text-[#b4bcc6]"
                        />
                      ) : (
                        <p className="m-0 text-[14px] leading-[1.68] break-words whitespace-pre-wrap text-[#637182]">
                          {editor.activeSummary}
                        </p>
                      )}
                    </div>
                  )}

                  {showStepsInSidebar && (
                    <div>
                      <p className="m-0 mb-1 text-[11.5px] font-medium text-[#9aa5b4]">步骤摘要</p>
                      {canUpdateKnowledge ? (
                        <StepsEditor
                          value={editor.activeContent}
                          onChange={editor.setContent}
                          onBlur={editor.blurContent}
                          minHeight={28}
                          editorClassName="text-[14px] leading-[1.72] text-[#637182] [&_b]:font-semibold [&_b]:text-[#3c4a5a] [&_strong]:font-semibold [&_strong]:text-[#3c4a5a]"
                        />
                      ) : editor.activeContent ? (
                        <div
                          className="text-[14px] leading-[1.72] text-[#637182] break-words whitespace-pre-wrap [&_b]:font-semibold [&_b]:text-[#3c4a5a] [&_strong]:font-semibold [&_strong]:text-[#3c4a5a]"
                          dangerouslySetInnerHTML={{ __html: sanitizeStepsHtml(editor.activeContent) }}
                        />
                      ) : (
                        <p className="m-0 text-[13px] leading-[1.5] text-[#9aa3af]">暂无</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. 标签（统一右上角 + 添加，智能按行装箱补位 + 无遮挡自然渐隐） */}
            {shouldShowSystemTagsSection && (
              <div className="group/section">
                <TagAssignmentSection
                  applicableTo="knowledge"
                  title="标签"
                  canEdit={canUpdateKnowledge}
                  selectedTags={editor.activeTags}
                  expanded={editor.showTagInput}
                  onExpandedChange={editor.setShowTagInput}
                  onAdd={editor.addTag}
                  onRemove={editor.removeTag}
                  activeGroupTagName={editor.activeSection}
                  onToggleGroupTag={editor.toggleSectionTag}
                  collapseFadeColor="#eef2f6"
                  collapsedMaxHeight={106}
                  className="mb-0"
                  labelClassName={cn(SECTION_LABEL_CLASS, 'mb-0')}
                  headerClassName="mb-[2px] flex items-center justify-between gap-3"
                  addButtonClassName={cn(
                    SECTION_ADD_BTN_CLASS,
                    'opacity-0 transition-opacity duration-150 group-hover/section:opacity-100 group-focus-within/section:opacity-100',
                  )}
                  tagsWrapClassName="flex flex-wrap items-center gap-[6px]"
                  tagClassName="inline-flex max-w-full items-center gap-[5px] rounded-full bg-[#e2e7ee] px-3 py-[5.5px] text-[12.5px] leading-[1.2] text-[#566577]"
                />
              </div>
            )}

            {/* 3. 其余信息（自适应 2 列栅格，点击单项原地编辑、失焦/回车自动保存，右上角统一仅保留 +） */}
            {(canUpdateKnowledge || editor.activeExtraFields.length > 0) && (
              <div className="group/section">
                <div className={SECTION_HEADER_CLASS}>
                  <p className={cn(SECTION_LABEL_CLASS, 'mb-0')}>其余信息</p>
                  {canUpdateKnowledge && (
                    <div className={SECTION_HOVER_ACTIONS_CLASS}>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIndex = editor.activeExtraFields.length;
                          editor.addExtraField();
                          setEditingExtraFocusTarget('label');
                          setEditingExtraIndex(nextIndex);
                        }}
                        className={SECTION_ADD_BTN_CLASS}
                        aria-label="添加其余信息"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {editor.activeExtraFields.length > 0 ? (
                  <dl className="m-0 space-y-2.5">
                    {editor.activeExtraFields.map((field, index) => {
                      const isEditingItem = canUpdateKnowledge && editingExtraIndex === index;
                      if (isEditingItem) {
                        return (
                          <div
                            key={`extra-edit-${index}`}
                            className="flex items-center gap-2"
                            onBlur={(event) => {
                              if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                return;
                              }
                              editor.blurExtraFields();
                              setEditingExtraIndex(null);
                            }}
                          >
                            <input
                              value={field.label}
                              onChange={(e) => editor.changeExtraField(index, 'label', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  e.preventDefault();
                                  editor.blurExtraFields();
                                  setEditingExtraIndex(null);
                                }
                              }}
                              placeholder="字段名"
                              autoFocus={editingExtraFocusTarget === 'label'}
                              className={cn(UNDERLINE_INPUT_CLASS, 'w-[76px] shrink-0 text-[13.5px]')}
                            />
                            <input
                              value={field.value}
                              onChange={(e) => editor.changeExtraField(index, 'value', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  e.preventDefault();
                                  editor.blurExtraFields();
                                  setEditingExtraIndex(null);
                                }
                              }}
                              placeholder="内容"
                              autoFocus={editingExtraFocusTarget === 'value'}
                              className={cn(UNDERLINE_INPUT_CLASS, 'min-w-0 flex-1 text-[13.5px]')}
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                editor.removeExtraField(index);
                                setEditingExtraIndex(null);
                              }}
                              className={cn(GHOST_ICON_BTN_CLASS, 'h-6 w-6 shrink-0')}
                              aria-label="删除属性"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      }

                      const multiItems = parseMultiValueExtraField(field.value);
                      return (
                        <div
                          key={`extra-view-${index}`}
                          onClick={
                            canUpdateKnowledge
                              ? () => {
                                  setEditingExtraFocusTarget('value');
                                  setEditingExtraIndex(index);
                                }
                              : undefined
                          }
                          title={canUpdateKnowledge ? '点击编辑' : undefined}
                          className={cn(
                            'grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-3 rounded-[5px] transition-colors',
                            canUpdateKnowledge && 'cursor-text hover:text-[#1f2937]',
                          )}
                        >
                          <dt className="truncate text-[13.5px] leading-[1.55] text-[#8f9aa8]" title={field.label}>
                            {field.label}
                          </dt>
                          <dd className="m-0 text-[13.5px] leading-[1.55] break-words text-[#465566]">
                            {multiItems ? multiItems.join(' · ') : field.value}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                ) : null}
              </div>
            )}

            {/* 4. 链接（Hover 显操作，舒朗清晰） */}
            {(canUpdateKnowledge || hasDocUrl || editor.activeRelatedLinks.length > 0) && (
              <div className="group/section" ref={relatedLinksSectionRef}>
                <div className={SECTION_HEADER_CLASS}>
                  <p className={cn(SECTION_LABEL_CLASS, 'mb-0')}>链接</p>
                  {canUpdateKnowledge && (
                    <div
                      className={cn(
                        SECTION_HOVER_ACTIONS_CLASS,
                        (docUrlEditing || editor.editingLinks) && 'opacity-100',
                      )}
                    >
                      {!showDocUrlField && (
                        <button
                          type="button"
                          onClick={() => {
                            editor.setExternalDocUrl('');
                            setDocUrlEditing(true);
                          }}
                          className="cursor-pointer border-0 bg-transparent px-1 py-0.5 text-[12px] text-[#8f9aa8] transition-colors hover:text-[#334155]"
                        >
                          原文档
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (editor.editingLinks) {
                            editor.addRelatedLink();
                            return;
                          }
                          editor.openRelatedLinksEditor(editor.activeRelatedLinks.length === 0);
                        }}
                        className={SECTION_ADD_BTN_CLASS}
                        aria-label="添加相关链接"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {/* 文档链接 */}
                  {canUpdateKnowledge && docUrlEditing ? (
                    <div className="flex items-center gap-[6px]">
                      <input
                        value={editor.activeExternalDocUrl}
                        onChange={(e) => editor.setExternalDocUrl(e.target.value)}
                        onBlur={() => {
                          editor.blurExternalDocUrl();
                          setDocUrlEditing(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                        placeholder="原文档链接 https://..."
                        className={cn(UNDERLINE_INPUT_CLASS, 'flex-1')}
                        autoFocus
                      />
                      <button
                        type="button"
                        className={cn(GHOST_ICON_BTN_CLASS, 'h-7 w-7')}
                        title="移除文档链接"
                        aria-label="移除文档链接"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setDocUrlEditing(false);
                          editor.clearExternalDocUrl();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : hasDocUrl ? (
                    canUpdateKnowledge ? (
                      <button
                        type="button"
                        title={editor.activeExternalDocUrl}
                        className={cn(RELATED_LINK_CLASS, 'w-full cursor-pointer border-0 bg-transparent p-0 text-left')}
                        onClick={() => {
                          editor.setExternalDocUrl(editor.activeExternalDocUrl);
                          setDocUrlEditing(true);
                        }}
                      >
                        <LinkIcon className="h-[14.5px] w-[14.5px] shrink-0 text-[#9aa3af]" />
                        <span className="min-w-0 truncate text-[13.5px] leading-[1.45] text-inherit">
                          原文档链接
                        </span>
                      </button>
                    ) : (
                      <a
                        href={editor.activeExternalDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={editor.activeExternalDocUrl}
                        className={RELATED_LINK_CLASS}
                      >
                        <LinkIcon className="h-[14.5px] w-[14.5px] shrink-0 text-[#9aa3af]" />
                        <span className="min-w-0 truncate text-[13.5px] leading-[1.45] text-inherit">
                          打开原文档
                        </span>
                      </a>
                    )
                  ) : null}

                  {/* 相关链接 */}
                  {canUpdateKnowledge && editor.editingLinks ? (
                    <RelatedLinksEditor
                      links={editor.activeRelatedLinks}
                      onChange={editor.changeRelatedLink}
                      onRemove={editor.removeRelatedLink}
                      onSubmit={editor.blurRelatedLinks}
                      titlePlaceholder="链接名称"
                      urlPlaceholder="https://..."
                    />
                  ) : editor.activeRelatedLinks.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {editor.activeRelatedLinks.map((link, index) => (
                        <a
                          key={`detail-link-view-${index}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={RELATED_LINK_CLASS}
                        >
                          <LinkIcon className="h-[14.5px] w-[14.5px] shrink-0 text-[#9aa3af]" />
                          <span className="min-w-0 truncate text-[13.5px] leading-[1.45] text-inherit">
                            {getRelatedLinkDisplayText(link)}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="flex-1" />
          </ScrollContainer>

          <div className="relative flex shrink-0 items-center justify-center px-6 pt-3 pb-5">
            {editor.showSpaceTags && (
              <div className="absolute inset-x-6 bottom-[calc(100%+8px)] z-10 overflow-hidden rounded-[6px] bg-white shadow-[0_-4px_28px_rgba(0,0,0,0.13)]">
                <SpacePickerList
                  spaces={spaces}
                  selectedSpaceId={editor.activeSpaceTagId}
                  canCreate={canCreateSpace}
                  disabled={editor.isSaving || createTag.isPending}
                  onSelect={(spaceId) => {
                    if (spaceId !== null) void editor.selectSpaceTag(spaceId);
                  }}
                  onCreate={handleCreateSpace}
                />
              </div>
            )}

            {showSaveActions ? (
              <div className="flex items-center gap-7 max-[860px]:gap-[18px]">
                {spaceSwitchButton}
                <button
                  type="button"
                  onClick={editor.cancelOrClose}
                  disabled={editor.isSaving}
                  className={cn(CIRCLE_ACTION_BTN_CLASS, 'text-[#9aa3af]')}
                  title={editor.isCreateMode ? '取消' : '取消编辑'}
                  aria-label={editor.isCreateMode ? '取消' : '取消编辑'}
                >
                  <X className="h-[17px] w-[17px]" strokeWidth={1.9} />
                </button>
                <button
                  type="button"
                  onClick={() => { void editor.save(); }}
                  disabled={!editor.hasChanges || editor.isSaving}
                  className={cn(
                    CIRCLE_ACTION_BTN_CLASS,
                    'text-[#9aa3af] disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                  title={editor.isSaving ? '保存中…' : '保存'}
                  aria-label={editor.isSaving ? '保存中' : '保存'}
                >
                  <Check className="h-[17px] w-[17px]" strokeWidth={1.9} />
                </button>
              </div>
            ) : learningAction ? (
              <div className="flex w-full items-center justify-center">{learningAction}</div>
            ) : (
              <div className="flex items-center gap-7 max-[860px]:gap-[18px]">
                {canUpdateKnowledge && spaceSwitchButton}
                {canDeleteKnowledge && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className={cn(CIRCLE_ACTION_BTN_CLASS, 'hover:text-[#e44]')}
                    title="删除"
                  >
                    <Trash2 className="h-[17px] w-[17px]" />
                  </button>
                )}
              </div>
            )}
          </div>
      </>
    </div>
  );
};
