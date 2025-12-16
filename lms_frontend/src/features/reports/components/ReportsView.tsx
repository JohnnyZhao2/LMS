/**
 * ReportsView Component
 * Placeholder for grading/reports functionality
 * Will be implemented in Phase 6: 导师/室经理功能模块
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { FileText } from 'lucide-react';

export function ReportsView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
          评分中心
        </h1>
        <p className="text-text-muted mt-1">查看和评分学员提交的考试</p>
      </div>

      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            待评分列表
          </CardTitle>
          <CardDescription>
            此功能正在开发中，敬请期待
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <FileText size={48} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              功能开发中
            </h3>
            <p className="text-text-muted max-w-md">
              评分中心功能将在后续版本中实现，届时您可以在此查看待评分的考试并进行评分操作。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReportsView;
