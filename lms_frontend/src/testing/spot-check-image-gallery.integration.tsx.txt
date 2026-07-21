import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SpotCheckImageGallery } from '@/features/spot-checks/components/spot-check-image-gallery';
import { SpotCheckItemEditor } from '@/features/spot-checks/components/spot-check-item-editor';
import type { SpotCheckItem } from '@/features/spot-checks/types/spot-check';

const TEST_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export const GalleryHarness: React.FC = () => {
  const [comment, setComment] = useState('');

  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>抽查评分</DialogTitle>
        <input
          data-testid="external-comment"
          aria-label="外部评语"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <SpotCheckImageGallery
          images={[TEST_IMAGE]}
          previewInput={{
            label: '评语',
            placeholder: '填写评语',
            value: comment,
            onChange: setComment,
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export const StudentSubmitHarness: React.FC = () => {
  const [item, setItem] = useState<SpotCheckItem>({
    id: 1,
    topic: '排查问题',
    instruction: '根据截图填写处理结果',
    instruction_images: [TEST_IMAGE],
    content: '',
    images: [],
  });

  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>填写抽查</DialogTitle>
        <SpotCheckItemEditor
          index={0}
          item={item}
          mode="submit"
          canRemove={false}
          errors={{}}
          onChange={(_, field, value) =>
            setItem((current) => ({ ...current, [field]: value }))
          }
          onRemove={() => undefined}
        />
      </DialogContent>
    </Dialog>
  );
};

export const ScoreHarness: React.FC<{
  imageField: 'instruction' | 'submission';
}> = ({ imageField }) => {
  const [item, setItem] = useState<SpotCheckItem>({
    id: 1,
    topic: '排查问题',
    instruction: '根据截图填写处理结果',
    instruction_images: imageField === 'instruction' ? [TEST_IMAGE] : [],
    content: '学员已完成排查',
    comment: '',
    images: imageField === 'submission' ? [TEST_IMAGE] : [],
  });

  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>抽查评分</DialogTitle>
        <output data-testid="score-comment-state">{item.comment}</output>
        <SpotCheckItemEditor
          index={0}
          item={item}
          mode="score"
          canRemove={false}
          errors={{}}
          onChange={(_, field, value) =>
            setItem((current) => ({ ...current, [field]: value }))
          }
          onRemove={() => undefined}
        />
      </DialogContent>
    </Dialog>
  );
};

describe('SpotCheckImageGallery', () => {
  it('keeps the floating comment editable and synchronized inside an outer dialog', async () => {
    const user = userEvent.setup();
    render(<GalleryHarness />);

    await user.click(screen.getByRole('button', { name: '查看图片 1' }));

    const preview = screen.getByRole('dialog', { name: '图片预览' });
    expect(preview).toHaveClass('pointer-events-auto');
    expect(within(preview).getByAltText('图片 1')).toHaveClass('rounded-xl');

    const floatingComment = screen.getByPlaceholderText('填写评语');
    await user.type(floatingComment, '需要调整');

    expect(floatingComment).toHaveValue('需要调整');
    expect(screen.getByTestId('external-comment')).toHaveValue('需要调整');
  });

  it('synchronizes the student preview input with the submission content', async () => {
    const user = userEvent.setup();
    render(<StudentSubmitHarness />);

    await user.click(screen.getByRole('button', { name: '查看图片 1' }));

    const preview = screen.getByRole('dialog', { name: '图片预览' });
    expect(within(preview).getByText('要求说明')).toBeInTheDocument();
    expect(within(preview).getByText('根据截图填写处理结果')).toBeInTheDocument();
    const previewInput = within(preview).getByPlaceholderText('填写抽查内容');
    await user.type(previewInput, '已完成排查');
    await user.click(
      within(preview).getByRole('button', { name: '关闭图片预览' }),
    );

    expect(
      screen.getByPlaceholderText('填写说明，可直接粘贴截图'),
    ).toHaveValue('已完成排查');
  });

  it('shows the student answer above the comment for instruction images', async () => {
    const user = userEvent.setup();
    render(<ScoreHarness imageField="instruction" />);

    await user.click(screen.getByRole('button', { name: '查看图片 1' }));

    const preview = screen.getByRole('dialog', { name: '图片预览' });
    expect(within(preview).getByText('学员答案')).toBeInTheDocument();
    expect(within(preview).getByText('学员已完成排查')).toBeInTheDocument();

    await user.type(within(preview).getByPlaceholderText('填写评语'), '回答正确');

    expect(screen.getByTestId('score-comment-state')).toHaveTextContent(
      '回答正确',
    );
  });

  it('shows the student answer above the comment for submission images', async () => {
    const user = userEvent.setup();
    render(<ScoreHarness imageField="submission" />);

    await user.click(screen.getByRole('button', { name: '查看图片 1' }));

    const preview = screen.getByRole('dialog', { name: '图片预览' });
    expect(within(preview).getByText('学员答案')).toBeInTheDocument();
    expect(within(preview).getByText('学员已完成排查')).toBeInTheDocument();
    const commentInput = within(preview).getByPlaceholderText('填写评语');
    expect(commentInput).not.toBeDisabled();
    expect(commentInput).not.toHaveAttribute('readonly');
  });
});
