import React, { useState } from 'react';
import { Layout } from 'lucide-react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { ROUTES } from '@/config/routes';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageViewport } from '@/components/ui/page-shell';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { DESKTOP_SEARCH_INPUT_CLASSNAME, SearchInput } from '@/components/ui/search-input';
import { CircleButton } from '@/components/ui/circle-button';
import { QuizTab } from '../quizzes/components/quiz-tab';

export const QuizManagementPage: React.FC = () => {
  const { roleNavigate } = useRoleNavigate();
  const [search, setSearch] = useState('');
  const [quizType, setQuizType] = useState<'ALL' | 'EXAM' | 'PRACTICE'>('ALL');

  return (
    <PageFillShell>
      <PageHeader
        title="试卷管理"
        icon={<Layout />}
      />

      <PageViewport className="flex flex-col">
        <div className="mb-1 flex items-center gap-3">
          <SegmentedControl
            value={quizType}
            onChange={(value: string) => setQuizType(value as 'ALL' | 'EXAM' | 'PRACTICE')}
            options={[
              { label: '全部', value: 'ALL' },
              { label: '考试', value: 'EXAM' },
              { label: '测验', value: 'PRACTICE' },
            ]}
            className="shrink-0"
          />

          <div className="ml-auto flex min-w-0 items-center justify-end gap-3">
            <SearchInput
              className={DESKTOP_SEARCH_INPUT_CLASSNAME}
              placeholder="搜索试卷标题..."
              value={search}
              onChange={setSearch}
            />

            <CircleButton
              onClick={() => roleNavigate(`${ROUTES.QUIZZES}/create`)}
              label="构建全新试卷"
              className="shrink-0"
            />
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col">
          <QuizTab search={search} quizType={quizType === 'ALL' ? undefined : quizType} />
        </div>
      </PageViewport>
    </PageFillShell>
  );
};
