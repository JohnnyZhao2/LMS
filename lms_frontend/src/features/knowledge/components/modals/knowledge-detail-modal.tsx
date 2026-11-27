import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Eye, PanelRightClose, PanelRightOpen, PencilLine } from 'lucide-react';

import { useTags } from '@/api/tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { useWorkbench } from '@/hooks/use-workbench';
import { useAuth } from '@/lib/auth';
import { buildDocUrl, sanitizeStepsHtml } from '@/lib/knowledge-content';
import { cn } from '@/lib/utils';
import { showApiError } from '@/utils/error-handler';
import { useKnowledgeDetailEditor } from '../../hooks/use-knowledge-detail-editor';
import { useKnowledgeModalInteractions } from '../../hooks/use-knowledge-modal-interactions';
import { FocusOrbIcon } from '../shared/focus-icon';
import { StepsEditor } from '../shared/steps-editor';
import {
  KnowledgeDetailSidePanel,
  SIDE_PANEL_HEADER_BG_CLASS,
  SIDE_PANEL_SHELL_CLASS,
} from './knowledge-detail-side-panel';

const IFRAME_MODE_BTN_CLASS =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white/[0.92] p-0 text-[#475569] shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-[background-color,color,border-color,box-shadow] duration-150 hover:bg-white hover:text-[#0f172a] hover:shadow-[0_4px_14px_rgba(15,23,42,0.1)]';

export type KnowledgeLearning = {
  isCompleted: boolean;
  isMarking?: boolean;
  onMarkLearned: () => void | Promise<void>;
};

interface KnowledgeDetailModalProps {
  knowledgeId?: number;
  /** 打开时直接全屏专注（仍是同一弹窗） */
  startInFocus?: boolean;
  previewOnly?: boolean;
  initialTitle?: string;
  initialContent?: string;
  initialExternalDocUrl?: string;
  initialSpaceTagId?: number;
  taskKnowledgeId?: number;
  learning?: KnowledgeLearning;
  onClose: () => void;
  onCreated?: (id: number) => void;
  onSelectKnowledge?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  knowledgeId,
  startInFocus = false,
  previewOnly = false,
  initialTitle = '',
  initialContent = '',
  initialExternalDocUrl = '',
  initialSpaceTagId,
  taskKnowledgeId,
  learning,
  onClose,
  onCreated,
  onSelectKnowledge,
  onDelete,
}) => {
  const { hasCapability } = useAuth();
  const workbench = useWorkbench();
  const { data: spaces = [] } = useTags({ tag_type: 'SPACE' });
  const relatedLinksSectionRef = useRef<HTMLDivElement | null>(null);
  const editor = useKnowledgeDetailEditor({
    knowledgeId,
    taskKnowledgeId,
    initialTitle,
    initialContent,
    initialExternalDocUrl,
    initialSpaceTagId,
    spaces,
    relatedLinksSectionRef,
    onClose,
    onCreated,
  });

  const isStudent = workbench === 'learn';
  const canUpdateKnowledge = !previewOnly && workbench === 'manage' && (
    editor.isCreateMode
      ? hasCapability('knowledge.add_knowledge')
      : hasCapability('knowledge.change_knowledge')
  );
  const canDeleteKnowledge = !previewOnly && workbench === 'manage' && !editor.isCreateMode && hasCapability('knowledge.delete_knowledge');
  const canCreateSpace = canUpdateKnowledge && hasCapability('tags.add_tag');
  const shouldShowSystemTagsSection = !isStudent || editor.activeTags.length > 0;

  const [isFocusMode, setIsFocusMode] = useState(startInFocus);
  const [iframeEditMode, setIframeEditMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useKnowledgeModalInteractions({
    onEscape: () => {
      if (editor.showSpaceTags) {
        editor.closeSpaceTags();
      } else if (isFocusMode) {
        setIsFocusMode(false);
      } else if (!editor.isCreateMode && editor.hasChanges) {
        editor.cancelEdit();
      } else {
        onClose();
      }
    },
    onSubmit: () => {
      if (editor.isCreateMode || editor.hasChanges) {
        void editor.save();
      }
    },
  });

  const handleComplete = useCallback(async () => {
    if (!learning) return;
    try {
      await learning.onMarkLearned();
    } catch (error) {
      showApiError(error, '操作失败，请稍后重试');
    }
  }, [learning]);

  const learningAction = (() => {
    if (!learning) return null;
    if (learning.isCompleted) {
      return (
        <div className="flex min-w-[108px] items-center justify-center gap-2 rounded-[6px] border-0 bg-[#e0f5e0] px-3 py-[10px] text-[13px] font-semibold text-[#2d8a2d]">
          <CheckCircle className="h-[14px] w-[14px]" />
          已学习
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => { void handleComplete(); }}
        disabled={learning.isMarking}
        className="inline-flex w-[min(100%,156px)] cursor-pointer items-center justify-center gap-2 rounded-[6px] border-0 bg-[#e8793a] px-3 py-[10px] font-inherit text-[13px] font-semibold text-white transition-[background-color,opacity] duration-180 ease-in-out hover:not-disabled:bg-[#d66b2e] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {learning.isMarking ? '处理中…' : '标记已学习'}
      </button>
    );
  })();

  const iframeSrc = buildDocUrl(
    editor.activeExternalDocUrl,
    iframeEditMode ? 'edit' : 'view',
  );
  // 同文档兄弟知识切换时保持 iframe 实例存活不重刷
  const iframeKey = `${editor.knowledge?.doc_key || iframeSrc}:${iframeEditMode ? 'edit' : 'view'}`;

  const leftPanelBaseClass = cn(
    'flex min-w-0 flex-1 flex-col overflow-hidden bg-white shadow-[0_10px_24px_rgba(21,38,61,0.07)]',
    isFocusMode ? 'rounded-none' : 'rounded-[6px]',
  );

  const modalContent = (
    <div
      className={cn(
        'pointer-events-auto fixed inset-0 z-[45] box-border flex items-center justify-center bg-black/60 [animation:modalFadeIn_0.18s_ease]',
        isFocusMode
          ? 'p-0'
          : 'px-16 py-[52px] max-[1280px]:px-9 max-[1280px]:py-10 max-[860px]:p-3',
      )}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (isFocusMode) {
          setIsFocusMode(false);
          return;
        }
        onClose();
      }}
    >
      <div
        className={cn(
          'relative flex max-h-full max-w-full overflow-hidden transition-[width,height,border-radius,padding] duration-[220ms] ease-in-out [animation:modalPopIn_0.22s_cubic-bezier(0.4,0,0.2,1)]',
          isFocusMode
            ? 'h-dvh w-screen gap-0 rounded-none bg-transparent p-0 shadow-none'
            : 'h-[calc(100dvh-104px)] w-[calc(100vw-128px)] gap-2 rounded-[12px] bg-[#f1f3f6] p-2 shadow-[0_40px_100px_rgba(0,0,0,0.35)] max-[1280px]:h-[calc(100dvh-80px)] max-[1280px]:w-[calc(100vw-72px)] max-[860px]:h-[calc(100dvh-24px)] max-[860px]:w-full max-[860px]:flex-col max-[860px]:gap-[6px] max-[860px]:p-[6px] max-[640px]:rounded-[10px]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={cn(
            'absolute top-[14px] left-4 z-20 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#7c8794] transition-transform duration-180 ease-in-out hover:-translate-y-px',
            'after:pointer-events-none after:absolute after:top-1/2 after:left-[calc(100%+12px)] after:-translate-x-[2px] after:-translate-y-1/2 after:rounded-full after:bg-[rgba(243,245,248,0.96)] after:px-6 after:py-[10px] after:text-[17px] after:leading-none after:font-medium after:whitespace-nowrap after:text-[#22252b] after:opacity-0 after:shadow-[0_10px_28px_rgba(15,23,42,0.1)] after:transition-[opacity,transform] after:duration-160 after:ease-in-out after:content-[attr(data-tip)] hover:after:translate-x-0 hover:after:opacity-100',
          )}
          data-tip={isFocusMode ? '退出专注' : '专注'}
          title={isFocusMode ? '退出专注' : '专注'}
          aria-label={isFocusMode ? '退出专注' : '专注'}
          onClick={() => setIsFocusMode((v) => !v)}
        >
          <FocusOrbIcon size={20} interactive />
        </button>

        {!editor.isCreateMode && editor.isLoading ? (
          <>
            <div className={leftPanelBaseClass}>
              <Skeleton className="mb-8 h-10 w-3/4" />
              <Skeleton className="mb-4 h-5 w-full" />
            </div>
            <div
              className={cn(
                SIDE_PANEL_SHELL_CLASS,
                isFocusMode ? 'rounded-none' : 'rounded-[6px]',
              )}
            >
              <div className={cn(SIDE_PANEL_HEADER_BG_CLASS, 'px-5 pt-[22px] pb-4')}>
                <Skeleton className="mb-3 h-6 w-full" />
              </div>
            </div>
          </>
        ) : !editor.knowledge ? (
          <div className={cn(leftPanelBaseClass, 'items-center justify-center')}>
            <p className="text-[15px] text-[#aaa] italic">知识文档不存在</p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                leftPanelBaseClass,
                editor.activeExternalDocUrl ? 'relative p-0' : 'overflow-y-auto px-9 py-7',
              )}
            >
              {editor.activeExternalDocUrl ? (
                <>
                  <iframe
                    key={iframeKey}
                    src={iframeSrc}
                    title={editor.activeTitle || '知识文档'}
                    className="h-full w-full flex-1 border-0 bg-[#fafafa]"
                    allow="clipboard-read; clipboard-write"
                  />
                  <div className="absolute top-3 right-3 z-[2] flex items-center gap-[6px]">
                    {canUpdateKnowledge && (
                      <Tooltip title={iframeEditMode ? '查看模式' : '编辑文档'} side="bottom">
                        <button
                          type="button"
                          aria-label={iframeEditMode ? '查看模式' : '编辑文档'}
                          className={cn(
                            IFRAME_MODE_BTN_CLASS,
                            iframeEditMode && 'border-[rgba(37,99,235,0.28)] bg-[#eff6ff] text-[var(--theme-primary,#2563eb)]',
                          )}
                          onClick={() => setIframeEditMode((v) => !v)}
                        >
                          {iframeEditMode ? (
                            <Eye className="h-4 w-4" strokeWidth={1.8} />
                          ) : (
                            <PencilLine className="h-4 w-4" strokeWidth={1.8} />
                          )}
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip title={sidebarCollapsed ? '展开信息栏' : '收起信息栏'} side="bottom">
                      <button
                        type="button"
                        aria-label={sidebarCollapsed ? '展开信息栏' : '收起信息栏'}
                        className={IFRAME_MODE_BTN_CLASS}
                        onClick={() => setSidebarCollapsed((v) => !v)}
                      >
                        {sidebarCollapsed ? (
                          <PanelRightOpen className="h-4 w-4" strokeWidth={1.8} />
                        ) : (
                          <PanelRightClose className="h-4 w-4" strokeWidth={1.8} />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                </>
              ) : canUpdateKnowledge ? (
                <div className="mx-auto w-full max-w-[820px] flex-1">
                  <StepsEditor
                    value={editor.activeContent}
                    onChange={editor.setContent}
                    onBlur={editor.blurContent}
                    placeholder="在这里填写知识内容…"
                    editorClassName="text-[18px] leading-[1.75]"
                    minHeight={280}
                  />
                </div>
              ) : editor.activeContent ? (
                <div
                  className="mx-auto w-full max-w-[820px] flex-1 text-[18px] leading-[1.75] text-[#333] break-words whitespace-pre-wrap [&_b]:font-bold [&_b]:text-[#111] [&_strong]:font-bold [&_strong]:text-[#111]"
                  dangerouslySetInnerHTML={{ __html: sanitizeStepsHtml(editor.activeContent) }}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center text-[14px] text-[#9aa0aa]">暂无内容</div>
              )}
            </div>

            {!sidebarCollapsed && (
              <KnowledgeDetailSidePanel
                editor={editor}
                spaces={spaces}
                isFocusMode={isFocusMode}
                canUpdateKnowledge={canUpdateKnowledge}
                canCreateSpace={canCreateSpace}
                canDeleteKnowledge={canDeleteKnowledge}
                shouldShowSystemTagsSection={shouldShowSystemTagsSection}
                learningAction={learningAction}
                relatedLinksSectionRef={relatedLinksSectionRef}
                onSelectKnowledge={onSelectKnowledge}
                onDelete={() => {
                  onDelete?.(knowledgeId!);
                  onClose();
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
