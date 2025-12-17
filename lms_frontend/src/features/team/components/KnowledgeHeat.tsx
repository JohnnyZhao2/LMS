/**
 * KnowledgeHeat Component
 * Displays knowledge document reading statistics ranking
 * Requirements: 20.3
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useKnowledgeHeat } from "../api/get-knowledge-heat";
import type { KnowledgeHeatItem } from "../api/types";
import { Flame, Eye, CheckCircle2, BookOpen, TrendingUp } from "lucide-react";

/**
 * Get heat level based on view count
 */
function getHeatLevel(viewCount: number, maxViews: number): "hot" | "warm" | "normal" {
  const ratio = viewCount / maxViews;
  if (ratio >= 0.7) return "hot";
  if (ratio >= 0.4) return "warm";
  return "normal";
}

/**
 * Heat indicator component
 */
function HeatIndicator({ level }: { level: "hot" | "warm" | "normal" }) {
  const config = {
    hot: { color: "text-status-error", bg: "bg-status-error/10", label: "热门" },
    warm: { color: "text-status-warning", bg: "bg-status-warning/10", label: "较热" },
    normal: { color: "text-text-muted", bg: "bg-white/5", label: "一般" },
  };

  const { color, bg, label } = config[level];

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded ${bg}`}>
      <Flame size={12} className={color} />
      <span className={`text-xs ${color}`}>{label}</span>
    </div>
  );
}

/**
 * Knowledge heat item row component
 */
function KnowledgeHeatRow({ 
  item, 
  rank,
  maxViews 
}: { 
  item: KnowledgeHeatItem;
  rank: number;
  maxViews: number;
}) {
  const heatLevel = getHeatLevel(item.view_count, maxViews);
  
  // Rank badge styling
  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (rank === 2) return "bg-gray-400/20 text-gray-300 border-gray-400/30";
    if (rank === 3) return "bg-amber-600/20 text-amber-500 border-amber-600/30";
    return "bg-white/5 text-text-muted border-white/10";
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
      {/* Rank */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border ${getRankStyle(rank)}`}>
        {rank}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-white truncate">{item.title}</span>
          <HeatIndicator level={heatLevel} />
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <Badge variant="secondary" className="text-xs">
            {item.primary_category}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-text-muted">
          <Eye size={14} />
          <span className="font-mono text-white">{item.view_count}</span>
          <span className="text-xs">阅读</span>
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <CheckCircle2 size={14} className="text-status-success" />
          <span className="font-mono text-white">{item.completion_count}</span>
          <span className="text-xs">完成</span>
        </div>
      </div>
    </div>
  );
}

/**
 * KnowledgeHeat main component
 * Requirements: 20.3
 */
export function KnowledgeHeat() {
  const { data, isLoading, error, refetch } = useKnowledgeHeat();

  // Loading state
  if (isLoading) {
    return (
      <Card className="glass-panel border-white/5">
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="glass-panel border-white/5">
        <CardContent className="p-6">
          <ErrorState
            title="加载失败"
            message="无法加载知识热度数据"
            onRetry={refetch}
          />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.items.length === 0) {
    return (
      <Card className="glass-panel border-white/5">
        <CardContent className="p-6">
          <EmptyState
            title="暂无数据"
            description="当前没有知识文档阅读记录"
          />
        </CardContent>
      </Card>
    );
  }

  // Calculate max views for heat level calculation
  const maxViews = Math.max(...data.items.map(item => item.view_count), 1);

  return (
    <Card className="glass-panel border-white/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} className="text-accent" />
              知识热度排行
            </CardTitle>
            <CardDescription>
              知识文档阅读统计排行榜
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <BookOpen size={14} />
            <span>共 {data.total_count} 篇文档</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.items.map((item, index) => (
            <KnowledgeHeatRow 
              key={item.id} 
              item={item} 
              rank={index + 1}
              maxViews={maxViews}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
