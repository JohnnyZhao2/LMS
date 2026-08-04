import { useState } from 'react';
import type { CSSProperties } from 'react';

interface FocusOrbIconProps {
  size?: number;
  interactive?: boolean;
}

const FOCUS_ORB_KEYFRAMES_ID = 'focus-orb-icon-keyframes';

const ensureFocusOrbKeyframes = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FOCUS_ORB_KEYFRAMES_ID)) return;

  const style = document.createElement('style');
  style.id = FOCUS_ORB_KEYFRAMES_ID;
  style.textContent = `
    @keyframes focusOrbSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

/**
 * 专注/展开球：固定柔和模糊彩虹环，各处直接导入即可
 */
export const FocusOrbIcon = ({
  size = 20,
  interactive = false,
}: FocusOrbIconProps) => {
  ensureFocusOrbKeyframes();
  const [hovered, setHovered] = useState(false);
  const lit = interactive && hovered;
  const glowSize = Math.round(size * 1.6);
  const coreInset = Math.max(1, Math.round(size * 0.15));

  const ringStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: `conic-gradient(
      from 180deg at 50% 50%,
      #FF8C00 0deg,
      #E52E71 120deg,
      #8B5CF6 240deg,
      #4facfe 300deg,
      #FF8C00 360deg
    )`,
    filter: 'blur(2px) saturate(1.08) contrast(1.02)',
    opacity: lit ? 1 : 0.72,
    animation: 'focusOrbSpin 5s linear infinite',
    boxShadow: '0 0 6px rgba(255, 149, 61, 0.09), 0 0 10px rgba(139, 92, 246, 0.08)',
    transition: 'opacity .3s ease',
    position: 'relative',
  };

  const coreStyle: CSSProperties = {
    position: 'absolute',
    inset: coreInset,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.995)',
    boxShadow: '0 0 2px rgba(255,255,255,0.35)',
  };

  const glowStyle: CSSProperties = {
    position: 'absolute',
    width: glowSize,
    height: glowSize,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.68) 24%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0) 74%)',
    filter: 'blur(9px)',
    opacity: lit ? 0.96 : 0.88,
    transform: `scale(${lit ? 1.06 : 0.95})`,
    transition: 'opacity .3s ease, transform .3s ease',
  };

  return (
    <span
      style={{
        width: glowSize,
        height: glowSize,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-hidden="true"
    >
      <span style={glowStyle} />
      <span style={ringStyle}>
        <span style={coreStyle} />
      </span>
    </span>
  );
};
