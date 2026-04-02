import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageFillShell, PageViewport } from '@/components/ui/page-shell';
import { DESKTOP_SEARCH_INPUT_CLASSNAME, SearchInput } from '@/components/ui/search-input';
import { CircleButton } from '@/components/ui/circle-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QUESTION_TYPE_LABELS } from '@/features/questions/constants';
import { useSpaceTypeTags } from '@/features/knowledge/api/get-tags';
import type { QuestionType } from '@/types/api';
import { QuestionTab } from './question-tab';

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
        <div className="mb-1 flex items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Select value={filterQuestionType} onValueChange={(value) => setFilterQuestionType(value as QuestionType | 'all')}>
              <SelectTrigger className="h-10 w-[10rem] shrink-0">
                <SelectValue placeholder="全部题型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部题型</SelectItem>
                {Object.entries(QUESTION_TYPE_LABELS).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSpaceTypeId} onValueChange={setFilterSpaceTypeId}>
              <SelectTrigger className="h-10 w-[10rem] shrink-0">
                <SelectValue placeholder="全部空间" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部空间</SelectItem>
                {spaceTypes?.map((space) => (
                  <SelectItem key={space.id} value={space.id.toString()}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-3">
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
