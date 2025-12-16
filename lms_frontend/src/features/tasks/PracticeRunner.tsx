/**
 * PracticeRunner Component
 * Practice quiz answering interface
 * Requirements: 8.4, 8.5, 8.6 - 练习答题界面
 */

import { useState, useMemo } from "react";
import { QuestionCard } from "./components/QuestionCard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, RotateCcw, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { MOCK_PAPER } from "@/testing/mocks";
import type { QuizQuestion } from "@/types/domain";

export function PracticeRunner() {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string[]>>({}); // questionId -> [optionKeys]
    const [textAnswers, setTextAnswers] = useState<Record<number, string>>({}); // questionId -> text
    const [showFeedback, setShowFeedback] = useState<Record<number, boolean>>({}); // questionId -> boolean
    const [isCompleted, setIsCompleted] = useState(false);

    const quizQuestions = MOCK_PAPER.questions;
    const currentQuizQuestion: QuizQuestion = quizQuestions[currentQuestionIndex];
    const question = currentQuizQuestion.question;
    const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;

    const handleAnswerSelect = (optionKey: string) => {
        if (showFeedback[question.id]) return; // Lock if feedback shown

        const current = answers[question.id] || [];
        let newAnswers: string[];

        if (question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE') {
            newAnswers = [optionKey];
        } else {
            // Multi-select toggle
            newAnswers = current.includes(optionKey)
                ? current.filter(key => key !== optionKey)
                : [...current, optionKey];
        }

        setAnswers(prev => ({ ...prev, [question.id]: newAnswers }));
    };

    const handleTextAnswerChange = (text: string) => {
        setTextAnswers(prev => ({ ...prev, [question.id]: text }));
    };

    const handleCheck = () => {
        setShowFeedback(prev => ({ ...prev, [question.id]: true }));
    };

    const calculateScore = useMemo(() => {
        return () => {
            let score = 0;
            quizQuestions.forEach((qq) => {
                const q = qq.question;
                const userAns = answers[q.id] || [];
                const correctAns = Array.isArray(q.answer) ? q.answer : [q.answer];

                // For short answer, skip auto-grading
                if (q.type === 'SHORT_ANSWER') return;

                // Simple exact match logic
                const isCorrect = userAns.length === correctAns.length &&
                    userAns.every(a => correctAns.includes(a));
                if (isCorrect) score += qq.score;
            });
            return score;
        };
    }, [answers, quizQuestions]);

    const hasAnswer = useMemo(() => {
        if (question.type === 'SHORT_ANSWER') {
            return (textAnswers[question.id] || '').trim().length > 0;
        }
        return (answers[question.id] || []).length > 0;
    }, [question.id, question.type, answers, textAnswers]);

    if (isCompleted) {
        const score = calculateScore();
        return (
            <div className="max-w-2xl mx-auto py-10 text-center space-y-6 animate-fade-in">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary mb-6">
                    <Award size={48} />
                </div>
                <h1 className="text-4xl font-heading font-bold text-white">练习完成</h1>
                <p className="text-xl text-text-secondary">
                    您的得分：<span className="text-primary font-bold">{score}</span> / {MOCK_PAPER.total_score} 分
                </p>
                <div className="flex gap-4 justify-center mt-8">
                    <Button variant="secondary" onClick={() => {
                        setAnswers({});
                        setTextAnswers({});
                        setShowFeedback({});
                        setCurrentQuestionIndex(0);
                        setIsCompleted(false);
                    }}>
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
        <div className="max-w-3xl mx-auto py-8 space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link to="/tasks" className="text-text-muted hover:text-white flex items-center gap-2">
                    <ArrowLeft size={16} /> 退出
                </Link>
                <div className="text-center">
                    <h2 className="font-heading font-semibold text-lg text-white">{MOCK_PAPER.title}</h2>
                    <div className="text-xs text-text-muted">第 {currentQuestionIndex + 1} 题 / 共 {quizQuestions.length} 题</div>
                </div>
                <div className="w-16"></div> {/* Spacer for center alignment */}
            </div>

            {/* Progress Bar */}
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
    );
}
