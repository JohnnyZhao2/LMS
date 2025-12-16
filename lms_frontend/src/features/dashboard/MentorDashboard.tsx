import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, AlertCircle, FilePlus, Activity, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { USERS } from "@/features/auth/constants";
import { MOCK_TASKS } from "@/testing/mocks";

export function MentorDashboard() {
    const [alertSent, setAlertSent] = useState(false);

    // Mock calculations
    const activeOperators = Object.values(USERS).filter(u => u.role === 'STUDENT').length * 4; // Mock multiplier for visual filling
    const pendingReviews = MOCK_TASKS.filter(t => t.status === 'ACTIVE').length;
    const criticalAlerts = 2; // Keep static for now or random
    const competency = 94;

    const handleBroadcast = () => {
        setAlertSent(true);
        setTimeout(() => setAlertSent(false), 3000);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
                        Command Center
                    </h1>
                    <p className="text-text-muted mt-1">Squadron Status: <span className="text-status-success">OPTIMAL</span></p>
                </div>

                <div className="flex gap-3">
                    <Link to="/tasks/create">
                        <Button className="gap-2">
                            <FilePlus size={16} /> New Directive
                        </Button>
                    </Link>
                    <Button
                        variant="secondary"
                        className={`gap-2 transition-all ${alertSent ? 'bg-status-success text-black' : ''}`}
                        onClick={handleBroadcast}
                    >
                        {alertSent ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {alertSent ? 'Alert Sent' : 'Broadcast Alert'}
                    </Button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="glass-panel p-4 border-l-4 border-l-primary flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold font-mono text-white">{activeOperators}</div>
                        <div className="text-xs text-text-muted uppercase tracking-wider">Active Operators</div>
                    </div>
                </Card>
                <Card className="glass-panel p-4 border-l-4 border-l-status-warning flex items-center gap-4">
                    <div className="p-3 bg-status-warning/10 rounded-full text-status-warning">
                        <Clock size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold font-mono text-white">{pendingReviews}</div>
                        <div className="text-xs text-text-muted uppercase tracking-wider">Pending Tasks</div>
                    </div>
                </Card>
                <Card className="glass-panel p-4 border-l-4 border-l-status-error flex items-center gap-4">
                    <div className="p-3 bg-status-error/10 rounded-full text-status-error">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold font-mono text-white">{criticalAlerts}</div>
                        <div className="text-xs text-text-muted uppercase tracking-wider">Critical Alerts</div>
                    </div>
                </Card>
                <Card className="glass-panel p-4 border-l-4 border-l-accent flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-full text-accent">
                        <Activity size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold font-mono text-white">{competency}%</div>
                        <div className="text-xs text-text-muted uppercase tracking-wider">Avg Competency</div>
                    </div>
                </Card>
            </div>

            {/* Main Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Squad Status List */}
                <Card className="lg:col-span-2 glass-panel border-white/5">
                    <CardHeader>
                        <CardTitle>Squadron Live Status</CardTitle>
                        <CardDescription>Real-time operator activity monitoring.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {[
                                { name: 'Cadet Zhao', status: 'Online', activity: 'Completing Network Drill', time: '2m ago' },
                                { name: 'Cadet Chen', status: 'Online', activity: 'Reading Knowledge Base', time: '5m ago' },
                                { name: 'Cadet Liu', status: 'Away', activity: 'Idle', time: '15m ago' },
                                { name: 'Cadet Wang', status: 'Offline', activity: 'Last seen: 2h ago', time: '--' },
                            ].map((user, i) => (
                                <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${user.status === 'Online' ? 'bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : user.status === 'Away' ? 'bg-status-warning' : 'bg-white/20'}`} />
                                        <div>
                                            <div className="font-semibold text-white text-sm">{user.name}</div>
                                            <div className="text-xs text-text-muted">{user.activity}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-text-muted">{user.time}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Tasks List */}
                <Card className="glass-panel border-white/5">
                    <CardHeader>
                        <CardTitle>Pending Missions</CardTitle>
                        <CardDescription>Tasks requiring intervention.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {MOCK_TASKS.slice(0, 3).map((item, i) => (
                            <div key={i} className="p-3 bg-white/5 rounded border border-white/5 hover:border-primary/20 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold bg-primary/20 text-primary px-1.5 rounded">{item.type}</span>
                                    <span className="text-[10px] text-text-muted">{new Date(item.deadline).toLocaleDateString('zh-CN')}</span>
                                </div>
                                <h4 className="text-sm font-medium text-white mb-1 line-clamp-1">{item.title}</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-text-muted">by {item.created_by.real_name}</span>
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] bg-white/5 hover:bg-status-success/20 hover:text-status-success">
                                        Check
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Link to="/reports">
                            <Button variant="outline" className="w-full text-xs text-text-muted">
                                View Intelligence Reports
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
