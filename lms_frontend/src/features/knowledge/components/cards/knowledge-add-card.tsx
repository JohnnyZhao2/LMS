import * as React from 'react';
import { FocusOrbIcon } from '../shared/focus-icon';
import { StepsEditor } from '../shared/steps-editor';
import { plain } from '@/lib/knowledge-content';
import { cn } from '@/lib/utils';

const CARD_INPUT_CLASS =
  'mb-2 w-full border-0 border-b border-black/[0.08] bg-transparent pt-1 pb-2 font-inherit text-[12px] text-[#555] outline-none';

interface AddKnowledgeCardProps {
  onSave: (payload: { title: string; externalDocUrl: string; content: string }) => Promise<void> | void;
  onExpand: (payload: { title: string; externalDocUrl: string; content: string }) => void;
  isSaving?: boolean;
}

/**
 * 瀑布流快速新建：标题 + 文档链接 + 步骤；展开进弹窗 / 直接保存
 */
export const AddKnowledgeCard: React.FC<AddKnowledgeCardProps> = ({
  onSave,
  onExpand,
  isSaving = false,
}) => {
  const [title, setTitle] = React.useState('');
  const [externalDocUrl, setExternalDocUrl] = React.useState('');
  const [content, setContent] = React.useState('');

  const canSave = Boolean(title.trim() || externalDocUrl.trim() || plain(content));
  const draft = () => ({ title: title.trim(), externalDocUrl: externalDocUrl.trim(), content });

  const reset = () => {
    setTitle('');
    setExternalDocUrl('');
    setContent('');
  };

  const saveDraft = async () => {
    if (isSaving || !canSave) return;
    try {
      await onSave(draft());
      reset();
    } catch {
      // 保留草稿
    }
  };

  return (
    <div className="relative [break-inside:avoid]">
      <div className="relative rounded-[7px] bg-white px-5 py-[18px] [box-shadow:0_2px_8px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] transition-[box-shadow] duration-[200ms] hover:[box-shadow:0_14px_24px_rgba(0,0,0,0.13),10px_14px_24px_rgba(0,0,0,0.10)] focus-within:[box-shadow:0_14px_24px_rgba(0,0,0,0.13),10px_14px_24px_rgba(0,0,0,0.10)]">
        <button
          type="button"
          className="absolute top-[10px] right-[10px] z-[2] flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            onExpand({ title, externalDocUrl, content });
          }}
          title="展开"
          aria-label="展开"
        >
          <FocusOrbIcon size={16} interactive />
        </button>

        <p className="m-0 mb-[10px] text-[10.5px] font-bold tracking-[0.1em] text-[#e8793a] uppercase">添加知识</p>
        <input
          className={cn(CARD_INPUT_CLASS, 'text-[15px] font-semibold text-[#111]')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
        />
        <input
          className={CARD_INPUT_CLASS}
          value={externalDocUrl}
          onChange={(e) => setExternalDocUrl(e.target.value)}
          placeholder="文档链接（可选）"
        />
        <StepsEditor value={content} onChange={setContent} minHeight={48} />

        {canSave && (
          <button
            type="button"
            className="mt-3 w-full cursor-pointer rounded-[6px] border-0 bg-[#e8793a] py-[10px] font-inherit text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onMouseDown={(e) => {
              e.preventDefault();
              void saveDraft();
            }}
          >
            {isSaving ? '保存中…' : '保存'}
          </button>
        )}
      </div>
    </div>
  );
};
