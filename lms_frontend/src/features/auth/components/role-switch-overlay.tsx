import React from 'react';
import { Sparkles } from 'lucide-react';

interface RoleSwitchOverlayProps {
    isSwitching: boolean;
}

/**
 * 角色切换过渡遮罩
 */
export const RoleSwitchOverlay: React.FC<RoleSwitchOverlayProps> = ({ isSwitching }) => {
    return (
        <>
            {isSwitching && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                                <Sparkles className="text-white w-8 h-8 animate-pulse" />
                            </div>
                            <div className="absolute inset-0 bg-primary-400 rounded-2xl -z-10 blur-xl opacity-30" />
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xl font-bold text-foreground tracking-tight">
                                正在切换角色
                            </span>
                            <span className="text-sm font-medium text-text-muted">
                                正在为您准备工作台...
                            </span>
                        </div>

                        {/* 自定义进度条 */}
                        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mt-2">
                            <div className="w-full h-full bg-primary" />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
