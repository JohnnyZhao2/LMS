import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Search, Plus, FileText, Database, Settings, ArrowRight } from "lucide-react";
import { MOCK_PAPER, MOCK_QUESTIONS } from "@/testing/mocks";
// Question type is used implicitly through MOCK_QUESTIONS

export function TestCenter() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'PAPERS' | 'QUESTIONS'>('PAPERS');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Test Center</h1>
                    <p className="text-text-muted mt-1">Manage assessment resources and question banks.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === 'PAPERS' ? 'primary' : 'ghost'}
                        onClick={() => setActiveTab('PAPERS')}
                        className="gap-2"
                    >
                        <FileText size={16} /> Exam Papers
                    </Button>
                    <Button
                        variant={activeTab === 'QUESTIONS' ? 'primary' : 'ghost'}
                        onClick={() => setActiveTab('QUESTIONS')}
                        className="gap-2"
                    >
                        <Database size={16} /> Question Bank
                    </Button>
                </div>
            </div>

            <Card className="glass-panel border-white/5">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{activeTab === 'PAPERS' ? 'Active Exam Papers' : 'Question Repository'}</CardTitle>
                        <CardDescription>
                            {activeTab === 'PAPERS'
                                ? 'Deployed assessments available for distribution.'
                                : 'Master library of validated technical questions.'}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'QUESTIONS' && (
                            <Button 
                                variant="secondary" 
                                className="gap-2" 
                                onClick={() => navigate('/test-center/questions')}
                            >
                                管理题库 <ArrowRight size={16} />
                            </Button>
                        )}
                        {activeTab === 'PAPERS' && (
                            <Button 
                                variant="secondary" 
                                className="gap-2" 
                                onClick={() => navigate('/test-center/quizzes')}
                            >
                                管理试卷 <ArrowRight size={16} />
                            </Button>
                        )}
                        <Button className="gap-2" onClick={() => {
                            if (activeTab === 'QUESTIONS') {
                                navigate('/test-center/questions');
                            } else {
                                navigate('/test-center/quizzes');
                            }
                        }}>
                            <Plus size={16} /> Create New {activeTab === 'PAPERS' ? 'Paper' : 'Question'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                            <Input placeholder="Search resources..." className="pl-10 bg-black/20 border-white/10" />
                        </div>
                        <Button variant="secondary" size="icon">
                            <Settings size={18} />
                        </Button>
                    </div>

                    {activeTab === 'PAPERS' ? (
                        <div className="space-y-4">
                            {/* Mock Paper Item */}
                            <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{MOCK_PAPER.title}</h3>
                                            <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">PUBLISHED</Badge>
                                        </div>
                                        <p className="text-sm text-text-muted">{MOCK_PAPER.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-mono font-bold text-white">{MOCK_PAPER.questions.length}</div>
                                        <div className="text-[10px] text-text-muted uppercase">Questions</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-4 text-xs text-text-muted font-mono border-t border-white/5 pt-3">
                                    <span>ID: {MOCK_PAPER.id}</span>
                                    <span>•</span>
                                    <span>Total Points: {MOCK_PAPER.total_score}</span>
                                    <div className="flex-1"></div>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs hover:text-white">Edit</Button>
                                    <Button size="sm" variant="secondary" className="h-7 text-xs">Analytics</Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {MOCK_QUESTIONS.map((q) => {
                                const isCorrectOption = (optKey: string) => {
                                    if (Array.isArray(q.answer)) {
                                        return q.answer.includes(optKey);
                                    }
                                    return q.answer === optKey;
                                };
                                return (
                                    <div key={q.id} className="p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {q.type}
                                            </Badge>
                                            <span className="text-xs text-text-muted font-mono">{q.type}</span>
                                        </div>
                                        <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2">{q.content}</h3>

                                        {q.options && (
                                            <div className="flex flex-col gap-1 mb-3">
                                                {q.options.slice(0, 2).map((opt, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs text-text-muted">
                                                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${isCorrectOption(opt.key) ? 'border-primary bg-primary/20' : 'border-white/20'}`}>
                                                            {isCorrectOption(opt.key) && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                        </div>
                                                        <span className="truncate">{opt.content}</span>
                                                    </div>
                                                ))}
                                                {q.options.length > 2 && <div className="text-xs text-text-muted italic">+ {q.options.length - 2} more options</div>}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-auto">
                                            <div className="text-xs text-text-muted font-mono">ID: {q.id}</div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                                    <Settings size={12} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
