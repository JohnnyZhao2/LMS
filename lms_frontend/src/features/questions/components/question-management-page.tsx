import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageWorkbench } from '@/components/ui/page-shell';
import { DESKTOP_SEARCH_INPUT_CLASSNAME, SearchInput } from '@/components/ui/search-input';
import { CircleButton } from '@/components/ui/circle-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { COMPACT_FILTER_SELECT_CLASSNAME, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTags } from '@/features/tags/api/tags';
import { QUESTION_TYPE_CONFIG } from '@/features/questions/constants';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import type { QuestionType } from '@/types/common';
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
  const [filterQuestionType, setFilterQuestionType] = useState<QuestionType | 'all'>('all');
  const [filterSpaceTagId, setFilterSpaceTagId] = useState<string>('all');
  const { data: spaceTags } = useTags({ tag_type: 'SPACE' });
  const { roleNavigate } = useRoleNavigate();

  return (
    <PageFillShell>
      <PageHeader
        title="题目管理"
        icon={<FileText />}
      />

      <PageWorkbench>
        <div className="mb-1 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-3">
            <SegmentedControl
              value={filterQuestionType}
              onChange={(value) => setFilterQuestionType(value as QuestionType | 'all')}
              options={QUESTION_TYPE_FILTER_OPTIONS}
              className="w-full md:w-auto md:shrink-0"
            />

            <div className={COMPACT_FILTER_SELECT_CLASSNAME}>
              <Select value={filterSpaceTagId} onValueChange={setFilterSpaceTagId}>
                <SelectTrigger>
                  <SelectValue placeholder="全部空间" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {spaceTags?.map((space) => (
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
              onClick={() => roleNavigate('/questions/create')}
              label="新建题目"
              className="shrink-0"
            />
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col">
          <QuestionTab
            search={search}
            filterQuestionType={filterQuestionType}
            filterSpaceTagId={filterSpaceTagId}
          />
        </div>
      </PageWorkbench>
    </PageFillShell>
  );
};
