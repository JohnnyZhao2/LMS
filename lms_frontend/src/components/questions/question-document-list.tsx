import React from 'react';
import { FileText } from 'lucide-react';

import { ScrollContainer } from '@/components/ui/scroll-container';
import type { QuestionType, Tag } from '@/types/common';

import { QuestionAddMenu } from './question-add-menu';
import { QuestionEditCard, type QuestionEditCardValue } from './question-edit-card';

type QuestionListItem = QuestionEditCardValue & {
  key: string;
};

interface QuestionDocumentListProps {
  items: QuestionListItem[];
  activeKey: string | null;
  spaceTags?: Tag[];
  showScore?: boolean;
  lockQuestionType?: boolean;
  onChangeItem: (key: string, patch: Partial<QuestionEditCardValue>) => void;
  onSelectItem: (key: string) => void;
  onSaveItem?: (key: string) => void;
  onDeleteItem?: (key: string) => void;
  itemSavingKey?: string | null;
  itemDeletingKey?: string | null;
  addMenuOpen?: boolean;
  onAddMenuOpenChange?: (open: boolean) => void;
  onAddQuestion?: (questionType: QuestionType) => void;
}

export const QuestionDocumentList: React.FC<QuestionDocumentListProps> = ({
  items,
  activeKey,
  spaceTags,
  showScore = false,
  lockQuestionType,
  onChangeItem,
  onSelectItem,
  onSaveItem,
  onDeleteItem,
  itemSavingKey = null,
  itemDeletingKey = null,
  addMenuOpen = false,
  onAddMenuOpenChange,
  onAddQuestion,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (!addMenuOpen || !onAddMenuOpenChange) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onAddMenuOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addMenuOpen, onAddMenuOpenChange]);

  React.useEffect(() => {
    if (!activeKey) return;

    const node = itemRefs.current[activeKey];
    if (!node) return;

    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeKey]);

  return (
    <div ref={containerRef} className="relative flex h-full min-w-0 flex-1 flex-col bg-background">
      <ScrollContainer className="flex-1 overflow-y-auto px-8 py-8">
        {items.length > 0 ? (
          <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 pb-28">
            {items.map((item) => (
              <div
                key={item.key}
                ref={(node) => {
                  itemRefs.current[item.key] = node;
                }}
              >
                <QuestionEditCard
                  item={item}
                  spaceTags={spaceTags}
                  showScore={showScore}
                  lockQuestionType={lockQuestionType}
                  onChange={(patch) => onChangeItem(item.key, patch)}
                  onFocus={() => onSelectItem(item.key)}
                  onSave={onSaveItem ? () => onSaveItem(item.key) : undefined}
                  onDelete={onDeleteItem ? () => onDeleteItem(item.key) : undefined}
                  isSaving={itemSavingKey === item.key}
                  isDeleting={itemDeletingKey === item.key}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-text-muted">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-background">
              <FileText className="h-8 w-8 opacity-30" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-foreground/60">暂无题目</p>
            </div>
          </div>
        )}
      </ScrollContainer>

      {onAddQuestion && onAddMenuOpenChange ? (
        <QuestionAddMenu
          open={addMenuOpen}
          onOpenChange={onAddMenuOpenChange}
          onAdd={onAddQuestion}
        />
      ) : null}
    </div>
  );
};
