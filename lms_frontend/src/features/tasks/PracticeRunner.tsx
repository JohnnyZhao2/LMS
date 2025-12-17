/**
 * PracticeRunner Component
 * Practice quiz answering interface
 * Requirements: 8.4, 8.5, 8.6 - 练习答题界面
 * 
 * Features:
 * - Display quiz questions list with navigation panel
 * - Save and submit answers
 * - Show auto-grading results and explanations
 */

import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { QuestionCard } from "./components/QuestionCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { ArrowLeft, ArrowRight, RotateCcw, Award, CheckCircle2, Circle, XCircle, ListChecks } from "lucide-react";
import { useStartPracticeQuiz } from "./api/start-practice-quiz";
import type { QuizQuestion, Question, Submission } from "@/types/domain";
import { cn } from "@/utils/cn";

/**
 * Question status for navigation panel
 */
type QuestionStatus = 'unanswered' | 'answered' | 'correct' | 'incorrect';

/**
 * Get the status of a question based on answers and feedback
 */
function getQuestionStatus(
    question: Question,
    answers: Record<number, string[]>,
    textAnswers: Record<number, string>,
    showFeedback: Record<number, boolean>
): QuestionStatus {
    const hasAnswer = question.type === 'SHORT_ANSWER'
        ? (textAnswers[question.id] || '').trim().length > 0
        : (answers[question.id] || []).length > 0;

    if (!hasAnswer) return 'unanswered';
    if (!showFeedback[question.id]) return 'answered';

    // Check if answer is correct
    if (question.type === 'SHORT_ANSWER') return 'answered'; // Can't auto-grade short answer

    const userAns = answers[question.id] || [];
    const correctAns = Array.isArray(question.answer) ? question.answer : [question.answer];
    const isCorrect = userAns.length === correctAns.length &&
        userAns.every(a => correctAns.includes(a));

    return isCorrect ? 'correct' : 'incorrect';
}

export function PracticeRunner() {
    const { taskId, quizId } = useParams<{ taskId: string; quizId: string }>();
    const navigate = useNavigate();
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string[]>>({});
    const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
    const [showFeedback, setShowFeedback] = useState<Record<number, boolean>>({});
    const [isCompleted, setIsCompleted] = useState(false);
    const [showNavPanel, setShowNavPanel] = useState(false);
    const [submission, setSubmission] = useState<Submission | null>(null);

    // Start practice mutation
    const startPracticeMutation = useStartPracticeQuiz();

    // Start practice when component mounts
    useEffect(() => {
        if (taskId && quizId && !submission) {
            startPracticeMutation.mutate(
                { taskId, quizId },
                {
                    onSuccess: (data) => {
                        setSubmission(data);
                    },
                }
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId, quizId]);

    // Get quiz questions from submission (safe to access even if null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submissionData = submission as any;
    const quizQuestions: QuizQuestion[] = submissionData?.questions || [];
    const quizTitle = submissionData?.quiz_title || '练习';
    const totalScore = submissionData?.total_score || 100;

    const currentQuizQuestion = quizQuestions[currentQuestionIndex];
    const question = currentQuizQuestion?.question;
    const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;

    const handleAnswerSelect = (optionKey: string) => {
        if (!question || showFeedback[question.id]) return;

        const current = answers[question.id] || [];
        let newAnswers: string[];

        if (question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE') {
            newAnswers = [optionKey];
        } else {
            newAnswers = current.includes(optionKey)
                ? current.filter(key => key !== optionKey)
                : [...current, optionKey];
        }

        setAnswers(prev => ({ ...prev, [question.id]: newAnswers }));
    };

    const handleTextAnswerChange = (text: string) => {
        if (!question) return;
        setTextAnswers(prev => ({ ...prev, [question.id]: text }));
    };

    const handleCheck = () => {
        if (!question) return;
        setShowFeedback(prev => ({ ...prev, [question.id]: true }));
    };

    const hasAnswer = question
        ? (question.type === 'SHORT_ANSWER'
            ? (textAnswers[question.id] || '').trim().length > 0
            : (answers[question.id] || []).length > 0)
        : false;

    // Get question statuses for navigation panel
    const questionStatuses = useMemo(() => quizQuestions.map(qq =>
        getQuestionStatus(qq.question, answers, textAnswers, showFeedback)
    ), [quizQuestions, answers, textAnswers, showFeedback]);

    const answeredCount = questionStatuses.filter(s => s !== 'unanswered').length;

    const handleReset = () => {
        setAnswers({});
        setTextAnswers({});
        setShowFeedback({});
        setCurrentQuestionIndex(0);
        setIsCompleted(false);
    };

    // Calculate score
    const calculateScore = useMemo(() => {
        let score = 0;
        let correctCount = 0;
        let incorrectCount = 0;

        quizQuestions.forEach((qq) => {
            const q = qq.question;
            const userAns = answers[q.id] || [];
            const correctAns = Array.isArray(q.answer) ? q.answer : [q.answer];

            if (q.type === 'SHORT_ANSWER') return;

            const isCorrect = userAns.length === correctAns.length &&
                userAns.every(a => correctAns.includes(a));
            if (isCorrect) {
                score += qq.score;
                correctCount++;
            } else if (showFeedback[q.id]) {
                incorrectCount++;
            }
        });

        return { score, correctCount, incorrectCount };
    }, [answers, quizQuestions, showFeedback]);

    // Loading state
    if (startPracticeMutation.isPending || !submission) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    // Error state
    if (startPracticeMutation.isError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <ErrorState
                    title="加载失败"
                    message="无法加载练习试卷"
                    onRetry={() => navigate(`/tasks/practice/${taskId}`)}
                />
            </div>
        );
    }

    if (quizQuestions.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <ErrorState
                    title="暂无题目"
                    message="该试卷暂无题目"
                    onRetry={() => navigate(`/tasks/practice/${taskId}`)}
                />
            </div>
        );
    }

    // Completion screen
    if (isCompleted) {
        const { score, correctCount, incorrectCount } = calculateScore;
        const shortAnswerCount = quizQuestions.filter(qq => qq.question.type === 'SHORT_ANSWER').length;

        return (
            <div className="max-w-2xl mx-auto py-10 text-center space-y-6 animate-fade-in">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary mb-6">
                    <Award size={48} />
                </div>
                <h1 className="text-4xl font-heading font-bold text-white">练习完成</h1>
                <p className="text-xl text-text-secondary">
                    您的得分：<span className="text-primary font-bold">{score}</span> / {totalScore} 分
                </p>

                <div className="flex justify-center gap-6 py-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-success">{correctCount}</div>
                        <div className="text-xs text-text-muted">正确</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">{incorrectCount}</div>
                        <div className="text-xs text-text-muted">错误</div>
                    </div>
                    {shortAnswerCount > 0 && (
                        <div className="text-center">
                            <div className="text-2xl font-bold text-text-secondary">{shortAnswerCount}</div>
                            <div className="text-xs text-text-muted">待评分</div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-left">
                    <h3 className="text-sm font-medium text-white mb-3">答题回顾</h3>
                    <div className="flex flex-wrap gap-2">
                        {quizQuestions.map((qq, index) => {
                            const status = questionStatuses[index];
                            return (
                                <button
                                    key={qq.question.id}
                                    onClick={() => {
                                        setIsCompleted(false);
                                        setCurrentQuestionIndex(index);
                                    }}
                                    className={cn(
                                        "w-8 h-8 rounded text-xs font-medium transition-colors",
                                        status === 'correct' && "bg-success/20 text-success border border-success/30",
                                        status === 'incorrect' && "bg-destructive/20 text-destructive border border-destructive/30",
                                        status === 'answered' && "bg-primary/20 text-primary border border-primary/30",
                                        status === 'unanswered' && "bg-white/5 text-text-muted border border-white/10"
                                    )}
                                >
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex gap-4 justify-center mt-8">
                    <Button variant="secondary" onClick={handleReset}>
                        <RotateCcw className="mr-2 h-4 w-4" /> 重新练习
                    </Button>
                    <Link to="/tasks">
                        <Button>返回任务中心</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 animate-fade-in">
            <div className="flex gap-6">
                <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <Link to={`/tasks/practice/${taskId}`} className="text-text-muted hover:text-white flex items-center gap-2">
                            <ArrowLeft size={16} /> 退出
                        </Link>
                        <div className="text-center">
                            <h2 className="font-heading font-semibold text-lg text-white">{quizTitle}</h2>
                            <div className="text-xs text-text-muted">第 {currentQuestionIndex + 1} 题 / 共 {quizQuestions.length} 题</div>
                        </div>
                        <button
                            onClick={() => setShowNavPanel(!showNavPanel)}
                            className="text-text-muted hover:text-white flex items-center gap-2 lg:hidden"
                        >
                            <ListChecks size={16} />
                        </button>
                    </div>

                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                        />
                    </div>

                    <QuestionCard
                        question={question}
                        questionNumber={currentQuestionIndex + 1}
                        score={currentQuizQuestion.score}
                        selectedAnswers={answers[question.id] || []}
                        onAnswerSelect={handleAnswerSelect}
                        onTextAnswerChange={handleTextAnswerChange}
                        textAnswer={textAnswers[question.id] || ''}
                        showFeedback={showFeedback[question.id]}
                        correctAnswer={question.answer}
                    />

                    <div className="flex justify-between items-center pt-6">
                        <Button
                            variant="ghost"
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> 上一题
                        </Button>

                        <div className="flex gap-3">
                            {!showFeedback[question.id] ? (
                                <Button onClick={handleCheck} disabled={!hasAnswer} variant="secondary">
                                    检查答案
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => {
                                        if (isLastQuestion) setIsCompleted(true);
                                        else setCurrentQuestionIndex(prev => prev + 1);
                                    }}
                                    variant="primary"
                                    className="w-32"
                                >
                                    {isLastQuestion ? '完成' : '下一题'} <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hidden lg:block w-64 shrink-0">
                    <QuestionNavPanel
                        quizQuestions={quizQuestions}
                        questionStatuses={questionStatuses}
                        currentIndex={currentQuestionIndex}
                        onSelectQuestion={setCurrentQuestionIndex}
                        answeredCount={answeredCount}
                        totalScore={totalScore}
                    />
                </div>
            </div>

            {showNavPanel && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowNavPanel(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-background-secondary p-4 overflow-y-auto">
                        <QuestionNavPanel
                            quizQuestions={quizQuestions}
                            questionStatuses={questionStatuses}
                            currentIndex={currentQuestionIndex}
                            onSelectQuestion={(index) => {
                                setCurrentQuestionIndex(index);
                                setShowNavPanel(false);
                            }}
                            answeredCount={answeredCount}
                            totalScore={totalScore}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

interface QuestionNavPanelProps {
    quizQuestions: QuizQuestion[];
    questionStatuses: QuestionStatus[];
    currentIndex: number;
    onSelectQuestion: (index: number) => void;
    answeredCount: number;
    totalScore: number;
}

function QuestionNavPanel({
    quizQuestions,
    questionStatuses,
    currentIndex,
    onSelectQuestion,
    answeredCount,
    totalScore
}: QuestionNavPanelProps) {
    return (
        <div className="bg-background-secondary rounded-lg border border-white/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">答题卡</h3>
                <Badge variant="outline" className="text-xs">
                    {answeredCount}/{quizQuestions.length}
                </Badge>
            </div>

            <div className="grid grid-cols-5 gap-2">
                {quizQuestions.map((qq, index) => {
                    const status = questionStatuses[index];
                    const isCurrent = index === currentIndex;

                    return (
                        <button
                            key={qq.question.id}
                            onClick={() => onSelectQuestion(index)}
                            className={cn(
                                "w-full aspect-square rounded flex items-center justify-center text-sm font-medium transition-all",
                                isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background-secondary",
                                status === 'correct' && "bg-success/20 text-success",
                                status === 'incorrect' && "bg-destructive/20 text-destructive",
                                status === 'answered' && "bg-primary/20 text-primary",
                                status === 'unanswered' && "bg-white/5 text-text-muted hover:bg-white/10"
                            )}
                        >
                            {index + 1}
                        </button>
                    );
                })}
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-text-muted">
                    <Circle size={12} className="text-text-muted" /> 未作答
                </div>
                <div className="flex items-center gap-2 text-primary">
                    <Circle size={12} fill="currentColor" /> 已作答
                </div>
                <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 size={12} /> 正确
                </div>
                <div className="flex items-center gap-2 text-destructive">
                    <XCircle size={12} /> 错误
                </div>
            </div>

            <div className="pt-2 border-t border-white/10">
                <div className="text-xs text-text-muted">总分</div>
                <div className="text-lg font-bold text-white">{totalScore} 分</div>
            </div>
        </div>
    );
}
