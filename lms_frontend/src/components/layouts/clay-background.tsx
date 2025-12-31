import React from 'react';

/**
 * 扁平设计系统背景组件
 * 提供几何装饰形状，符合扁平设计原则：无阴影、无渐变、纯色块
 */
export const ClayBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* 大圆形装饰 - 右上角 */}
      <div
        className="absolute rounded-full bg-white/5"
        style={{
          width: '600px',
          height: '600px',
          top: '-200px',
          right: '-200px',
        }}
      />

      {/* 大圆形装饰 - 左下角 */}
      <div
        className="absolute rounded-full bg-[#3B82F6]/5"
        style={{
          width: '500px',
          height: '500px',
          bottom: '-150px',
          left: '-150px',
        }}
      />

      {/* 旋转正方形装饰 - 左上 */}
      <div
        className="absolute bg-emerald-500/5"
        style={{
          width: '400px',
          height: '400px',
          top: '10%',
          left: '5%',
          transform: 'rotate(45deg)',
        }}
      />

      {/* 旋转正方形装饰 - 右下 */}
      <div
        className="absolute bg-amber-500/5"
        style={{
          width: '350px',
          height: '350px',
          bottom: '15%',
          right: '8%',
          transform: 'rotate(-30deg)',
        }}
      />

      {/* 大圆形装饰 - 中心偏右 */}
      <div
        className="absolute rounded-full bg-[#3B82F6]/3"
        style={{
          width: '800px',
          height: '800px',
          top: '50%',
          right: '10%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* 渐变装饰（仅用于背景，不用于元素） */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, transparent 50%)',
        }}
      />
    </div>
  );
};
