import React, { useState } from 'react';
import { Layout } from 'lucide-react';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import { ROUTES } from '@/config/routes';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageViewport } from '@/components/ui/page-shell';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SearchInput } from '@/components/ui/search-input';
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

      <PageViewport className="flex flex-col reveal-item stagger-delay-2">
        <div className="mb-1 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <SegmentedControl
              value={quizType}
              onChange={(value: string) => setQuizType(value as 'ALL' | 'EXAM' | 'PRACTICE')}
              options={[
                { label: '全部', value: 'ALL' },
                { label: '考试', value: 'EXAM' },
                { label: '练习', value: 'PRACTICE' },
              ]}
              activeColor="white"
              className="w-full xl:w-auto xl:shrink-0"
            />
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
            <SearchInput
              className="w-full xl:w-[22rem] xl:min-w-[22rem]"
              placeholder="搜索试卷标题..."
              value={search}
              onChange={setSearch}
            />

            <CircleButton
              onClick={() => roleNavigate(`${ROUTES.QUIZZES}/create`)}
              label="构建全新试卷"
              className="self-end xl:self-auto"
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

export default QuizManagementPage;
