/**
 * ExamRunner Component
 * Exam answering interface with timer
 * Requirements: 9.5, 9.6, 9.7 - 考试答题界面
 */

import { useState, useEffect, useMemo } from "react";
import { QuestionCard } from "./components/QuestionCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, ArrowRight, Clock, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { MOCK_EXAM } from "@/testing/mocks";
import type { QuizQuestion } from "@/types/domain";

// Default exam duration in minutes if not specified
const DEFAULT_DURATION_MINUTES = 60;

export function ExamRunner() {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string[]>>({});
    const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION_MINUTES * 60);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const quizQuestions = MOCK_EXAM.questions;
    const currentQuizQuestion: QuizQuestion = quizQuestions[currentQuestionIndex];
    const question = currentQuizQuestion.question;

    const handleSubmit = () => {
        setIsSubmitted(true);
        // Here usually triggers an API call
    };

    useEffect(() => {
        if (isSubmitted) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isSubmitted]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswerSelect = (optionKey: string) => {
        if (isSubmitted) return;
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
        setTextAnswers(prev => ({ ...prev, [question.id]: text }));
    };

    const answeredCount = useMemo(() => {
        let count = 0;
        quizQuestions.forEach(qq => {
            const q = qq.question;
            if (q.type === 'SHORT_ANSWER') {
                if ((textAnswers[q.id] || '').trim().length > 0) count++;
            } else {
                if ((answers[q.id] || []).length > 0) count++;
            }
        });
        return count;
    }, [answers, textAnswers, quizQuestions]);

    if (isSubmitted) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center space-y-6 animate-fade-in">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary mb-6">
                    <ListChecks size={48} />
                </div>
                <h1 className="text-4xl font-heading font-bold text-white">考试已提交</h1>
                <p className="text-xl text-text-secondary">
                    您的答案已记录并发送至评估系统。
                </p>
                <div className="p-4 bg-white/5 rounded border border-white/10 max-w-sm mx-auto">
                    <div className="text-sm text-text-muted">考试 ID</div>
                    <div className="font-mono text-white">{MOCK_EXAM.id}</div>
                </div>
                <div className="flex gap-4 justify-center mt-8">
                    <Link to="/tasks">
                        <Button variant="primary">返回任务中心</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Exam Header */}
            <header className="h-16 border-b border-white/10 bg-background-secondary px-8 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-white tracking-tight">{MOCK_EXAM.title}</span>
                    <Badge variant="outline" className="border-white/20 text-text-muted">
                        <ListChecks size={12} className="mr-1" /> {currentQuestionIndex + 1}/{quizQuestions.length}
                    </Badge>
                </div>

                <div className={`font-mono text-xl font-bold flex items-center gap-2 ${timeLeft < 300 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                    <Clock size={20} />
                    {formatTime(timeLeft)}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto max-w-4xl py-12 px-4">

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

                <div className="flex justify-between items-center mt-8">
                    <Button
                        variant="secondary"
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> 上一题
                    </Button>

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
                            onClick={handleSubmit}
                            className="w-40"
                        >
                            提交考试
                        </Button>
                    )}
                </div>
            </main>

            {/* Footer/Progress */}
            <footer className="fixed bottom-0 left-0 right-0 h-1 bg-background-secondary">
                <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(answeredCount / quizQuestions.length) * 100}%` }}
                />
            </footer>
        </div>
    );
}
