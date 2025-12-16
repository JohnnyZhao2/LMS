import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight, ArrowLeft, Check, FileText, Target, Calendar, Users, Save } from "lucide-react";
import { Link } from "react-router-dom";

import { useNavigate } from "react-router-dom";

type WizardStep = 'TYPE' | 'DETAILS' | 'ASSIGNEE' | 'REVIEW';

export function TaskWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState<WizardStep>('TYPE');
    const [taskData, setTaskData] = useState({
        type: 'LEARN',
        title: '',
        description: '',
        deadline: '',
        assignee: 'Room 1'
    });

    const isStepComplete = (currentStep: WizardStep) => {
        switch (currentStep) {
            case 'TYPE': return !!taskData.type;
            case 'DETAILS': return !!taskData.title && !!taskData.description;
            case 'ASSIGNEE': return !!taskData.assignee;
            default: return true;
        }
    };

    const nextStep = () => {
        if (!isStepComplete(step)) return;
        const steps: WizardStep[] = ['TYPE', 'DETAILS', 'ASSIGNEE', 'REVIEW'];
        const idx = steps.indexOf(step);
        if (idx < steps.length - 1) setStep(steps[idx + 1]);
    };

    const prevStep = () => {
        const steps: WizardStep[] = ['TYPE', 'DETAILS', 'ASSIGNEE', 'REVIEW'];
        const idx = steps.indexOf(step);
        if (idx > 0) setStep(steps[idx - 1]);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white tracking-tight">New Directive</h1>
                    <p className="text-text-muted mt-1">Assign a new mission or learning module to your squadron.</p>
                </div>
                <Link to="/dashboard">
                    <Button variant="ghost">Cancel</Button>
                </Link>
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -z-10" />
                {['TYPE', 'DETAILS', 'ASSIGNEE', 'REVIEW'].map((s, i) => {
                    const isCompleted = ['TYPE', 'DETAILS', 'ASSIGNEE', 'REVIEW'].indexOf(step) > i;
                    const isCurrent = step === s;
                    return (
                        <div key={s} className={`flex flex-col items-center gap-2 ${isCurrent ? 'text-primary' : isCompleted ? 'text-white' : 'text-text-muted'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isCurrent ? 'bg-primary text-black scale-110 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : isCompleted ? 'bg-white/20' : 'bg-background border border-white/10'}`}>
                                {isCompleted ? <Check size={14} /> : i + 1}
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider">{s}</span>
                        </div>
                    );
                })}
            </div>

            {/* Wizard Content */}
            <Card className="glass-panel border-white/5 min-h-[400px] flex flex-col">
                <CardContent className="flex-1 p-8">
                    {step === 'TYPE' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white mb-6">Select Directive Type</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { id: 'LEARN', icon: FileText, label: 'Learning Module', desc: 'Read docs or complete a course.' },
                                    { id: 'PRACTICE', icon: Target, label: 'Drill / Practice', desc: 'Repeatable checks and quizzes.' },
                                    { id: 'EXAM', icon: FileText, label: 'Assessment', desc: 'Formal graded exam with time limit.' },
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setTaskData(prev => ({ ...prev, type: type.id }))}
                                        className={`p-6 rounded-xl border text-left transition-all group ${taskData.type === type.id ? 'bg-primary/10 border-primary text-white' : 'bg-white/5 border-transparent hover:border-white/10'}`}
                                    >
                                        <type.icon size={32} className={`mb-4 ${taskData.type === type.id ? 'text-primary group-hover:scale-110' : 'text-text-muted'} transition-transform`} />
                                        <div className="font-bold text-lg mb-2">{type.label}</div>
                                        <div className="text-sm text-text-muted leading-relaxed">{type.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'DETAILS' && (
                        <div className="max-w-lg mx-auto space-y-6">
                            <h2 className="text-xl font-bold text-white mb-6">Directive Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase text-text-muted font-bold mb-2 block">Title</label>
                                    <Input
                                        value={taskData.title}
                                        onChange={(e) => setTaskData(p => ({ ...p, title: e.target.value }))}
                                        placeholder="e.g. Core Switch Standard Ops"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-text-muted font-bold mb-2 block">Description</label>
                                    <textarea
                                        className="w-full h-32 bg-black/20 border border-white/10 rounded-md p-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors resize-none"
                                        value={taskData.description}
                                        onChange={(e) => setTaskData(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Brief and specific instructions..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-text-muted font-bold mb-2 block">Deadline</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                        <Input
                                            type="date"
                                            className="pl-10"
                                            value={taskData.deadline}
                                            onChange={(e) => setTaskData(p => ({ ...p, deadline: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'ASSIGNEE' && (
                        <div className="max-w-lg mx-auto space-y-6">
                            <h2 className="text-xl font-bold text-white mb-6">Assign To</h2>
                            <div className="space-y-4">
                                {['Room 1', 'Room 2', 'Ops Center', 'All Cadets'].map(group => (
                                    <button
                                        key={group}
                                        onClick={() => setTaskData(p => ({ ...p, assignee: group }))}
                                        className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${taskData.assignee === group ? 'border-primary bg-primary/10 text-white' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Users size={20} className={taskData.assignee === group ? 'text-primary' : 'text-text-muted'} />
                                            <span className="font-semibold">{group}</span>
                                        </div>
                                        {taskData.assignee === group && <Check size={20} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'REVIEW' && (
                        <div className="max-w-lg mx-auto space-y-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Check className="text-primary" /> Ready to Deploy?
                            </h2>
                            <div className="bg-white/5 rounded-lg border border-white/5 p-6 space-y-4">
                                <div className="flex justify-between border-b border-white/5 pb-4">
                                    <span className="text-text-muted">Type</span>
                                    <Badge>{taskData.type}</Badge>
                                </div>
                                <div className="border-b border-white/5 pb-4">
                                    <span className="text-text-muted text-xs uppercase block mb-1">Title</span>
                                    <div className="text-lg font-bold text-white">{taskData.title}</div>
                                </div>
                                <div className="border-b border-white/5 pb-4">
                                    <span className="text-text-muted text-xs uppercase block mb-1">Target Audience</span>
                                    <div className="flex items-center gap-2 text-white">
                                        <Users size={16} className="text-primary" /> {taskData.assignee}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-text-muted text-xs uppercase block mb-1">Deadline</span>
                                    <div className="flex items-center gap-2 text-white">
                                        <Calendar size={16} /> {taskData.deadline || 'No Deadline'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <div className="p-6 border-t border-white/5 flex justify-between bg-black/20">
                    <Button variant="ghost" disabled={step === 'TYPE'} onClick={prevStep}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                        disabled={!isStepComplete(step)}
                        onClick={step === 'REVIEW' ? () => {
                            // Mock deployment
                            console.log('Deploying task:', taskData);
                            navigate('/dashboard'); // Return to dashboard
                        } : nextStep}
                        variant={step === 'REVIEW' ? 'primary' : 'secondary'}
                    >
                        {step === 'REVIEW' ? (
                            <>Deploy <Save className="ml-2 h-4 w-4" /></>
                        ) : (
                            <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
