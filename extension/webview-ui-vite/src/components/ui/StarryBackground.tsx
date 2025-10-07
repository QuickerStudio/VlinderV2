import React, { useEffect, useRef } from 'react';

interface StarryBackgroundProps {
  active: boolean;
  className?: string;
}

const StarryBackground: React.FC<StarryBackgroundProps> = ({
  active,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!active) {
      // 接收到关闭信号：清除所有星空效果
      container.innerHTML = '';
      return;
    }

    // 接收到开启信号：创建星空效果
    const createStarryBackground = () => {
      container.innerHTML = '';

      // 创建80个静态粒子
      for (let i = 0; i < 80; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.opacity = `${0.1 + Math.random() * 0.6}`;
        container.appendChild(particle);
      }

      // 创建80颗闪烁星星
      for (let i = 0; i < 80; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.setProperty(
          '--twinkle-duration',
          `${2 + Math.random() * 3}s`
        );
        star.style.setProperty(
          '--initial-opacity',
          `${0.1 + Math.random() * 0.3}`
        );

        // 20%概率添加burst效果
        if (Math.random() < 0.2) {
          const addBurstEffect = (starElement: HTMLElement) => {
            const triggerBurst = () => {
              starElement.classList.add('burst');
              setTimeout(() => {
                starElement.classList.remove('burst');
                setTimeout(() => triggerBurst(), 5000 + Math.random() * 10000);
              }, 1500);
            };
            setTimeout(triggerBurst, Math.random() * 5000);
          };
          addBurstEffect(star);
        }
        container.appendChild(star);
      }
    };

    createStarryBackground();

    // 点击交互
    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const burstStar = document.createElement('div');
      burstStar.className = 'star burst';
      burstStar.style.left = `${x}%`;
      burstStar.style.top = `${y}%`;
      burstStar.style.setProperty('--initial-opacity', '0.8');
      burstStar.style.setProperty('--twinkle-duration', '3s');

      container.appendChild(burstStar);
      setTimeout(() => {
        if (container.contains(burstStar)) {
          container.removeChild(burstStar);
        }
      }, 1500);
    };

    // 窗口resize处理
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (active) {
          createStarryBackground();
        }
      }, 500);
    };

    container.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [active]);

  return (
    <div
      ref={containerRef}
      className={`absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-auto z-0 ${className}`}
    />
  );
};

export default StarryBackground;
