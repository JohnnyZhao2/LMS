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
    <div className="taginput-root">
      {/* 已选标签 */}
      {!hideChips && selectedTags.length > 0 && (
        <div className="taginput-chips">
          {selectedTags.map((t) => (
            <span key={t.id} className="taginput-chip">
              {t.name || scopedTags.find((item) => item.id === t.id)?.name || `#${t.id}`}
              <button
                type="button"
                onClick={() => onRemove(t.id)}
                className="taginput-chip-x"
              >
                <X style={{ width: 10, height: 10 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 输入框 + 添加按钮 */}
      <div className="taginput-row">
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
          className="taginput-field"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!trimmedInput || createTag.isPending}
          className="taginput-add-btn"
        >
          <Plus style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* 输入时的匹配建议 */}
      {matchedTags.length > 0 && (
        <div className="taginput-suggestions">
          {matchedTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void handleSelectSuggestion(t)}
              className="taginput-suggestion-item"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* 没有输入时展示最近标签 */}
      {recentTags.length > 0 && (
        <div className="taginput-recent">
          <span className="taginput-recent-label">最近:</span>
          {recentTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void handleSelectSuggestion(t)}
              className="taginput-recent-item"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .taginput-root {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
        }
        .taginput-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .taginput-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #e0e3e8;
          border-radius: 100px;
          padding: 4px 11px;
          font-size: 12px;
          color: #555;
        }
        .taginput-chip-x {
          background: none;
          border: none;
          cursor: pointer;
          color: #aaa;
          display: flex;
          padding: 0;
          transition: color 0.15s;
        }
        .taginput-chip-x:hover { color: #666; }
        .taginput-row {
          display: flex;
          border-radius: 7px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.06);
          transition: box-shadow 0.2s ease;
        }
        .taginput-row:focus-within {
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12), 0 3px 8px rgba(15, 23, 42, 0.08);
        }
        .taginput-field {
          flex: 1;
          border: none;
          outline: none;
          padding: 10px 14px;
          font-size: 14px;
          color: #333;
          font-family: inherit;
          background: none;
        }
        .taginput-field::placeholder { color: #bbb; }
        .taginput-add-btn {
          width: 44px;
          border: none;
          border-radius: 0 7px 7px 0;
          background: #e8793a;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .taginput-add-btn:hover { background: #d66b2e; }
        .taginput-add-btn:disabled {
          background: #ddd;
          color: #aaa;
          cursor: not-allowed;
        }
        .taginput-suggestions {
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .taginput-suggestion-item {
          width: 100%;
          text-align: left;
          border: none;
          background: none;
          padding: 9px 14px;
          font-size: 12px;
          color: #333;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .taginput-suggestion-item:hover { background: #f5f5f5; }
        .taginput-suggestion-create {
          color: #e8793a;
          font-weight: 500;
          border-top: 1px solid #f0f0f0;
        }
        .taginput-recent {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .taginput-recent-label {
          font-size: 12px;
          color: #aaa;
        }
        .taginput-recent-item {
          background: none;
          border: none;
          font-size: 12px;
          color: #e8793a;
          cursor: pointer;
          font-family: inherit;
          padding: 0;
          text-decoration: underline;
          text-decoration-color: transparent;
          transition: text-decoration-color 0.15s;
        }
        .taginput-recent-item:hover {
          text-decoration-color: #e8793a;
        }
      `}</style>
    </div>
  );
};
