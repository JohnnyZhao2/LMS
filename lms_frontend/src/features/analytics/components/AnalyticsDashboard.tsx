import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarChart as BarChartIcon, TrendingUp, Users, Target, Calendar } from "lucide-react";

export function AnalyticsDashboard() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                        <TrendingUp className="text-primary" /> Strategic Analytics
                    </h1>
                    <p className="text-text-muted mt-1">Long-term performance trends and training ROI analysis.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Calendar size={14} /> Last 30 Days
                    </Button>
                    <Button size="sm" className="gap-2">
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Big Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Learners', value: '1,204', change: '+12%', icon: Users },
                    { label: 'Completion Rate', value: '78.5%', change: '+5.2%', icon: Target },
                    { label: 'Avg Assessment Score', value: '82/100', change: '+1.8%', icon: BarChartIcon },
                    { label: 'Training Hours', value: '12,450', change: '+8%', icon: Calendar },
                ].map((stat, i) => (
                    <Card key={i} className="glass-panel border-white/5">
                        <CardContent className="p-4 pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-text-muted text-sm font-medium">{stat.label}</div>
                                    <div className="text-2xl font-bold text-white mt-2 font-mono">{stat.value}</div>
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg text-primary">
                                    <stat.icon size={20} />
                                </div>
                            </div>
                            <div className="mt-4 text-xs font-medium text-status-success flex items-center">
                                <TrendingUp size={12} className="mr-1" />
                                {stat.change} <span className="text-text-muted ml-1">vs last month</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Simulated Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-panel border-white/5">
                    <CardHeader>
                        <CardTitle>Engagement Trends</CardTitle>
                        <CardDescription>Daily active users over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64 flex items-end gap-2 px-2 pb-2">
                        {Array.from({ length: 24 }).map((_, i) => {
                            const height = 30 + ((i * 7) % 60);
                            return (
                                <div
                                    key={i}
                                    className="flex-1 bg-primary/20 hover:bg-primary/50 transition-colors rounded-t-sm"
                                    style={{ height: `${height}%` }}
                                />
                            )
                        })}
                    </CardContent>
                </Card>

                <Card className="glass-panel border-white/5">
                    <CardHeader>
                        <CardTitle>Skill Proficiency Heatmap</CardTitle>
                        <CardDescription>Performance density across departments.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64 flex flex-col justify-center space-y-2">
                        {[
                            { dept: 'Frontend', values: [80, 85, 90, 70, 60] },
                            { dept: 'Backend', values: [60, 70, 80, 85, 90] },
                            { dept: 'DevOps', values: [50, 60, 70, 80, 85] },
                            { dept: 'QA', values: [70, 75, 80, 85, 90] },
                        ].map((row, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-20 text-xs text-text-muted font-mono">{row.dept}</div>
                                <div className="flex-1 flex gap-1">
                                    {row.values.map((val, j) => (
                                        <div
                                            key={j}
                                            className="h-8 flex-1 rounded-sm"
                                            style={{
                                                backgroundColor: `rgb(0, 229, 255, ${val / 100})`, // Primary color with opacity
                                                opacity: 0.8
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
