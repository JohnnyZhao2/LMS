import React from 'react';
import { Sparkles } from 'lucide-react';

interface RoleSwitchOverlayProps {
    isSwitching: boolean;
}

const EXIT_TRANSITION_MS = 80;

export const RoleSwitchOverlay: React.FC<RoleSwitchOverlayProps> = ({ isSwitching }) => {
    const [mounted, setMounted] = React.useState(isSwitching);
    const [visible, setVisible] = React.useState(isSwitching);

    React.useEffect(() => {
        if (isSwitching) {
            setMounted(true);
            const frameId = window.requestAnimationFrame(() => {
                setVisible(true);
            });
            return () => {
                window.cancelAnimationFrame(frameId);
            };
        }

        setVisible(false);
        const timerId = window.setTimeout(() => {
            setMounted(false);
        }, EXIT_TRANSITION_MS);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [isSwitching]);

    if (!mounted) {
        return null;
    }

    return (
        <div
            className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background backdrop-blur-md transition-opacity duration-[80ms] ease-out ${
                visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            <div
                className={`flex flex-col items-center gap-6 transition-all duration-[120ms] ease-out ${
                    visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-1 scale-[0.985] opacity-0'
                }`}
            >
                <div className="relative role-switch-glow">
                    <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                        <Sparkles className="role-switch-icon text-white w-8 h-8" />
                    </div>
                    <div className="absolute inset-0 bg-primary-400 rounded-lg -z-10 blur-xl opacity-30" />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <span className="text-xl font-bold text-foreground tracking-tight">
                        正在切换角色
                    </span>
                    <span className="text-sm font-medium text-text-muted">
                        正在为您准备工作台...
                    </span>
                </div>

                <div className="relative w-52 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                    <div className="absolute inset-y-0 left-0 right-0 bg-primary/15" />
                    <div className="role-switch-progress absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
                </div>
            </div>
        </div>
    );
};
