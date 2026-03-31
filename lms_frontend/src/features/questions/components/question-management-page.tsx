import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
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
    <div className="flex flex-1 min-h-0 flex-col gap-10 pb-10">
      <PageHeader
        title="题目管理"
        icon={<FileText />}
      />

      <div className="flex flex-1 min-h-0 flex-col reveal-item stagger-delay-2">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              className="w-[22rem] max-w-full"
              placeholder="搜索题目内容..."
              value={search}
              onChange={setSearch}
            />
            <Select value={filterQuestionType} onValueChange={(value) => setFilterQuestionType(value as QuestionType | 'all')}>
              <SelectTrigger className="h-10 w-[10rem]">
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
              <SelectTrigger className="h-10 w-[10rem]">
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

          <CircleButton
            onClick={() => setQuestionCreateSignal((prev) => prev + 1)}
            label="新建题目"
            className="self-end xl:ml-auto"
          />
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
      </div>
    </div>
  );
};

export default QuestionManagementPage;
