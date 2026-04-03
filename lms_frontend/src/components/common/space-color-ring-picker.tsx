import * as React from 'react';

import { cn } from '@/lib/utils';

export const SPACE_THEME_COLORS = [
  '#FFE45C',
  '#7A38D6',
  '#F0444F',
  '#63EEB1',
  '#BDC0CF',
  '#FF86A3',
  '#0A0A0A',
  '#28A3D1',
  '#23BE73',
  '#F6D4C8',
  '#2A6CE5',
  '#C8FF00',
  '#FF9966',
  '#B8A9DB',
  '#9DD3DC',
  '#C89AAA',
] as const;

interface SpaceColorRingPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const SpaceColorRingPicker: React.FC<SpaceColorRingPickerProps> = ({
  value,
  onChange,
  className,
  size = 'md',
}) => {
  const orbit = size === 'sm'
    ? { container: 204, radius: 75, button: 36, ring: 26, outerBorder: 3, center: 82, centerBorder: 9 }
    : { container: 276, radius: 104, button: 42, ring: 32, outerBorder: 4, center: 110, centerBorder: 10 };
  const positions = React.useMemo(
    () => SPACE_THEME_COLORS.map((color, index) => {
      const angle = ((index / SPACE_THEME_COLORS.length) * 360 - 120) * (Math.PI / 180);
      return {
        color,
        x: Math.cos(angle) * orbit.radius,
        y: Math.sin(angle) * orbit.radius,
      };
    }),
    [orbit.radius],
  );
  const positionMap = React.useMemo(
    () => new Map<string, (typeof positions)[number]>(positions.map((item) => [item.color, item])),
    [positions],
  );
  const floatingStartScale = orbit.ring / orbit.center;
  const [floatingState, setFloatingState] = React.useState<{
    color: string;
    x: number;
    y: number;
    scale: number;
    visible: boolean;
  } | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSelect = React.useCallback((color: string) => {
    if (color === value) return;

    const selectedPosition = positionMap.get(color);
    if (!selectedPosition) {
      onChange(color);
      return;
    }

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    setFloatingState({
      color,
      x: selectedPosition.x,
      y: selectedPosition.y,
      scale: floatingStartScale,
      visible: true,
    });

    onChange(color);

    frameRef.current = requestAnimationFrame(() => {
      setFloatingState((current) => current ? { ...current, x: 0, y: 0, scale: 1 } : current);
    });

    timeoutRef.current = window.setTimeout(() => {
      setFloatingState(null);
    }, 260);
  }, [floatingStartScale, onChange, positionMap, value]);

  return (
    <div
      className={cn('relative mx-auto', className)}
      style={{ width: orbit.container, height: orbit.container }}
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className="block rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: orbit.center,
            height: orbit.center,
            borderWidth: orbit.centerBorder,
            borderColor: value,
            opacity: floatingState ? 0 : 1,
          }}
        />
      </div>

      {floatingState ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span
            className="block rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: orbit.center,
              height: orbit.center,
              borderWidth: orbit.centerBorder,
              borderColor: floatingState.color,
              transform: `translate(${floatingState.x}px, ${floatingState.y}px) scale(${floatingState.scale})`,
              opacity: floatingState.visible ? 1 : 0,
            }}
          />
        </div>
      ) : null}

      {positions.map(({ color, x, y }) => {
        if (color === value) {
          return null;
        }

        return (
          <div
            key={color}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              marginLeft: x,
              marginTop: y,
            }}
          >
            <button
              type="button"
              onClick={() => handleSelect(color)}
              className="flex items-center justify-center rounded-full transition-transform duration-200 ease-out hover:scale-[1.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8793A]/25"
              aria-label={`选择颜色 ${color}`}
              aria-pressed={false}
              style={{
                width: orbit.button,
                height: orbit.button,
              }}
            >
              <span
                className="block rounded-full bg-white"
                style={{
                  width: orbit.ring,
                  height: orbit.ring,
                  borderWidth: orbit.outerBorder,
                  borderColor: color,
                }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};
