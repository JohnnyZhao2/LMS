import React from 'react';

/**
 * 3D Floating Blobs Background
 * Simulates a zero-gravity environment with "Clay" aesthetics.
 */
export const ClayBackground: React.FC = () => {
    return (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#F4F1FA]">
            {/* Blob 1: Top Left - Violet/Primary */}
            <div
                className="absolute -top-[10%] -left-[10%] h-[70vh] w-[70vh] rounded-full bg-[#7C3AED]/10 blur-3xl animate-float"
            />

            {/* Blob 2: Bottom Right - Pink/Secondary */}
            <div
                className="absolute -bottom-[10%] -right-[10%] h-[60vh] w-[60vh] rounded-full bg-[#DB2777]/10 blur-3xl animate-float-delayed"
            />

            {/* Blob 3: Top Right - Blue/Tertiary */}
            <div
                className="absolute top-[20%] right-[10%] h-[50vh] w-[50vh] rounded-full bg-[#0EA5E9]/10 blur-3xl animate-float-slow"
            />

            {/* Optional: Center subtle glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[80vh] w-[80vh] rounded-full bg-white/40 blur-3xl opacity-50"
            />
        </div>
    );
};
