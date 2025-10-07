import React from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  /** 进度值 (0-100) */
  value: number;
  /** 圆环大小 */
  size?: number;
  /** 圆环粗细 */
  strokeWidth?: number;
  /** 自定义类名 */
  className?: string;
  /** 显示文本 */
  showText?: boolean;
  /** 自定义文本 */
  text?: string;
  /** 文本大小 */
  textSize?: number;
  /** 圆环颜色 */
  color?: string;
  /** 背景圆环颜色 */
  backgroundColor?: string;
  /** 是否启用呼吸闪烁效果 */
  breathing?: boolean;
  /** 呼吸闪烁的颜色 */
  breathingColor?: string;
  /** 动画状态 */
  animationState?: 'normal' | 'breathing' | 'compressing' | 'success-flash';
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 24,
  strokeWidth = 2,
  className,
  showText = false,
  text,
  textSize = 10,
  color = 'rgba(102, 255, 218, 1)', // 使用与原进度条相同的颜色
  backgroundColor = 'rgba(102, 255, 218, 0.25)',
  breathing = false,
  breathingColor,
  animationState = 'normal',
}) => {
  // 确保值在 0-100 范围内
  const clampedValue = Math.min(100, Math.max(0, value));

  // 计算圆环参数
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // 显示的文本
  const displayText = text ?? `${Math.round(clampedValue)}%`;

  // 根据动画状态确定颜色和动画类
  const getAnimationClasses = () => {
    switch (animationState) {
      case 'breathing':
        return 'animate-pulse';
      case 'compressing':
        return 'animate-pulse';
      case 'success-flash':
        return 'animate-ping';
      default:
        return breathing ? 'animate-pulse' : '';
    }
  };

  const getStrokeColor = () => {
    switch (animationState) {
      case 'breathing':
        return breathingColor || color;
      case 'compressing':
        return 'rgba(236, 72, 153, 1)'; // 粉红色
      case 'success-flash':
        return 'rgba(34, 197, 94, 1)'; // 绿色
      default:
        return breathing ? breathingColor || color : color;
    }
  };

  const animationClasses = getAnimationClasses();
  const strokeColor = getStrokeColor();

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
    >
      <svg
        width={size}
        height={size}
        className={cn('transform -rotate-90', animationClasses)}
      >
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill='none'
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill='none'
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap='round'
          className='transition-all duration-300 ease-in-out'
        />
      </svg>
      {/* 文本 */}
      {showText && (
        <div
          className='absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground'
          style={{ fontSize: textSize }}
        >
          {displayText}
        </div>
      )}
    </div>
  );
};

export default CircularProgress;
