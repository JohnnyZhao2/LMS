/**
 * PersonalCenter Page Component
 * Combines personal profile, score history, and wrong answers
 * Requirements: 10.1 - Display personal center with profile, scores, and wrong answers
 */

import { useState } from 'react';
import { User } from 'lucide-react';
import { PersonalProfile } from './PersonalProfile';
import { ScoreHistory } from './ScoreHistory';
import { WrongAnswers } from './WrongAnswers';
import { usePersonalProfile } from '../api/get-personal-profile';
import { useScoreHistory } from '../api/get-score-history';
import { useWrongAnswers } from '../api/get-wrong-answers';
import type { ScoreHistoryParams, WrongAnswersParams } from '../api/types';
import { ErrorState } from '@/components/ui/ErrorState';

/**
 * PersonalCenter page component
 * Fetches data from backend API
 */
export function PersonalCenter() {
  // Filter states
  const [scoreParams, setScoreParams] = useState<ScoreHistoryParams>({});
  const [wrongAnswerParams, setWrongAnswerParams] = useState<WrongAnswersParams>({});

  // Fetch profile data
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = usePersonalProfile();

  // Fetch score history
  const {
    data: scoreData,
    isLoading: isLoadingScores,
    error: scoresError,
    refetch: refetchScores,
  } = useScoreHistory(scoreParams);

  // Fetch wrong answers
  const {
    data: wrongAnswersData,
    isLoading: isLoadingWrongAnswers,
    error: wrongAnswersError,
    refetch: refetchWrongAnswers,
  } = useWrongAnswers(wrongAnswerParams);

  // Handle score filter change
  const handleScoreFilterChange = (params: ScoreHistoryParams) => {
    setScoreParams((prev) => ({ ...prev, ...params }));
  };

  // Handle wrong answers filter change
  const handleWrongAnswersFilterChange = (params: WrongAnswersParams) => {
    setWrongAnswerParams((prev) => ({ ...prev, ...params }));
  };

  // Show error state if profile fails to load
  if (profileError) {
    return (
      <div className="p-6">
        <ErrorState
          title="加载失败"
          message="无法加载个人中心数据，请稍后重试"
          onRetry={refetchProfile}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            个人中心
          </h1>
          <p className="text-sm text-text-muted">
            查看个人信息、历史成绩和错题本
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile */}
        <div className="lg:col-span-1">
          <PersonalProfile
            profile={
              profileData || {
                id: 0,
                username: '',
                real_name: '',
                employee_id: '',
                department: { id: 0, name: '' },
                created_at: '',
              }
            }
            isLoading={isLoadingProfile}
          />
        </div>

        {/* Right Column - Scores and Wrong Answers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score History */}
          {scoresError ? (
            <ErrorState
              title="加载失败"
              message="无法加载成绩记录"
              onRetry={refetchScores}
            />
          ) : (
            <ScoreHistory
              records={scoreData?.records || []}
              total={scoreData?.total || 0}
              averageScore={scoreData?.average_score || 0}
              passRate={scoreData?.pass_rate || 0}
              isLoading={isLoadingScores}
              onFilterChange={handleScoreFilterChange}
            />
          )}

          {/* Wrong Answers */}
          {wrongAnswersError ? (
            <ErrorState
              title="加载失败"
              message="无法加载错题本"
              onRetry={refetchWrongAnswers}
            />
          ) : (
            <WrongAnswers
              wrongAnswers={wrongAnswersData?.wrong_answers || []}
              total={wrongAnswersData?.total || 0}
              isLoading={isLoadingWrongAnswers}
              onFilterChange={handleWrongAnswersFilterChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PersonalCenter;
