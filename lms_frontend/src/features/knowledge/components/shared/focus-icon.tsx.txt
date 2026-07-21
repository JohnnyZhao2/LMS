import { useState } from 'react';
import type { CSSProperties } from 'react';

interface FocusOrbIconProps {
  size?: number;
  active?: boolean;
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

export const FocusOrbIcon = ({
  size = 20,
  active = false,
  interactive = false,
}: FocusOrbIconProps) => {
  ensureFocusOrbKeyframes();
  const [hovered, setHovered] = useState(false);
  const hoverActive = interactive && hovered && !active;

  const glowSize = Math.round(size * 1.6);
  const coreInset = Math.max(1, Math.round(size * 0.15));
  const activeCoreInset = Math.max(coreInset + 1, Math.round(size * 0.4));

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
    filter: active || hoverActive ? 'blur(0px) saturate(1.18) contrast(1.06)' : 'blur(2px) saturate(1.08) contrast(1.02)',
    opacity: active || hoverActive ? 1 : 0.68,
    animation: 'focusOrbSpin 5s linear infinite',
    boxShadow: active || hoverActive
      ? '0 0 8px rgba(255, 149, 61, 0.12), 0 0 12px rgba(139, 92, 246, 0.1)'
      : '0 0 6px rgba(255, 149, 61, 0.09), 0 0 10px rgba(139, 92, 246, 0.08)',
    transition: 'filter .3s ease, opacity .3s ease, box-shadow .3s ease',
    position: 'relative',
  };

  const coreStyle: CSSProperties = {
    position: 'absolute',
    inset: active ? activeCoreInset : coreInset,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.995)',
    boxShadow: '0 0 2px rgba(255,255,255,0.35)',
    transition: 'inset .3s ease, background .3s ease',
  };

  const glowStyle: CSSProperties = {
    position: 'absolute',
    width: glowSize,
    height: glowSize,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.68) 24%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0) 74%)',
    filter: 'blur(9px)',
    opacity: active || hoverActive ? 0.96 : 0.88,
    transform: `scale(${active || hoverActive ? 1.06 : 0.95})`,
    transition: 'opacity .3s ease, transform .3s ease',
  };

  const wrapperStyle: CSSProperties = {
    width: glowSize,
    height: glowSize,
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <span
      style={wrapperStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-hidden="true"
    >
      <span data-focus-orb-glow style={glowStyle} />
      <span data-focus-orb-ring style={ringStyle}>
        <span data-focus-orb-core style={coreStyle} />
      </span>
    </span>
  );
};
