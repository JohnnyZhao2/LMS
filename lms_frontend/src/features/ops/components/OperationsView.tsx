/**
 * OperationsView Component
 * Placeholder for spot-checks/operations functionality
 * Will be implemented in Phase 6: 导师/室经理功能模块
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ClipboardCheck } from 'lucide-react';

export function OperationsView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
          抽查中心
        </h1>
        <p className="text-text-muted mt-1">记录和管理学员抽查情况</p>
      </div>

      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck size={20} className="text-accent" />
            抽查记录
          </CardTitle>
          <CardDescription>
            此功能正在开发中，敬请期待
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-accent/10 rounded-full mb-4">
              <ClipboardCheck size={48} className="text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              功能开发中
            </h3>
            <p className="text-text-muted max-w-md">
              抽查中心功能将在后续版本中实现，届时您可以在此创建抽查记录并查看历史抽查情况。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OperationsView;
