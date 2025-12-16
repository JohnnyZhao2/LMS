/**
 * Analytics feature exports
 */

// API exports
export {
  personalKeys,
  fetchPersonalProfile,
  fetchScoreHistory,
  fetchWrongAnswers,
  exportScoreHistory,
  usePersonalProfile,
  useScoreHistory,
  useWrongAnswers,
  type PersonalProfile,
  type ScoreRecord,
  type ScoreHistoryResponse,
  type WrongAnswerRecord,
  type WrongAnswersResponse,
  type PersonalCenterData,
  type ScoreHistoryParams,
  type WrongAnswersParams,
} from './api';

// Component exports
export {
  AnalyticsDashboard,
  PersonalCenter,
  PersonalProfile as PersonalProfileComponent,
  ScoreHistory,
  WrongAnswers,
} from './components';
