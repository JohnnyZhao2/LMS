import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { PageWorkbench } from '@/components/ui/page-shell';
import { DESKTOP_SEARCH_INPUT_CLASSNAME, SearchInput } from '@/components/ui/search-input';
import { CircleButton } from '@/components/ui/circle-button';
import { QuizTab } from './quiz-tab';

export const QuizManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  return (
    <PageWorkbench>
        <div className="mb-1 flex items-center justify-end gap-3">
          <div className="flex min-w-0 items-center justify-end gap-3">
            <SearchInput
              className={DESKTOP_SEARCH_INPUT_CLASSNAME}
              placeholder="搜索试卷标题..."
              value={search}
              onChange={setSearch}
            />

            <CircleButton
              onClick={() => navigate(`${ROUTES.QUIZZES}/create`)}
              label="构建全新试卷"
              className="shrink-0"
            />
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col">
          <QuizTab search={search} />
        </div>
    </PageWorkbench>
  );
};
