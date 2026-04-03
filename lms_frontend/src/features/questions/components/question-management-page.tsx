import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageViewport } from '@/components/ui/page-shell';
import { DESKTOP_SEARCH_INPUT_CLASSNAME, SearchInput } from '@/components/ui/search-input';
import { CircleButton } from '@/components/ui/circle-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QUESTION_TYPE_CONFIG } from '@/features/questions/constants';
import { useSpaceTypeTags } from '@/features/knowledge/api/get-tags';
import type { QuestionType } from '@/types/api';
import { QuestionTab } from './question-tab';

const QUESTION_TYPE_FILTER_OPTIONS: Array<{ value: QuestionType | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  ...Object.entries(QUESTION_TYPE_CONFIG).map(([value, config]) => ({
    value: value as QuestionType,
    label: config.label,
  })),
];

export const QuestionManagementPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [questionCreateSignal, setQuestionCreateSignal] = useState(0);
  const [filterQuestionType, setFilterQuestionType] = useState<QuestionType | 'all'>('all');
  const [filterSpaceTypeId, setFilterSpaceTypeId] = useState<string>('all');
  const { data: spaceTypes } = useSpaceTypeTags();

  return (
    <PageFillShell>
      <PageHeader
        title="题目管理"
        icon={<FileText />}
      />

      <PageViewport className="flex flex-col reveal-item stagger-delay-2">
        <div className="mb-1 flex flex-col gap-3 border-b border-border/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-3">
            <SegmentedControl
              value={filterQuestionType}
              onChange={(value) => setFilterQuestionType(value as QuestionType | 'all')}
              options={QUESTION_TYPE_FILTER_OPTIONS}
              className="w-full md:w-auto md:shrink-0"
            />

            <div className="w-[9.5rem] max-w-full shrink-0">
              <Select value={filterSpaceTypeId} onValueChange={setFilterSpaceTypeId}>
                <SelectTrigger>
                  <div className="flex min-w-0 items-center gap-2 pr-2">
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                      空间
                    </span>
                    <span className="h-3.5 w-px bg-border/70" aria-hidden="true" />
                    <SelectValue placeholder="全部" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {spaceTypes?.map((space) => (
                    <SelectItem key={space.id} value={space.id.toString()}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:ml-auto">
            <SearchInput
              className={DESKTOP_SEARCH_INPUT_CLASSNAME}
              placeholder="搜索题目内容..."
              value={search}
              onChange={setSearch}
            />
            <CircleButton
              onClick={() => setQuestionCreateSignal((prev) => prev + 1)}
              label="新建题目"
              className="shrink-0"
            />
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col">
          <QuestionTab
            search={search}
            createSignal={questionCreateSignal}
            filterQuestionType={filterQuestionType}
            filterSpaceTypeId={filterSpaceTypeId}
            spaceTypes={spaceTypes}
          />
        </div>
      </PageViewport>
    </PageFillShell>
  );
};

export default QuestionManagementPage;
