import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { CircleButton } from '@/components/ui/circle-button';
import { QuestionTab } from './question-tab';

export const QuestionManagementPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [questionCreateSignal, setQuestionCreateSignal] = useState(0);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-10 pb-10">
      <PageHeader
        title="题目管理"
        icon={<FileText />}
      />

      <div className="flex flex-1 min-h-0 flex-col reveal-item stagger-delay-2">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SearchInput
            className="w-full xl:w-80"
            placeholder="搜索题目内容..."
            value={search}
            onChange={setSearch}
          />

          <CircleButton
            onClick={() => setQuestionCreateSignal((prev) => prev + 1)}
            label="新建题目"
            className="self-end xl:self-auto"
          />
        </div>

        <div className="flex flex-1 min-h-0 flex-col">
          <QuestionTab search={search} createSignal={questionCreateSignal} />
        </div>
      </div>
    </div>
  );
};

export default QuestionManagementPage;
