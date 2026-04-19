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

const SLASH_COMMAND_MENU_STYLES = `
  .sqe-menu {
    position: absolute;
    z-index: 60;
    min-width: 220px;
    border-radius: 10px;
    border: 1px solid rgba(228, 232, 239, 0.85);
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08), 0 1px 4px rgba(15, 23, 42, 0.04);
    padding: 5px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .sqe-menu-item {
    align-items: center;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #1f2937;
    cursor: pointer;
    display: flex;
    gap: 9px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    padding: 6px 8px;
    text-align: left;
    transition: background-color 0.12s ease;
  }

  .sqe-menu-icon {
    align-items: center;
    background: #f3f4f6;
    border-radius: 5px;
    color: #6b7280;
    display: inline-flex;
    flex-shrink: 0;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .sqe-menu-label {
    flex: 1;
  }

  .sqe-menu-item:hover,
  .sqe-menu-item-active {
    background: #f9fafb;
  }

  .sqe-menu-item:hover .sqe-menu-icon,
  .sqe-menu-item-active .sqe-menu-icon {
    background: #e5e7eb;
    color: #4b5563;
  }
`;

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
      <style>{SLASH_COMMAND_MENU_STYLES}</style>
    </>
  );
}
