import {
  Code2,
  Heading1,
  Minus,
  Quote,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type { SlashShortcut, SlashShortcutId, SlashTrigger } from '../../utils/slash-shortcuts';

const SLASH_SHORTCUT_META = {
  heading: { icon: Heading1, label: '标题' },
  divider: { icon: Minus, label: '分割线' },
  blockquote: { icon: Quote, label: '块引用' },
  code_block: { icon: Code2, label: '代码块' },
} satisfies Record<SlashShortcutId, { icon: typeof Heading1; label: string }>;

interface SlashCommandMenuProps {
  activeIndex: number;
  items: SlashShortcut[];
  position: {
    top: number;
    left: number;
  };
  trigger: SlashTrigger;
  onSelect: (shortcutId: SlashShortcutId, trigger: SlashTrigger) => void;
}

export function SlashCommandMenu({
  activeIndex,
  items,
  position,
  trigger,
  onSelect,
}: SlashCommandMenuProps) {
  return (
    <>
      <div
        className="sqe-menu"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {items.map((shortcut, index) => {
          const meta = SLASH_SHORTCUT_META[shortcut.id];
          const Icon = meta.icon;

          return (
            <button
              key={shortcut.id}
              type="button"
              className={cn('sqe-menu-item', index === activeIndex && 'sqe-menu-item-active')}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(shortcut.id, trigger);
              }}
            >
              <span className="sqe-menu-icon">
                <Icon size={15} strokeWidth={2.1} />
              </span>
              <span className="sqe-menu-label">{meta.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
