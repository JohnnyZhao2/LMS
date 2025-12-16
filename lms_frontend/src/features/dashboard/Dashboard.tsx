/**
 * Dashboard Component
 * Routes to appropriate dashboard based on current role
 * Requirements: 4.1, 11.1
 */

import { useAuth } from "@/features/auth/AuthContext";
import { StudentDashboard } from "./StudentDashboard";
import { MentorDashboard } from "./MentorDashboard";
import { ROLE_CODES } from "@/config/roles";

export function Dashboard() {
    const { user, currentRole } = useAuth();

    if (!user) return null;

    // Student role shows StudentDashboard
    if (currentRole === ROLE_CODES.STUDENT) {
        return <StudentDashboard />;
    }

    // Mentor, Dept Manager, Admin see MentorDashboard
    if (currentRole === ROLE_CODES.MENTOR || 
        currentRole === ROLE_CODES.DEPT_MANAGER || 
        currentRole === ROLE_CODES.ADMIN) {
        return <MentorDashboard />;
    }

    // Team Manager would have their own dashboard (to be implemented)
    // For now, fallback to MentorDashboard
    return <MentorDashboard />;
}
