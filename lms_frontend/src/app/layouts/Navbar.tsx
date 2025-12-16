import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { LayoutDashboard, CheckSquare, BookOpen, Users, Bell, FileEdit, BarChart, Shield } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { UserRole } from "@/types/domain";

export function Navbar() {
    const location = useLocation();
    const { user } = useAuth();

    if (!user) return null;

    const getNavItems = (role: UserRole) => {
        const common = { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard };

        switch (role) {
            case 'MENTOR':
                return [
                    common,
                    { label: "Team Status", path: "/team", icon: Users },
                    { label: "Test Center", path: "/test-center", icon: FileEdit },
                    { label: "Reports", path: "/reports", icon: BarChart },
                ];
            case 'MANAGER':
            case 'ADMIN':
                return [
                    common,
                    { label: "Operations", path: "/ops", icon: ActivityIcon },
                    { label: "Personnel", path: "/users", icon: Users },
                    { label: "Analytics", path: "/analytics", icon: BarChart },
                ];
            default: // STUDENT
                return [
                    common,
                    { label: "Mission Logs", path: "/tasks", icon: CheckSquare },
                    { label: "Knowledge Base", path: "/knowledge", icon: BookOpen },
                    { label: "Squadron", path: "/team", icon: Users },
                ];
        }
    };

    const navItems = getNavItems(user.role);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">

                {/* Logo Area */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center font-bold text-black font-heading">
                        L
                    </div>
                    <span className="font-heading font-bold text-lg tracking-tight text-white hidden md:block">
                        LMS <span className="text-primary">Ops</span>
                    </span>
                    <Badge variant="outline" className="ml-2 text-[10px] hidden md:flex border-white/10">BETA 2.0</Badge>
                </div>

                {/* Navigation */}
                <nav className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        const Icon = item.icon;
                        return (
                            <Link key={item.path} to={item.path}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn("gap-2", isActive && "bg-white/10 text-white")}
                                >
                                    <Icon size={16} />
                                    <span className="hidden md:inline">{item.label}</span>
                                </Button>
                            </Link>
                        )
                    })}
                </nav>

                {/* User / Actions */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="text-text-muted hover:text-white">
                        <Bell size={20} />
                    </Button>

                    <div className="h-4 w-[1px] bg-white/10 mx-1" />

                    <div className="flex items-center gap-3 pl-2">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-white">{user.name}</div>
                            <div className="text-[10px] font-mono text-primary">LVL.{user.level} {user.role}</div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-secondary border border-white/10 flex items-center justify-center text-xs font-bold ring-2 ring-transparent hover:ring-primary/50 transition-all cursor-pointer">
                            {user.avatarUrl || user.name.slice(0, 2).toUpperCase()}
                        </div>
                    </div>
                </div>

            </div>
        </header>
    );
}

// Helper for Manager Icon
function ActivityIcon(props: React.ComponentProps<typeof Shield>) {
    return <Shield {...props} />
}

