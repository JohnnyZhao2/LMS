import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface RoleSwitchOverlayProps {
    isSwitching: boolean;
}

/**
 * 角色切换过渡遮罩
 */
export const RoleSwitchOverlay: React.FC<RoleSwitchOverlayProps> = ({ isSwitching }) => {
    return (
        <AnimatePresence>
            {isSwitching && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-center gap-6"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                <Sparkles className="text-white w-8 h-8 animate-pulse" />
                            </div>
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.1, 0.3],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="absolute inset-0 bg-blue-400 rounded-2xl -z-10 blur-xl"
                            />
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xl font-bold text-gray-900 tracking-tight">
                                正在切换角色
                            </span>
                            <span className="text-sm font-medium text-gray-500">
                                正在为您准备工作台...
                            </span>
                        </div>

                        {/* 自定义进度条 */}
                        <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden mt-2">
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: "100%" }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                className="w-full h-full bg-blue-600"
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
