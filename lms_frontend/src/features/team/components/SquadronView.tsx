import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, Shield, Cpu, Activity, Signal } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

const MOCK_TEAM_MEMBERS = [
    { id: '1', name: 'Cadet Zhao', role: 'Operator', status: 'ONLINE', level: 3, specialization: 'Frontend' },
    { id: '2', name: 'Cadet Chen', role: 'Operator', status: 'AWAY', level: 4, specialization: 'Backend' },
    { id: '3', name: 'Cadet Liu', role: 'Operator', status: 'OFFLINE', level: 2, specialization: 'DevOps' },
    { id: '4', name: 'Leut. Wang', role: 'LEADER', status: 'ONLINE', level: 6, specialization: 'Full Stack' },
];

export function SquadronView() {
    const { user } = useAuth();

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                        <Users className="text-primary" /> Squadron: {user?.team || "Unknown Unit"}
                    </h1>
                    <p className="text-text-muted mt-1">Operational Status of your assigned unit.</p>
                </div>
                <Badge variant="outline" className="px-4 py-2 border-primary/20 bg-primary/5 text-primary">
                    <Signal size={14} className="mr-2 animate-pulse" /> Live Link Established
                </Badge>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Roster */}
                <Card className="lg:col-span-2 glass-panel border-white/5">
                    <CardHeader>
                        <CardTitle>Unit Roster</CardTitle>
                        <CardDescription>Active personnel in your sector.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {MOCK_TEAM_MEMBERS.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-background-tertiary flex items-center justify-center font-bold text-text-secondary border border-white/10">
                                        {member.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {member.name}
                                            {member.role === 'LEADER' && <Shield size={14} className="text-accent" />}
                                        </div>
                                        <div className="text-xs text-text-muted flex items-center gap-2">
                                            <span className="font-mono text-primary">LVL.{member.level}</span>
                                            <span>•</span>
                                            <span>{member.specialization}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={member.status === 'ONLINE' ? 'success' : member.status === 'AWAY' ? 'warning' : 'secondary'} className="w-20 justify-center">
                                        {member.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Squadron Stats Sidebar */}
                <div className="space-y-6">
                    <Card className="glass-panel border-white/5">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity size={18} className="text-accent" /> Performance Metrics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-text-muted">Unit Velocity</span>
                                    <span className="text-white font-mono">142 SP/Sprint</span>
                                </div>
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent w-[85%]" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-text-muted">Task Completion</span>
                                    <span className="text-white font-mono">94%</span>
                                </div>
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[94%]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-white/5 bg-primary/5">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-primary/10 rounded text-primary">
                                    <Cpu size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">Squadron Directive</h4>
                                    <p className="text-sm text-text-secondary leading-relaxed">
                                        Focus efforts on "Network Security Fundamentals" module. All hands verification required by Friday 1800.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
