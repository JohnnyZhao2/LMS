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
import { motion } from 'framer-motion';
import { useStudentDashboard } from '../api/student-dashboard';
import { useRoleNavigate } from '@/hooks/use-role-navigate';
import dayjs from '@/lib/dayjs';
import { StatCard, Skeleton, Card } from '@/components/ui';
import type { LatestKnowledge } from '@/types/api';
import { cn } from '@/lib/utils';

/**
 * 迷你学习日历组件 (Study Calendar Placeholder)
 */
interface MiniCalendarProps {
  className?: string;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ className }) => {
  const monthNum = dayjs().format('MM');
  const year = dayjs().format('YYYY');
  const daysInMonth = dayjs().daysInMonth();
  const startDay = dayjs().startOf('month').day();
  const currentDay = dayjs().date();

  // 模拟有任务的日期
  const activeDays = [5, 12, 18, 26, 29];

  return (
    <Card className={cn(
      "relative border-border/40 bg-[#fdfdfd] shadow-2xl shadow-slate-200/40 flex flex-col overflow-hidden group/calendar transition-all duration-700 hover:shadow-primary-500/5",
      className
    )}>
      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 400; }
          to { stroke-dashoffset: 0; }
        }
        .animate-draw {
          animation: draw 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      {/* 极简氛围层：模拟纸张纹理 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-50 to-transparent opacity-50" />

      {/* 全局悬挂导轨 & 挂钩 (Architectural Rail System) */}
      <div className="absolute top-0 inset-x-0 h-1 bg-slate-100/50 z-20" />
      <div className="absolute top-0 left-0 right-0 flex justify-center gap-48 pointer-events-none z-30">
        <div className="relative w-2 h-6 bg-slate-900 rounded-b-sm shadow-xl shadow-black/10">
          <div className="absolute top-0 inset-x-0 h-1 bg-black/20" /> {/* 顶部阴影 */}
        </div>
        <div className="relative w-2 h-6 bg-slate-900 rounded-b-sm shadow-xl shadow-black/10">
          <div className="absolute top-0 inset-x-0 h-1 bg-black/20" />
        </div>
      </div>

      {/* 顶部标题区：非对称“北欧杂志”排版 - 压缩布局 (Editorial Header - Compact Path) */}
      <div className="relative z-10 px-8 pt-8 pb-2 flex items-start justify-between">
        <div className="relative">
          {/* 月份数字：作为半透明结构背板 */}
          <span className="absolute -left-2 -top-4 text-[110px] font-black text-slate-900/[0.03] tracking-tighter leading-none italic select-none">
            {monthNum}
          </span>
          {/* 实文排版 */}
          <div className="relative flex flex-col pt-4 pl-1">
            <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none flex items-baseline gap-2">
              {monthNum}
              <span className="text-[11px] font-black text-primary-500 uppercase tracking-[0.4em]">Jan</span>
            </span>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-0.5 w-10 bg-slate-900" />
              <span className="text-[9px] font-black text-slate-400 font-mono tracking-[0.2em] uppercase">Calendar_2026</span>
            </div>
          </div>
        </div>

        {/* 右侧年份：垂直侧显 */}
        <div className="flex flex-col items-end pt-4">
          <div className="flex flex-col items-center gap-1 opacity-20">
            <div className="w-1 h-1 rounded-full bg-slate-900" />
            <div className="w-px h-8 bg-slate-900" />
          </div>
          <span className="text-[12px] font-black text-slate-900 mt-2 font-mono tracking-widest [writing-mode:vertical-rl] rotate-180">
            {year}
          </span>
        </div>
      </div>

      {/* 撕纸虚线语义 */}
      <div className="relative z-10 mx-8 border-b border-dashed border-slate-100" />

      {/* 日历主体网格 - 压缩间距 */}
      <div className="relative z-10 px-8 pb-10 pt-4 flex-1 flex flex-col">
        <div className="grid grid-cols-7 mb-8">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <span key={d} className="text-[9px] font-black text-slate-300 text-center tracking-[0.3em]">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === currentDay;
            const hasTask = activeDays.includes(day);

            return (
              <div key={day} className="aspect-square relative flex items-center justify-center cursor-pointer group/day">
                {/* 悬停反馈 */}
                {!isToday && (
                  <div className="absolute inset-2 rounded-full bg-slate-50 opacity-0 transition-all duration-300 group-hover/day:opacity-100 scale-75 group-hover/day:scale-100" />
                )}

                {isToday ? (
                  /* 选中状态：动态“非闭合手绘圆圈” - 极简人文感 */
                  <div className="relative w-12 h-12 flex items-center justify-center z-20">
                    <svg className="absolute inset-0 w-full h-full text-primary-500/40 -rotate-[10deg] scale-110" viewBox="0 0 100 100">
                      <path
                        d="M35,15 C55,10 85,25 90,50 C95,75 75,90 50,92 C25,94 10,75 12,50 C14,25 35,15 42,18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="animate-draw"
                        style={{ strokeDasharray: 400, strokeDashoffset: 400 }}
                      />
                    </svg>
                    <span className="relative text-xl font-serif italic font-bold text-slate-950 leading-none">
                      {day}
                    </span>
                  </div>
                ) : (
                  /* 常规日期 - 视觉降噪处理 */
                  <div className="relative w-10 h-10 flex flex-col items-center justify-center transition-all duration-300">
                    <span className={cn(
                      "text-[14px] font-black transition-colors duration-300",
                      "text-slate-500 group-hover/day:text-slate-950"
                    )}>
                      {day}
                    </span>
                    {hasTask && (
                      <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-400/30 ring-1 ring-primary-500/10 transition-all duration-300 group-hover/day:scale-125" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

/**
 * 同伴进度组件 (Peer Progress - Clean Modern)
 */
const PeerProgress: React.FC = () => {
  const peers = [
    { name: 'Maria R.', progress: 92, avatar: 'M' },
    { name: 'David K.', progress: 88, avatar: 'D' },
    { name: 'You', progress: 85, avatar: 'Y', isMe: true },
    { name: 'Sarah L.', progress: 81, avatar: 'S' },
  ];

  return (
    <Card className="p-6 border-slate-200/60 bg-white shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Users size={16} />
          </div>
          <span className="font-bold text-sm text-slate-800">同伴进度</span>
        </div>
        <TrendingUp className="w-4 h-4 text-emerald-500" />
      </div>

      <div className="space-y-5">
        {peers.map((peer) => (
          <div key={peer.name} className="flex items-center gap-4">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border",
              peer.isMe
                ? "bg-primary-600 border-primary-600 text-white"
                : "bg-slate-50 border-slate-100 text-slate-500"
            )}>
              {peer.avatar}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className={cn(
                  "text-xs font-bold truncate",
                  peer.isMe ? "text-primary-600" : "text-slate-700"
                )}>
                  {peer.name}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{peer.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${peer.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    peer.isMe ? "bg-primary-500" : "bg-emerald-400"
                  )}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const KnowledgeCard: React.FC<{
  knowledge: LatestKnowledge;
  roleNavigate: (path: string) => void;
}> = ({ knowledge, roleNavigate }) => {
  return (
    <div
      onClick={() => roleNavigate(`knowledge/${knowledge.id}`)}
      className="group/item flex flex-col p-5 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 cursor-pointer transition-all duration-300 h-[180px]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
            New
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {dayjs(knowledge.updated_at).format('YYYY.MM.DD')}
          </span>
        </div>
      </div>

      <h5 className="font-bold text-slate-800 text-sm mb-2 group-hover/item:text-emerald-700 transition-colors line-clamp-1">
        {knowledge.title}
      </h5>

      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-4">
        {knowledge.content_preview || '查看详情了解更多知识内容...'}
      </p>

      <div className="mt-auto flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
        <span>阅读详情</span>
        <ArrowRight className="w-3 h-3 group-hover/item:translate-x-0.5 transition-transform" />
      </div>
    </div>
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
          <MiniCalendar className="shadow-sm" />
        </div>

        {/* 第二行：知识速递 (8) + 同伴/贴士 (4) */}
        <div className="lg:col-span-8">
          <Card className="h-full border-border/50 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 pt-6 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <BookOpen size={16} />
                </div>
                <span className="font-bold text-sm text-slate-800">知识速递</span>
              </div>
              <button
                onClick={() => roleNavigate('knowledge')}
                className="text-[11px] font-bold text-slate-400 hover:text-emerald-600 transition-all flex items-center gap-1 group/all"
              >
                查看全部
                <ArrowRight className="w-3 h-3 group-hover/all:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {isLoading ? (
                  [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[180px] rounded-2xl" />)
                ) : data?.latest_knowledge?.slice(0, 4).map((knowledge) => (
                  <KnowledgeCard
                    key={knowledge.id}
                    knowledge={knowledge}
                    roleNavigate={roleNavigate}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <PeerProgress />
        </div>
      </div>
    </div>
  );
};
