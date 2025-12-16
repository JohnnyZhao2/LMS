/**
 * PersonalProfile Component
 * Displays user's personal information including name, team, and mentor
 * Requirements: 10.1 - Display name, team, mentor info
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { User, Building2, Users, BadgeCheck, Calendar } from 'lucide-react';
import type { PersonalProfile as PersonalProfileType } from '../api/personal';

interface PersonalProfileProps {
  profile: PersonalProfileType;
  isLoading?: boolean;
}

/**
 * Profile info item component
 */
function ProfileItem({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | undefined;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-muted font-medium">{label}</div>
        <div className="text-sm text-white font-medium truncate">
          {value || '-'}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for profile
 */
function ProfileSkeleton() {
  return (
    <Card className="glass-panel border-white/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <User className="text-primary" size={20} />
          个人信息
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 bg-white/10 rounded" />
              <div className="h-4 w-24 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * PersonalProfile component
 * Displays the user's personal information
 */
export function PersonalProfile({ profile, isLoading }: PersonalProfileProps) {
  if (isLoading) {
    return <ProfileSkeleton />;
  }

  // Format join date
  const joinDate = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  return (
    <Card className="glass-panel border-white/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <User className="text-primary" size={20} />
          个人信息
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Avatar and name section */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {profile.real_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{profile.real_name}</h3>
            <p className="text-sm text-text-muted">@{profile.username}</p>
            <p className="text-xs text-text-muted mt-1">工号: {profile.employee_id}</p>
          </div>
        </div>

        {/* Profile details */}
        <div className="space-y-3">
          <ProfileItem
            icon={Building2}
            label="所属团队"
            value={profile.department?.name}
          />
          
          <ProfileItem
            icon={Users}
            label="指导导师"
            value={profile.mentor?.real_name}
          />
          
          <ProfileItem
            icon={BadgeCheck}
            label="员工编号"
            value={profile.employee_id}
          />
          
          <ProfileItem
            icon={Calendar}
            label="加入时间"
            value={joinDate}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default PersonalProfile;
