import { User, UserRole } from "@/types/domain";

export const USERS: Record<UserRole, User> = {
    STUDENT: {
        id: 'u-student',
        name: 'Cadet Zhao',
        role: 'STUDENT',
        team: 'Room 1',
        level: 3,
        avatarUrl: 'CZ'
    },
    MENTOR: {
        id: 'u-mentor',
        name: 'Mentor Zhang',
        role: 'MENTOR',
        team: 'Room 1',
        level: 8,
        avatarUrl: 'MZ'
    },
    MANAGER: {
        id: 'u-manager',
        name: 'Manager Li',
        role: 'MANAGER',
        team: 'Ops Center',
        level: 10,
        avatarUrl: 'ML'
    },
    ADMIN: {
        id: 'u-admin',
        name: 'SysAdmin',
        role: 'ADMIN',
        team: 'Root',
        level: 99,
        avatarUrl: 'AD'
    },
    TEAM_LEADER: {
        id: 'u-lead',
        name: 'Team Lead Wang',
        role: 'TEAM_LEADER',
        team: 'Room 2',
        level: 6,
        avatarUrl: 'TW'
    }
};
