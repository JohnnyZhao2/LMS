import React from 'react';
import {
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  GraduationCap,
  Calendar as CalendarIcon,
  Trophy,
  Activity,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useStudentDashboard } from '../api/student-dashboard';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import dayjs from '@/lib/dayjs';
import { Skeleton, StatCard, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * 迷你学习日历组件 (Study Calendar Placeholder)
 */
interface MiniCalendarProps {
  className?: string;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ className }) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const currentDay = dayjs().date();

  return (
    <Card className={cn("p-6 border-border/50 bg-card/50 backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary-500" />
          <span className="font-black text-sm text-foreground">学习日历</span>
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">
          {dayjs().format('MMMM YYYY')}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <span key={d} className="text-[9px] font-black text-text-muted pb-2">{d}</span>
        ))}
        {Array.from({ length: dayjs().startOf('month').day() }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(d => (
          <div
            key={d}
            className={cn(
              "aspect-square flex items-center justify-center text-[10px] font-bold rounded-lg transition-all",
              d === currentDay
                ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                : "hover:bg-muted text-text-muted"
            )}
          >
            {d}
          </div>
        ))}
      </div>
    </Card>
  );
};

/**
 * 同伴进度组件 (Peer Progress Placeholder)
 */
const PeerProgress: React.FC = () => {
  const peers = [
    { name: 'Maria R.', progress: 92, avatar: 'M' },
    { name: 'David K.', progress: 88, avatar: 'D' },
    { name: 'You', progress: 85, avatar: 'Y', isMe: true },
    { name: 'Sarah L.', progress: 81, avatar: 'S' },
  ];

  return (
    <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-secondary-500" />
          <span className="font-black text-sm text-foreground">同伴进度</span>
        </div>
        <TrendingUp className="w-3 h-3 text-secondary-500" />
      </div>
      <div className="space-y-4">
        {peers.map((peer) => (
          <div key={peer.name} className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2",
              peer.isMe ? "bg-primary-50 border-primary-200 text-primary-600" : "bg-muted border-border text-text-muted"
            )}>
              {peer.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className={cn("text-[11px] font-bold truncate", peer.isMe ? "text-primary-600" : "text-foreground")}>
                  {peer.name}
                </span>
                <span className="text-[10px] font-black text-text-muted">{peer.progress}%</span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000", peer.isMe ? "bg-primary-500" : "bg-secondary-400")}
                  style={{ width: `${peer.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

/**
 * 学员仪表盘组件 - High-End SaaS Edition
 */
export const StudentDashboard: React.FC = () => {
  const { data, isLoading } = useStudentDashboard();
  const { roleNavigate } = useRoleNavigate();

  // 计算紧迫任务
  const urgentTasksCount = data?.pending_tasks?.filter(task => {
    const hoursAway = dayjs(task.deadline).diff(dayjs(), 'hour');
    return hoursAway > 0 && hoursAway <= 48;
  }).length || 0;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-2">

      {/* 顶部统计指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="进行中任务"
          value={data?.pending_tasks?.length || 0}
          icon={Activity}
          accentClassName="bg-primary-500"
          subtitle="当前分配"
          delay="stagger-delay-1"
        />
        <StatCard
          title="即将截止"
          value={urgentTasksCount}
          icon={AlertCircle}
          accentClassName="bg-rose-500"
          subtitle="48h 内到期"
          delay="stagger-delay-2"
        />
        <StatCard
          title="完成率"
          value="85%"
          icon={CheckCircle2}
          accentClassName="bg-emerald-500"
          trend={{ value: '12%', isUp: true }}
          delay="stagger-delay-3"
        />
        <StatCard
          title="综合学分"
          value="A-"
          icon={Trophy}
          accentClassName="bg-amber-500"
          subtitle="从上月提升"
          delay="stagger-delay-4"
        />
      </div>

      {/* 主布局：使用统一的 12 列 Grid 确保对齐 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* 第一行：任务中心 (8) + 日历 (4) - 高度对齐 */}
        <div className="lg:col-span-8">
          <Card className="h-full border-border/50 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 pt-6 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary-500" />
                <span className="font-black text-sm text-foreground">任务中心</span>
              </div>
            </div>

            <div className="px-6 pb-6 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoading ? (
                  [1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
                ) : data?.pending_tasks && data.pending_tasks.length > 0 ? (
                  data.pending_tasks.map((task) => {
                    const now = dayjs();
                    const deadline = dayjs(task.deadline);
                    const isUrgent = deadline.isAfter(now) && deadline.diff(now, 'hour') <= 48;

                    return (
                      <div
                        key={task.id}
                        onClick={() => roleNavigate(`tasks/${task.task_id}`)}
                        className="group/item relative flex flex-col p-5 rounded-2xl border border-border/60 hover:border-primary-200 hover:bg-primary-50/5 cursor-pointer transition-all duration-300"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className={cn(
                            "p-2 rounded-lg transition-colors",
                            isUrgent ? "bg-rose-50 text-rose-500" : "text-slate-400 group-hover/item:text-primary-500"
                          )}>
                            {task.task_title.includes('考试') ? <GraduationCap size={18} /> : <FileText size={18} />}
                          </div>
                          {isUrgent && (
                            <div className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded uppercase">
                              即将截止
                            </div>
                          )}
                        </div>

                        <h4 className="font-bold text-foreground text-sm mb-3 group-hover/item:text-primary-600 transition-colors line-clamp-2 leading-snug h-10">
                          {task.task_title}
                        </h4>

                        <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-text-muted">
                            <Clock className={cn("w-3.5 h-3.5 transition-colors", isUrgent ? "text-rose-500" : "group-hover/item:text-primary-400")} />
                            <span className={cn("text-[10px] font-bold transition-colors", isUrgent ? "text-rose-500" : "text-text-muted group-hover/item:text-primary-500")}>
                              {dayjs(task.deadline).format('MM.DD HH:mm')}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover/item:text-primary-500 group-hover/item:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-8 flex flex-col items-center justify-center text-center opacity-40">
                    <Trophy className="w-10 h-10 text-slate-300 mb-2" />
                    <h4 className="text-sm font-bold text-foreground">任务全部完成！</h4>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <MiniCalendar className="h-full shadow-sm" />
        </div>

        {/* 第二行：知识速递 (8) + 同伴/贴士 (4) */}
        <div className="lg:col-span-8">
          <Card className="border-border/50 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 pt-6 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-secondary-500" />
                <span className="font-black text-sm text-foreground">知识速递</span>
              </div>
              <button
                onClick={() => roleNavigate('knowledge')}
                className="text-[10px] font-bold text-secondary-600 hover:text-secondary-700 transition-colors flex items-center gap-0.5"
              >
                查看全部 <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data?.latest_knowledge?.slice(0, 4).map((knowledge) => (
                  <div
                    key={knowledge.id}
                    onClick={() => roleNavigate(`knowledge/${knowledge.id}`)}
                    className="group/item flex flex-col p-5 rounded-2xl border border-border/60 hover:border-secondary-200 hover:bg-secondary-50/5 cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black text-secondary-600/70">NEW</span>
                      <span className="text-[9px] font-bold text-text-muted">
                        {dayjs(knowledge.updated_at).format('YYYY.MM.DD')}
                      </span>
                    </div>
                    <h5 className="font-bold text-foreground text-sm mb-2 group-hover:text-secondary-600 transition-colors leading-snug line-clamp-1">
                      {knowledge.title}
                    </h5>
                    <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mb-3">
                      {knowledge.content_preview || '暂无详细内容'}
                    </p>
                    <div className="mt-auto flex items-center gap-1 text-[10px] font-black text-secondary-600/80">
                      阅读详情 <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <PeerProgress />

          {/* 温馨提示卡片 */}
          <Card className="p-6 bg-gradient-to-br from-primary-600 to-indigo-700 text-white border-0 overflow-hidden relative">
            <div className="relative z-10">
              <h4 className="font-black text-lg mb-2">学习小贴士</h4>
              <p className="text-xs text-primary-100 font-medium leading-relaxed opacity-90">
                “博观而约取，厚积而薄发。” 保持节奏，每天进步一点点。
              </p>
            </div>
            <Trophy className="absolute -right-4 -bottom-4 w-20 h-20 text-white/10 rotate-12" />
          </Card>
        </div>
      </div>
    </div>
  );
};
