import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SelectableList } from '@/components/ui/selectable-list';

describe('SelectableList', () => {
  it('keeps row selection and dual selection as independent sibling buttons', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const onToggleCheck = vi.fn();

    const { container } = render(
      <SelectableList
        mode="inspect"
        items={[
          {
            id: 1,
            name: '张三',
            meta: '001',
            indicators: [
              { value: 2, label: '待填写', tone: 'primary' },
              { value: 1, label: '待评分', tone: 'destructive' },
            ],
          },
        ]}
        activeId={null}
        checkedIds={[]}
        onActivate={onActivate}
        onToggleCheck={onToggleCheck}
      />,
    );

    const renderedList = within(container);
    const checkButton = renderedList.getByRole('checkbox', {
      name: '勾选 张三',
    });
    const rowButton = renderedList.getByRole('button');

    expect(rowButton).toBeDefined();
    expect(checkButton.parentElement).toHaveClass('group/control');
    expect(checkButton).toHaveClass('group-focus-within/control:opacity-100');
    expect(checkButton).not.toHaveClass('group-focus-within:opacity-100');
    expect(checkButton).toHaveClass('group-hover/control:opacity-100');
    expect(checkButton).not.toHaveClass('group-hover:opacity-100');
    expect(container.querySelector('button button')).toBeNull();
    expect(renderedList.getByLabelText('2 项待填写')).toBeInTheDocument();
    expect(renderedList.getByLabelText('1 项待评分')).toBeInTheDocument();

    await user.click(checkButton);
    expect(onToggleCheck).toHaveBeenCalledWith(1);
    expect(onActivate).not.toHaveBeenCalled();

    checkButton.focus();
    await user.keyboard(' ');
    expect(onToggleCheck).toHaveBeenCalledTimes(2);
    expect(onActivate).not.toHaveBeenCalled();

    await user.click(rowButton);
    expect(onActivate).toHaveBeenCalledWith(1);
  });

  it('keeps a checked item visible as a checkbox without nesting controls', () => {
    const { container } = render(
      <SelectableList
        mode="inspect"
        items={[{ id: 1, name: '张三', meta: '001' }]}
        activeId={null}
        checkedIds={[1]}
        onActivate={vi.fn()}
        onToggleCheck={vi.fn()}
      />,
    );

    expect(within(container).getAllByRole('button')).toHaveLength(1);
    expect(
      within(container).getByRole('checkbox', { name: '取消勾选 张三' }),
    ).toBeChecked();
    expect(container.querySelector('button button')).toBeNull();
  });

  it('cancels the active row when it is clicked again', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    const { container } = render(
      <SelectableList
        mode="inspect"
        items={[{ id: 1, name: '张三', meta: '001' }]}
        activeId={1}
        checkedIds={[]}
        onActivate={onActivate}
        onToggleCheck={vi.fn()}
      />,
    );

    await user.click(within(container).getByRole('button', { name: /张三/ }));
    expect(onActivate).toHaveBeenCalledWith(null);
  });

  it('select mode toggles from the row without rendering checkboxes', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    const { container } = render(
      <SelectableList
        mode="select"
        items={[{ id: 1, name: '张三', meta: '001' }]}
        selectedIds={[1]}
        onToggle={onToggle}
      />,
    );

    const renderedList = within(container);
    const rowButton = renderedList.getByRole('button', { name: /张三/ });

    expect(rowButton).toHaveAttribute('aria-pressed', 'true');
    expect(renderedList.queryByRole('checkbox')).toBeNull();

    await user.click(rowButton);
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('select mode supports the task assignee two-column grid', () => {
    const { container } = render(
      <SelectableList
        mode="select"
        layout="grid"
        className="pt-1.5 pb-3"
        listClassName="px-4"
        itemsClassName="gap-1.5"
        items={[
          { id: 1, name: '张三' },
          { id: 2, name: '李四' },
        ]}
        selectedIds={[]}
        onToggle={vi.fn()}
      />,
    );

    const grid = container.querySelector('[data-layout="grid"]');

    expect(grid).toHaveClass('grid-cols-2');
    expect(grid).toHaveClass('px-4', 'gap-1.5');
    const gridButtons = within(grid as HTMLElement).getAllByRole('button');

    expect(gridButtons).toHaveLength(2);
    expect(gridButtons[0]).toHaveClass('gap-[5px]');
    expect(within(container).queryByRole('checkbox')).toBeNull();
  });
});
