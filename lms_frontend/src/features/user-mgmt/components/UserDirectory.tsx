import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Users, Search, Filter, MoreHorizontal, UserPlus, Shield } from "lucide-react";

const MOCK_PERSONNEL = [
    { id: '101', name: 'Cadet Zhao', role: 'STUDENT', team: 'Room 1', level: 3, status: 'ACTIVE', joinDate: '2023-09-01' },
    { id: '102', name: 'Cadet Chen', role: 'STUDENT', team: 'Room 1', level: 4, status: 'ACTIVE', joinDate: '2023-09-01' },
    { id: '103', name: 'Cadet Liu', role: 'STUDENT', team: 'Room 1', level: 2, status: 'PROBATION', joinDate: '2023-09-15' },
    { id: '201', name: 'Mentor Zhang', role: 'MENTOR', team: 'Room 1', level: 8, status: 'ACTIVE', joinDate: '2023-01-10' },
    { id: '202', name: 'Mentor Li', role: 'MENTOR', team: 'Room 2', level: 8, status: 'LEAVE', joinDate: '2023-01-12' },
    { id: '301', name: 'Manager Wang', role: 'MANAGER', team: 'Ops', level: 10, status: 'ACTIVE', joinDate: '2022-11-01' },
];

export function UserDirectory() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                        <Users className="text-primary" /> Personnel Directory
                    </h1>
                    <p className="text-text-muted mt-1">Manage access control and role assignments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2">
                        <DownloadIcon size={16} /> Export CSV
                    </Button>
                    <Button className="gap-2">
                        <UserPlus size={16} /> Induct Officer
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 p-4 glass-panel border-white/5 rounded-lg">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
                    <Input placeholder="Search by name, ID, or unit..." className="pl-9 bg-background border-white/10" />
                </div>
                <Button variant="secondary" className="gap-2">
                    <Filter size={16} /> Filter
                </Button>
            </div>

            {/* Table Card */}
            <Card className="glass-panel border-white/5">
                <CardHeader>
                    <CardTitle>Active Personnel</CardTitle>
                    <CardDescription>Total headcount: {MOCK_PERSONNEL.length}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-white/10 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 text-text-muted font-medium uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Officer</th>
                                    <th className="px-4 py-3">Role & Unit</th>
                                    <th className="px-4 py-3">Clearance</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {MOCK_PERSONNEL.map(user => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-background-tertiary flex items-center justify-center font-bold text-xs ring-1 ring-white/10">
                                                    {user.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white">{user.name}</div>
                                                    <div className="text-xs text-text-muted font-mono">{user.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-text-primary">{user.role}</span>
                                                <span className="text-xs text-text-muted">{user.team}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Shield size={14} className={user.level >= 8 ? "text-accent" : "text-primary"} />
                                                <span className="font-mono">LVL.{user.level}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={user.status === 'ACTIVE' ? 'success' : user.status === 'PROBATION' ? 'warning' : 'secondary'} className="text-[10px]">
                                                {user.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-white">
                                                <MoreHorizontal size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

interface IconProps extends React.ComponentProps<"svg"> {
    size?: number;
}

// Helper icon
function DownloadIcon({ size = 24, ...props }: IconProps) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
    )
}
