import * as React from 'react';
import { toast } from 'sonner';
import { X, Link as LinkIcon } from 'lucide-react';
import type { Tag as TagType } from '@/types/api';

import { useLineTypeTags, useKnowledgeTags } from '../api/get-tags';
import { useCreateKnowledge } from '../api/manage-knowledge';
import { showApiError } from '@/utils/error-handler';

interface AddKnowledgeModalProps {
  open: boolean;
  onClose: () => void;
  initialContent?: string;
  onSuccess?: (id: number) => void;
}

/**
 * mymind 风格的新建知识弹窗
 * 对接后端 API：选择条线 + 标签 + 内容 + 标题 + 链接
 */
export const AddKnowledgeModal: React.FC<AddKnowledgeModalProps> = ({
  open,
  onClose,
  initialContent = '',
  onSuccess,
}) => {
  const [lineTagId, setLineTagId] = React.useState<number | undefined>();
  const [tagId, setTagId] = React.useState<number | undefined>();
  const [content, setContent] = React.useState(initialContent);
  const [title, setTitle] = React.useState('');
  const [sourceUrl, setSourceUrl] = React.useState('');

  const { data: lineTypeTags = [] } = useLineTypeTags();
  const { data: knowledgeTags = [] } = useKnowledgeTags();
  const createKnowledge = useCreateKnowledge();

  // 每次打开时重置状态
  React.useEffect(() => {
    if (open) {
      setContent(initialContent);
      setTitle('');
      setSourceUrl('');
      setTagId(undefined);
      // 默认选中第一个条线
      if (lineTypeTags.length > 0 && !lineTagId) {
        setLineTagId(lineTypeTags[0].id);
      }
    }
  }, [open, initialContent, lineTypeTags, lineTagId]);

  // ESC 关闭
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const canSave = plainContent.length > 0 && !!title.trim();

  const handleSave = async () => {
    if (!canSave) return;

    try {
      const htmlContent = content
        .split('\n')
        .map((line) => `<p>${line}</p>`)
        .join('');

      const result = await createKnowledge.mutateAsync({
        title: title.trim(),
        line_tag_id: lineTagId,
        content: htmlContent,
        source_url: sourceUrl.trim() || undefined,
        tag_ids: tagId ? [tagId] : [],
      });

      toast.success('知识创建成功');
      onClose();
      onSuccess?.(result.id);
    } catch (error) {
      showApiError(error, '创建失败');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'mymind-fadeIn .15s ease',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          width: '100%',
          maxWidth: 560,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
          overflow: 'hidden',
          animation: 'mymind-popIn .2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: 条线选择 + 标签选择 + 关闭按钮 */}
        <div
          style={{
            padding: '18px 22px 0',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          {/* 条线选择 */}
          <div style={{ flex: 1, position: 'relative' }}>
            <select
              value={lineTagId ?? ''}
              onChange={(e) => setLineTagId(e.target.value ? Number(e.target.value) : undefined)}
              style={{
                width: '100%',
                border: '1.5px solid #eee',
                borderRadius: 10,
                padding: '8px 32px 8px 12px',
                fontSize: 13,
                color: lineTagId ? '#333' : '#bbb',
                background: '#fafafa',
                outline: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                fontFamily: 'inherit',
              }}
            >
              <option value="">选择条线</option>
              {lineTypeTags.map((tag: TagType) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <span
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#bbb',
                fontSize: 10,
              }}
            >
              ▾
            </span>
          </div>

          {/* 标签选择 */}
          <div style={{ flex: 1, position: 'relative' }}>
            <select
              value={tagId ?? ''}
              onChange={(e) => setTagId(e.target.value ? Number(e.target.value) : undefined)}
              style={{
                width: '100%',
                border: '1.5px solid #eee',
                borderRadius: 10,
                padding: '8px 32px 8px 12px',
                fontSize: 13,
                color: tagId ? '#333' : '#bbb',
                background: '#fafafa',
                outline: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                fontFamily: 'inherit',
              }}
            >
              <option value="">系统标签</option>
              {knowledgeTags.map((tag: TagType) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <span
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#bbb',
                fontSize: 10,
              }}
            >
              ▾
            </span>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#ccc',
              display: 'flex',
              padding: 4,
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* 内容编辑区 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px' }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写点什么…"
            autoFocus
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'none',
              fontSize: 15,
              lineHeight: 1.75,
              color: '#1a1a1a',
              fontFamily: 'inherit',
              minHeight: 200,
            }}
          />
        </div>

        {/* 底部：标题 + 链接 + 操作按钮 */}
        <div
          style={{
            padding: '10px 22px 18px',
            borderTop: '1px solid #f5f5f5',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="卡片标题（展示在卡片底部）"
            style={{
              border: '1.5px solid #eee',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 13,
              color: '#333',
              outline: 'none',
              background: '#fafafa',
              fontFamily: 'inherit',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#ddd' }}>
              <LinkIcon size={11} />
            </span>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="关联链接（可选）"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: '#7090cc',
                background: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={onClose}
              style={{
                border: '1.5px solid #eee',
                borderRadius: 10,
                padding: '7px 14px',
                fontSize: 13,
                cursor: 'pointer',
                background: 'none',
                color: '#bbb',
                fontFamily: 'inherit',
              }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || createKnowledge.isPending}
              style={{
                border: 'none',
                borderRadius: 10,
                padding: '7px 20px',
                fontSize: 13,
                fontWeight: 500,
                cursor: canSave && !createKnowledge.isPending ? 'pointer' : 'not-allowed',
                background: canSave ? '#111' : '#f0f0f0',
                color: canSave ? '#fff' : '#ccc',
                fontFamily: 'inherit',
              }}
            >
              {createKnowledge.isPending ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
