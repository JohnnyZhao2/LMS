/**
 * ExamRunner Component
 * Exam answering interface with timer
 * Requirements: 9.5, 9.6, 9.7 - 考试答题界面
 * 
 * Features:
 * - Display quiz questions with countdown timer
 * - Auto-submit when time runs out (Requirement 9.6)
 * - Manual submit option (Requirement 9.7)
 * - Question navigation panel
 * - Submit confirmation dialog
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { QuestionCard } from "./components/QuestionCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { ArrowLeft, ArrowRight, Clock, ListChecks, AlertTriangle, Send, Circle } from "lucide-react";
import { useStartExam, useSubmitExamAnswers } from "./api/tasks";
import type { QuizQuestion, Question, Submission } from "@/types/domain";
import { cn } from "@/utils/cn";

// Default exam duration in minutes if not specified
const DEFAULT_DURATION_MINUTES = 60;

// Time thresholds for warnings (in seconds)
const WARNING_THRESHOLD = 300; // 5 minutes
const CRITICAL_THRESHOLD = 60; // 1 minute

/**
 * Check if a question has been answered
 */
function hasQuestionAnswer(
    question: Question,
    answers: Record<number, string[]>,
    textAnswers: Record<number, string>
): boolean {
    if (question.type === 'SHORT_ANSWER') {
        return (textAnswers[question.id] || '').trim().length > 0;
    }
    return (answers[question.id] || []).length > 0;
}

export function ExamRunner() {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string[]>>({});
    const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION_MINUTES * 60);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showNavPanel, setShowNavPanel] = useState(false);
    const [autoSubmitted, setAutoSubmitted] = useState(false);
    const [submission, setSubmission] = useState<Submission | null>(null);

    // API mutations
    const startExamMutation = useStartExam();
    const submitExamMutation = useSubmitExamAnswers();

    // Start exam when component mounts
    useEffect(() => {
        if (taskId && !submission) {
            startExamMutation.mutate(taskId, {
                onSuccess: (data) => {
                    setSubmission(data);
                    // Set timer based on remaining time from server
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const remainingSeconds = (data as any).remaining_seconds as number | undefined;
                    if (remainingSeconds) {
                        setTimeLeft(remainingSeconds);
                    }
                },
            });
        }
    }, [taskId]);

    // Handle exam submission
    const handleSubmit = useCallback((isAuto: boolean = false) => {
        if (!submission) return;
        
        // Prepare answers for submission
        const formattedAnswers: Record<number, string | string[]> = {};
        Object.entries(answers).forEach(([qId, ans]) => {
            formattedAnswers[parseInt(qId)] = ans.length === 1 ? ans[0] : ans;
        });
        Object.entries(textAnswers).forEach(([qId, ans]) => {
            if (ans.trim()) {
                formattedAnswers[parseInt(qId)] = ans;
            }
        });

        submitExamMutation.mutate(
            { submissionId: submission.id, answers: formattedAnswers },
            {
                onSuccess: () => {
                    setIsSubmitted(true);
                    setAutoSubmitted(isAuto);
                    setShowConfirmModal(false);
                },
            }
        );
    }, [submission, answers, textAnswers, submitExamMutation]);

    // Timer effect - auto-submit when time runs out (Requirement 9.6)
    useEffect(() => {
        if (isSubmitted || !submission) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true); // Auto-submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isSubmitted, submission, handleSubmit]);

    // Get quiz questions from submission (safe to access even if null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submissionData = submission as any;
    const quizQuestions: QuizQuestion[] = submissionData?.questions || [];
    const quizTitle = submissionData?.quiz_title || '考试';
    const totalScore = submissionData?.total_score || 100;

    const currentQuizQuestion = quizQuestions[currentQuestionIndex];
    const question = currentQuizQuestion?.question;

    // Format time display
    const formatTime = useCallback((seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Get time status for styling
    const getTimeStatus = useCallback((): 'normal' | 'warning' | 'critical' => {
        if (timeLeft <= CRITICAL_THRESHOLD) return 'critical';
        if (timeLeft <= WARNING_THRESHOLD) return 'warning';
        return 'normal';
    }, [timeLeft]);

    const handleAnswerSelect = useCallback((optionKey: string) => {
        if (isSubmitted || !question) return;

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
    }, [isSubmitted, question, answers]);

    const handleTextAnswerChange = useCallback((text: string) => {
        if (!question) return;
        setTextAnswers(prev => ({ ...prev, [question.id]: text }));
    }, [question]);

    // Calculate answered questions count
    const answeredCount = useMemo(() => {
        return quizQuestions.filter(qq =>
            hasQuestionAnswer(qq.question, answers, textAnswers)
        ).length;
    }, [answers, textAnswers, quizQuestions]);

    // Get unanswered question indices
    const unansweredIndices = useMemo(() => {
        return quizQuestions
            .map((qq, index) => ({ qq, index }))
            .filter(({ qq }) => !hasQuestionAnswer(qq.question, answers, textAnswers))
            .map(({ index }) => index);
    }, [quizQuestions, answers, textAnswers]);

    const timeStatus = getTimeStatus();

    // Loading state
    if (startExamMutation.isPending || !submission) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    // Error state
    if (startExamMutation.isError) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <ErrorState
                    title="无法进入考试"
                    message={(startExamMutation.error as Error)?.message || "请检查考试时间窗口"}
                    onRetry={() => navigate(`/tasks/exam/${taskId}`)}
                />
            </div>
        );
    }

    if (quizQuestions.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <ErrorState
                    title="暂无题目"
                    message="该试卷暂无题目"
                    onRetry={() => navigate(`/tasks/exam/${taskId}`)}
                />
            </div>
        );
    }

    // Submission confirmation screen
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
                    <div className={cn(
                        "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6",
                        autoSubmitted ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary"
                    )}>
                        {autoSubmitted ? <Clock size={48} /> : <ListChecks size={48} />}
                    </div>

                    <h1 className="text-4xl font-heading font-bold text-white">
                        {autoSubmitted ? '考试时间结束' : '考试已提交'}
                    </h1>

                    <p className="text-xl text-text-secondary">
                        {autoSubmitted
                            ? '考试时间已到，您的答案已自动提交。'
                            : '您的答案已记录并发送至评估系统。'
                        }
                    </p>

                    <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">考试名称</span>
                            <span className="text-white font-medium">{quizTitle}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">已答题目</span>
                            <span className="text-white font-medium">{answeredCount} / {quizQuestions.length}</span>
                        </div>
                    </div>

                    <p className="text-sm text-text-muted">
                        成绩将在评分完成后公布，请关注任务中心通知。
                    </p>

                    <div className="flex gap-4 justify-center mt-8">
                        <Link to="/tasks">
                            <Button variant="primary">返回任务中心</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Exam Header - Sticky */}
            <header className="h-16 border-b border-white/10 bg-background-secondary px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2 md:gap-4">
                    <span className="font-bold text-white tracking-tight text-sm md:text-base truncate max-w-[150px] md:max-w-none">
                        {quizTitle}
                    </span>
                    <Badge variant="outline" className="border-white/20 text-text-muted shrink-0">
                        <ListChecks size={12} className="mr-1" />
                        <span>{answeredCount}/{quizQuestions.length}</span>
                    </Badge>
                </div>

                {/* Timer */}
                <div className={cn(
                    "font-mono text-lg md:text-xl font-bold flex items-center gap-2 transition-colors",
                    timeStatus === 'critical' && "text-destructive animate-pulse",
                    timeStatus === 'warning' && "text-warning",
                    timeStatus === 'normal' && "text-primary"
                )}>
                    <Clock size={20} />
                    {formatTime(timeLeft)}
                </div>
            </header>

            {/* Time warning banner */}
            {timeStatus !== 'normal' && (
                <div className={cn(
                    "px-4 py-2 text-center text-sm font-medium",
                    timeStatus === 'critical' && "bg-destructive/20 text-destructive",
                    timeStatus === 'warning' && "bg-warning/20 text-warning"
                )}>
                    <AlertTriangle size={14} className="inline mr-2" />
                    {timeStatus === 'critical'
                        ? '考试即将结束，请尽快提交！'
                        : '剩余时间不足 5 分钟，请注意时间。'
                    }
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 container mx-auto max-w-5xl py-8 px-4">
                <div className="flex gap-6">
                    {/* Question area */}
                    <div className="flex-1 space-y-6">
                        <QuestionCard
                            question={question}
                            questionNumber={currentQuestionIndex + 1}
                            score={currentQuizQuestion.score}
                            selectedAnswers={answers[question.id] || []}
                            onAnswerSelect={handleAnswerSelect}
                            onTextAnswerChange={handleTextAnswerChange}
                            textAnswer={textAnswers[question.id] || ''}
                            showFeedback={false}
                        />

                        {/* Navigation buttons */}
                        <div className="flex justify-between items-center pt-4">
                            <Button
                                variant="secondary"
                                disabled={currentQuestionIndex === 0}
                                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> 上一题
                            </Button>

                            <div className="flex gap-3">
                                {currentQuestionIndex < quizQuestions.length - 1 ? (
                                    <Button
                                        variant="primary"
                                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                    >
                                        下一题 <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="danger"
                                        onClick={() => setShowConfirmModal(true)}
                                    >
                                        <Send className="mr-2 h-4 w-4" /> 提交考试
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Question Navigation Panel - Desktop */}
                    <div className="hidden lg:block w-64 shrink-0">
                        <ExamNavPanel
                            quizQuestions={quizQuestions}
                            answers={answers}
                            textAnswers={textAnswers}
                            currentIndex={currentQuestionIndex}
                            onSelectQuestion={setCurrentQuestionIndex}
                            onSubmit={() => setShowConfirmModal(true)}
                            answeredCount={answeredCount}
                            totalScore={totalScore}
                        />
                    </div>
                </div>
            </main>

            {/* Mobile navigation toggle */}
            <button
                onClick={() => setShowNavPanel(true)}
                className="lg:hidden fixed bottom-4 right-4 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg z-40"
            >
                <ListChecks size={24} className="text-white" />
            </button>

            {/* Mobile navigation panel overlay */}
            {showNavPanel && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowNavPanel(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-background-secondary p-4 overflow-y-auto">
                        <ExamNavPanel
                            quizQuestions={quizQuestions}
                            answers={answers}
                            textAnswers={textAnswers}
                            currentIndex={currentQuestionIndex}
                            onSelectQuestion={(index) => {
                                setCurrentQuestionIndex(index);
                                setShowNavPanel(false);
                            }}
                            onSubmit={() => {
                                setShowNavPanel(false);
                                setShowConfirmModal(true);
                            }}
                            answeredCount={answeredCount}
                            totalScore={totalScore}
                        />
                    </div>
                </div>
            )}

            {/* Submit confirmation modal */}
            <Modal
                open={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="确认提交考试"
            >
                <div className="space-y-4">
                    {unansweredIndices.length > 0 ? (
                        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-warning shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-warning font-medium">您还有 {unansweredIndices.length} 道题目未作答</p>
                                    <p className="text-sm text-text-muted mt-1">
                                        未答题目：{unansweredIndices.map(i => i + 1).join('、')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-text-secondary">
                            您已完成所有题目的作答。
                        </p>
                    )}

                    <div className="p-4 bg-white/5 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">已答题目</span>
                            <span className="text-white">{answeredCount} / {quizQuestions.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">剩余时间</span>
                            <span className={cn(
                                "font-mono",
                                timeStatus === 'critical' && "text-destructive",
                                timeStatus === 'warning' && "text-warning",
                                timeStatus === 'normal' && "text-white"
                            )}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    </div>

                    <p className="text-sm text-text-muted">
                        提交后将无法修改答案，确定要提交吗？
                    </p>

                    <div className="flex gap-3 justify-end pt-2">
                        <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                            继续答题
                        </Button>
                        <Button 
                            variant="danger" 
                            onClick={() => handleSubmit(false)}
                            disabled={submitExamMutation.isPending}
                        >
                            {submitExamMutation.isPending ? '提交中...' : '确认提交'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Footer progress bar */}
            <footer className="fixed bottom-0 left-0 right-0 h-1 bg-background-secondary z-30">
                <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(answeredCount / quizQuestions.length) * 100}%` }}
                />
            </footer>
        </div>
    );
}

/**
 * Exam Navigation Panel Component
 */
interface ExamNavPanelProps {
    quizQuestions: QuizQuestion[];
    answers: Record<number, string[]>;
    textAnswers: Record<number, string>;
    currentIndex: number;
    onSelectQuestion: (index: number) => void;
    onSubmit: () => void;
    answeredCount: number;
    totalScore: number;
}

function ExamNavPanel({
    quizQuestions,
    answers,
    textAnswers,
    currentIndex,
    onSelectQuestion,
    onSubmit,
    answeredCount,
    totalScore
}: ExamNavPanelProps) {
    return (
        <div className="bg-background-secondary rounded-lg border border-white/10 p-4 space-y-4 sticky top-24">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">答题卡</h3>
                <Badge variant="outline" className="text-xs">
                    {answeredCount}/{quizQuestions.length}
                </Badge>
            </div>

            <div className="grid grid-cols-5 gap-2">
                {quizQuestions.map((qq, index) => {
                    const isAnswered = hasQuestionAnswer(qq.question, answers, textAnswers);
                    const isCurrent = index === currentIndex;

                    return (
                        <button
                            key={qq.question.id}
                            onClick={() => onSelectQuestion(index)}
                            className={cn(
                                "w-full aspect-square rounded flex items-center justify-center text-sm font-medium transition-all",
                                isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background-secondary",
                                isAnswered ? "bg-primary/20 text-primary" : "bg-white/5 text-text-muted hover:bg-white/10"
                            )}
                        >
                            {index + 1}
                        </button>
                    );
                })}
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-text-muted">
                    <Circle size={12} /> 未作答
                </div>
                <div className="flex items-center gap-2 text-primary">
                    <Circle size={12} fill="currentColor" /> 已作答
                </div>
            </div>

            <div className="pt-2 border-t border-white/10">
                <div className="text-xs text-text-muted">总分</div>
                <div className="text-lg font-bold text-white">{totalScore} 分</div>
            </div>

            <Button
                variant="danger"
                className="w-full"
                onClick={onSubmit}
            >
                <Send className="mr-2 h-4 w-4" /> 提交考试
            </Button>
        </div>
    );
}
