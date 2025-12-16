/**
 * TeamDashboard Component
 * Main dashboard page for team managers
 * Combines TeamOverview and KnowledgeHeat components
 * Requirements: 20.1, 20.4
 * 
 * Note: This is a READ-ONLY view for team managers.
 * All edit/create/delete operations are hidden per Requirements 20.4
 */

import { Badge } from "@/components/ui/Badge";
import { BarChart3, Eye } from "lucide-react";
import { TeamOverview } from "./TeamOverview";
import { KnowledgeHeat } from "./KnowledgeHeat";

/**
 * TeamDashboard main component
 * Requirements: 20.1, 20.4
 */
export function TeamDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="text-primary" />
            团队数据看板
          </h1>
          <p className="text-text-muted mt-1">
            跨团队数据分析与知识热度统计
          </p>
        </div>
        {/* Read-only indicator - Requirements: 20.4 */}
        <Badge 
          variant="secondary" 
          className="px-4 py-2 bg-white/5 border border-white/10 text-text-muted"
        >
          <Eye size={14} className="mr-2" />
          只读视图
        </Badge>
      </div>

      {/* Team Overview Section - Requirements: 20.1, 20.2 */}
      <section>
        <TeamOverview />
      </section>

      {/* Knowledge Heat Section - Requirements: 20.3 */}
      <section>
        <KnowledgeHeat />
      </section>
    </div>
  );
}
