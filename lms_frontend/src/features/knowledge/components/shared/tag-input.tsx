import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { showApiError } from '@/utils/error-handler';
import { useTags } from '@/features/tags/api/tags';
import { useCreateTag } from '@/features/tags/api/tags';

interface TagInputProps {
  applicableTo: 'knowledge' | 'question';
  selectedTags: { id: number; name?: string }[];
  onAdd: (tag: { id: number; name: string }) => void;
  onRemove: (tagId: number) => void;
  /** 不显示已选标签 chips（由外部渲染） */
  hideChips?: boolean;
  extendScope?: boolean;
}

export const TagInput: React.FC<TagInputProps> = ({
  applicableTo,
  selectedTags,
  onAdd,
  onRemove,
  hideChips = false,
  extendScope = true,
}) => {
  const [input, setInput] = React.useState('');
  const { data: scopedTags = [] } = useTags({ tag_type: 'TAG', applicable_to: applicableTo });
  const createTag = useCreateTag();
  const trimmedInput = input.trim();

  // 输入时匹配的已有标签（排除已选）
  const matchedTags = trimmedInput
    ? scopedTags.filter(
        (t) =>
          !selectedTags.some((s) => s.id === t.id) &&
          t.name.toLowerCase().includes(trimmedInput.toLowerCase())
      ).slice(0, 6)
    : [];

  // 没有输入时显示最近标签
  const recentTags = !trimmedInput
    ? scopedTags
        .filter((t) => !selectedTags.some((s) => s.id === t.id))
        .slice(0, 5)
    : [];

  const handleAdd = async () => {
    const name = trimmedInput;
    if (!name) return;

    // 精确匹配已有标签
    const exact = scopedTags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (exact) {
      if (selectedTags.some((s) => s.id === exact.id)) {
        toast.info('标签已添加');
      } else {
        onAdd({ id: exact.id, name: exact.name });
      }
      setInput('');
      return;
    }

    // 统一入口：新建 / 同名复用 / 扩展范围
    try {
      const resolvedTag = await createTag.mutateAsync({
        name,
        tag_type: 'TAG',
        current_module: applicableTo,
        extend_scope: extendScope,
      });
      if (selectedTags.some((s) => s.id === resolvedTag.id)) {
        toast.info('标签已添加');
      } else {
        onAdd({ id: resolvedTag.id, name: resolvedTag.name });
      }
      setInput('');
    } catch (error) {
      showApiError(error, '创建标签失败');
    }
  };

  const handleSelectSuggestion = (tag: (typeof scopedTags)[number]) => {
    if (selectedTags.some((s) => s.id === tag.id)) {
      toast.info('标签已添加');
      setInput('');
      return;
    }
    onAdd({ id: tag.id, name: tag.name });
    setInput('');
  };

  return (
    <div className="mb-[14px] flex flex-col gap-2">
      {!hideChips && selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-[5px] rounded-full bg-[#e0e3e8] px-[11px] py-1 text-[12px] text-[#555]"
            >
              {t.name || scopedTags.find((item) => item.id === t.id)?.name || `#${t.id}`}
              <button
                type="button"
                onClick={() => onRemove(t.id)}
                className="flex p-0 text-[#98a4b5] transition hover:text-[#666]"
              >
                <X style={{ width: 10, height: 10 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex overflow-hidden rounded-[7px] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.06)] transition focus-within:shadow-[0_12px_28px_rgba(15,23,42,0.12),0_3px_8px_rgba(15,23,42,0.08)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleAdd();
            }
          }}
          placeholder="输入标签名…"
          className="flex-1 bg-transparent px-[14px] py-[10px] text-[14px] text-[#333] outline-none placeholder:text-[#bbb]"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!trimmedInput || createTag.isPending}
          className="flex h-auto w-11 shrink-0 items-center justify-center border-0 bg-[#e8793a] text-white transition hover:bg-[#d66b2e] disabled:cursor-not-allowed disabled:bg-[#ddd] disabled:text-[#aaa]"
        >
          <Plus style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {matchedTags.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-[6px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          {matchedTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void handleSelectSuggestion(t)}
              className="flex items-center gap-1.5 px-[14px] py-[9px] text-left text-[12px] text-[#333] transition hover:bg-[#f5f5f5]"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {recentTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-[#aaa]">最近:</span>
          {recentTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void handleSelectSuggestion(t)}
              className="border-0 bg-transparent p-0 text-[12px] text-[#e8793a] underline decoration-transparent transition hover:decoration-[#e8793a]"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
