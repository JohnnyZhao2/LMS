/**
 * QuestionCard Component
 * Display a question with options for answering
 * Requirements: 8.5 - 支持单选、多选、判断、简答题型的作答
 */

import { Question, QuestionOption } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/utils/cn";
import { CheckCircle2, Circle, Square, CheckSquare } from "lucide-react";

interface QuestionCardProps {
    question: Question;
    questionNumber: number;
    score?: number;
    selectedAnswers: string[];
    onAnswerSelect: (optionKey: string) => void;
    onTextAnswerChange?: (text: string) => void;
    textAnswer?: string;
    showFeedback?: boolean;
    correctAnswer?: string | string[];
}

export function QuestionCard({ 
    question, 
    questionNumber,
    score,
    selectedAnswers, 
    onAnswerSelect, 
    onTextAnswerChange,
    textAnswer = '',
    showFeedback = false,
    correctAnswer
}: QuestionCardProps) {

    const isSelected = (optionKey: string) => selectedAnswers.includes(optionKey);

    const isCorrectOption = (optionKey: string): boolean => {
        if (!correctAnswer) return false;
        if (Array.isArray(correctAnswer)) {
            return correctAnswer.includes(optionKey);
        }
        return correctAnswer === optionKey;
    };

    const getOptionStyle = (option: QuestionOption) => {
        const selected = isSelected(option.key);
        const isCorrect = isCorrectOption(option.key);

        if (showFeedback) {
            if (isCorrect) return "border-success bg-success/10 text-success";
            if (selected && !isCorrect) return "border-destructive bg-destructive/10 text-destructive";
            return "border-white/5 opacity-50";
        }

        if (selected) return "border-primary bg-primary/10 text-white";
        return "border-white/10 hover:border-primary/50 hover:bg-white/5 text-text-secondary";
    };

    const getQuestionTypeLabel = (type: string): string => {
        switch (type) {
            case 'SINGLE_CHOICE': return '单选题';
            case 'MULTIPLE_CHOICE': return '多选题';
            case 'TRUE_FALSE': return '判断题';
            case 'SHORT_ANSWER': return '简答题';
            default: return type;
        }
    };

    const isMultipleChoice = question.type === 'MULTIPLE_CHOICE';
    const isShortAnswer = question.type === 'SHORT_ANSWER';

    return (
        <Card className="glass-panel border-white/5">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg leading-relaxed">
                        <span className="text-primary mr-2">{questionNumber}.</span>
                        {question.content}
                    </CardTitle>
                    <div className="text-xs font-mono text-text-muted bg-white/5 px-2 py-1 rounded shrink-0 ml-4">
                        {getQuestionTypeLabel(question.type)} {score !== undefined && `• ${score} 分`}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {isShortAnswer ? (
                    <Textarea
                        value={textAnswer}
                        onChange={(e) => onTextAnswerChange?.(e.target.value)}
                        placeholder="请输入您的答案..."
                        disabled={showFeedback}
                        className="min-h-[120px]"
                    />
                ) : question.options && question.options.length > 0 ? (
                    question.options.map(option => (
                        <button
                            key={option.key}
                            onClick={() => !showFeedback && onAnswerSelect(option.key)}
                            disabled={showFeedback}
                            className={cn(
                                "w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3",
                                getOptionStyle(option)
                            )}
                        >
                            {isMultipleChoice ? (
                                isSelected(option.key) ? <CheckSquare size={20} /> : <Square size={20} />
                            ) : (
                                isSelected(option.key) ? <CheckCircle2 size={20} /> : <Circle size={20} />
                            )}
                            <span className="font-medium text-primary mr-2">{option.key}.</span>
                            <span className="flex-1">{option.content}</span>
                        </button>
                    ))
                ) : (
                    <div className="text-text-muted text-center py-4">暂无选项</div>
                )}

                {showFeedback && question.explanation && (
                    <div className="mt-6 p-4 rounded bg-primary/10 border border-primary/20 text-sm text-text-secondary">
                        <strong className="text-primary">解析：</strong> {question.explanation}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
