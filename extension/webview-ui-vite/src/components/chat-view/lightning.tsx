import React, { useRef, useEffect, KeyboardEvent, useState } from 'react';
import {
  LightningWindowState,
  LightningWindowActions,
} from '@/hooks/use-lightning-window';

// Mouse Circle Animation Component
interface MouseCircleProps {
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

const MouseCircle: React.FC<MouseCircleProps> = ({
  onClick,
  disabled,
  isLoading,
  className,
}) => {
  const circleRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const angleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const dotRRef = useRef(0);
  const targetRRef = useRef(0);
  const lastMoveRef = useRef(Date.now());
  const idleRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout>();
  const blinkTimerRef = useRef<NodeJS.Timeout>();
  const idleAngleRef = useRef(0);
  const idleTargetAngleRef = useRef(0);
  const lastIdleMoveTimeRef = useRef(Date.now());

  const dotRadius = 15; // Small dot radius from center, suitable for 18px inner radius

  // Blink animation
  const triggerBlink = () => {
    if (!idleRef.current || !dotRef.current) return;

    dotRef.current.style.transition = 'transform 0.13s cubic-bezier(.4,0,.2,1)';
    dotRef.current.style.transform = 'translate(-50%, -50%) scaleY(0.2)';

    setTimeout(() => {
      if (dotRef.current) {
        dotRef.current.style.transition =
          'transform 0.18s cubic-bezier(.4,0,.2,1)';
        dotRef.current.style.transform = 'translate(-50%, -50%) scaleY(1)';
      }
    }, 130);

    // Next blink
    blinkTimerRef.current = setTimeout(
      triggerBlink,
      2000 + Math.random() * 2000
    );
  };

  // Start/reset idle timer
  const resetIdleTimer = () => {
    idleRef.current = false;
    idleTargetAngleRef.current = Math.random() * Math.PI * 2;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);

    if (dotRef.current) {
      dotRef.current.style.transform = 'translate(-50%, -50%) scaleY(1)';
    }

    idleTimerRef.current = setTimeout(() => {
      idleRef.current = true;
      triggerBlink();
    }, 3000); // Reduced to 3 seconds to enter idle state
  };

  // Animation loop
  const animate = () => {
    if (!dotRef.current) return;

    if (idleRef.current) {
      // When idle, dot moves randomly and smoothly within the circle
      if (
        Math.abs(idleAngleRef.current - idleTargetAngleRef.current) < 0.05 &&
        Date.now() - lastIdleMoveTimeRef.current > 1200 + Math.random() * 800
      ) {
        idleTargetAngleRef.current = Math.random() * Math.PI * 2;
        lastIdleMoveTimeRef.current = Date.now();
      }
      idleAngleRef.current +=
        (idleTargetAngleRef.current - idleAngleRef.current) * 0.08;
      angleRef.current = idleAngleRef.current;
      dotRRef.current += (dotRadius - dotRRef.current) * 0.35;
    } else {
      // When not idle, return to center
      let now = Date.now();
      if (now - lastMoveRef.current > 300) targetRRef.current = 0;

      // Smooth interpolation
      angleRef.current += (targetAngleRef.current - angleRef.current) * 0.18;
      dotRRef.current += (targetRRef.current - dotRRef.current) * 0.35;
    }

    // Calculate dot position (relative to 20px center)
    let dotX = 20 + dotRRef.current * Math.cos(angleRef.current);
    let dotY = 20 + dotRRef.current * Math.sin(angleRef.current);

    dotRef.current.style.left = dotX + 'px';
    dotRef.current.style.top = dotY + 'px';

    animationRef.current = requestAnimationFrame(animate);
  };

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled) return;

    const rect = circleRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      targetAngleRef.current = Math.atan2(dy, dx);
      lastMoveRef.current = Date.now();
      targetRRef.current = dotRadius;
    }

    resetIdleTimer();
  };

  useEffect(() => {
    resetIdleTimer();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={circleRef}
      className={`relative cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}
      style={{ width: '40px', height: '40px' }} // 18px inner radius + 2px border = 20px radius = 40px diameter
      onClick={disabled ? undefined : onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={resetIdleTimer}
    >
      {/* Main circle - outer body */}
      <div
        className='absolute inset-0 rounded-full border-2'
        style={{
          borderColor: isLoading ? '#f87171' : '#00C853',
          backgroundColor: isLoading
            ? 'rgba(248, 113, 113, 0.1)'
            : 'rgba(0, 200, 83, 0.1)',
          boxShadow: isLoading
            ? '0 0 12px 2px rgba(248, 113, 113, 0.3)'
            : '0 0 12px 2px rgba(0, 200, 83, 0.3)',
        }}
      />

      {/* Small dot - eye */}
      <div
        ref={dotRef}
        className={`absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${
          isLoading ? 'bg-red-400' : 'bg-green-400'
        }`}
        style={{
          left: '20px', // Center position (40px / 2)
          top: '20px', // Center position (40px / 2)
          boxShadow: isLoading
            ? '0 0 4px 1px rgba(248, 113, 113, 0.5)'
            : '0 0 4px 1px rgba(34, 211, 238, 0.5)',
        }}
      />
    </div>
  );
};

// Lightning mood types
type LightningMood = 'normal' | 'happy' | 'angry';

// Mood detection patterns - capture natural expressions
const MOOD_PATTERNS = {
  happy:
    /嘿嘿|哈哈|呵呵|嘻嘻|哇|太好了|真棒|厉害|不错|很好|棒|赞|牛|酷|妙|绝了|完美|优秀|精彩|漂亮|美妙|惊艳|出色|杰出|一流|顶级|超棒|超好|超赞|超牛|超酷|好棒|好赞|好牛|好酷|真好|真棒|真赞|真牛|真酷|太棒了|太赞了|太牛了|太酷了|好极了|棒极了|赞极了|牛极了|酷极了|妙极了|绝极了|hi|Hi|嘿|哈|呀|耶|噢|哟|咦|咯|啦|呢|哦|喔|哇塞|哇哦|哇噻|好耶|太好|好开心|开心|高兴|愉快|兴奋|激动|欣喜|喜悦|快乐|满意|舒服|爽|舒坦|痛快|畅快|😊|😄|😃|🎉|✨|😆|😁|🤗|👍|💪|🥳|😍|🤩|😋|😎|🤤|🙌|👏|🎊|🌟|⭐|💯|🔥|👌|✌️|🤞|🙂|😌|😇|🥰|😘|😗|😙|😚|🤭|🤫|🤔|🤨|😏|😉|😜|😝|🤪|😛|🤓|😺|😸|😹|😻|😽|🙀|😿|😾/g,
  angry:
    /哎|唉|哼|切|烦|麻烦|讨厌|无语|糟糕|倒霉|郁闷|恼火|气人|可恶|该死|见鬼|要命|头疼|头痛|心烦|心累|累死|烦死|气死|愁死|急死|疯了|崩溃|抓狂|发疯|发狂|受不了|忍不了|不行了|完了|完蛋|糟了|坏了|惨了|死了|毁了|废了|垃圾|破烂|差劲|失望|沮丧|难过|伤心|痛苦|苦恼|忧愁|忧郁|悲伤|悲哀|绝望|无奈|叹气|叹息|唉声叹气|愁眉苦脸|垂头丧气|心灰意冷|心如死灰|欲哭无泪|泪流满面|痛哭流涕|嗯|额|呃|咳|咦|咋|啥|什么鬼|搞什么|怎么回事|什么情况|莫名其妙|不知所云|一头雾水|😠|😡|💢|😤|🙄|😒|😮‍💨|😔|😞|😟|😕|🙁|☹️|😣|😖|😫|😩|🥺|😢|😭|😤|😠|😡|🤬|🤯|😵|😵‍💫|🥴|😪|😴|🤐|🤢|🤮|🤧|🥵|🥶|😰|😨|😧|😦|😮|😯|😲|😳|🥸|😈|👿|💀|☠️|💩|🤡|👹|👺|👻|👽|👾|🤖/g,
};

interface LightningProps {
  /**
   * Current state of the lightning component
   */
  state: LightningWindowState;
  /**
   * Actions for managing the lightning component
   */
  actions: LightningWindowActions;
  /**
   * Callback when AI response is received and should be inserted into main input
   */
  onResponseReceived: (response: string) => void;
}

/**
 * Lightning component for asking AI questions
 * Operates independently from the main chat system
 */
export const Lightning: React.FC<LightningProps> = ({
  state,
  actions,
  onResponseReceived,
}) => {
  const textAreaRef = useRef<HTMLInputElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [wasLoading, setWasLoading] = useState(false);
  const [mood, setMood] = useState<LightningMood>('normal');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [isGlowFadingOut, setIsGlowFadingOut] = useState(false);

  // Detect mood from response text
  const detectMood = (text: string): LightningMood => {
    if (MOOD_PATTERNS.happy.test(text)) {
      return 'happy';
    }
    if (MOOD_PATTERNS.angry.test(text)) {
      return 'angry';
    }
    return 'normal';
  };

  // Get border color based on mood
  const getBorderColor = (currentMood: LightningMood): string => {
    switch (currentMood) {
      case 'happy':
      case 'angry':
        return '#FF63CB';
      case 'normal':
      default:
        return '#66FFDA';
    }
  };

  // Focus the textarea when the box becomes visible and show tooltip
  useEffect(() => {
    if (state.isVisible && textAreaRef.current) {
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);

      // Show tooltip for 2 seconds
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [state.isVisible]);

  // Re-focus the textarea when loading completes
  useEffect(() => {
    if (
      wasLoading &&
      !state.isLoading &&
      state.isVisible &&
      textAreaRef.current
    ) {
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
    }
    setWasLoading(state.isLoading);
  }, [state.isLoading, state.isVisible, wasLoading]);

  // Monitor for mood changes in responses
  useEffect(() => {
    // Reset mood to normal when starting a new question
    if (state.isLoading && !wasLoading) {
      setMood('normal');
    }
  }, [state.isLoading, wasLoading]);

  // Reset mood after 3 seconds of being in happy/angry state
  useEffect(() => {
    if (mood !== 'normal') {
      const timer = setTimeout(() => {
        // If it's happy mood, start fade-out animation first
        if (mood === 'happy') {
          setIsGlowFadingOut(true);
          // Reset mood after fade-out animation completes
          setTimeout(() => {
            setMood('normal');
            setIsGlowFadingOut(false);
          }, 500); // 0.5s fade-out duration
        } else {
          // For angry mood, reset immediately (no glow to fade out)
          setMood('normal');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [mood]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const isComposing = event.nativeEvent?.isComposing ?? false;
    if (event.key === 'Enter' && !isComposing) {
      event.preventDefault();
      if (!state.isLoading && state.questionText.trim()) {
        handleSendQuestion();
      }
    }
  };

  const handleSendQuestion = () => {
    actions.sendQuestion((response: string) => {
      // Detect mood from the response
      const detectedMood = detectMood(response);
      setMood(detectedMood);
      setLastResponse(response);

      // Call the original callback
      onResponseReceived(response);
    });
  };

  const handleAbortQuestion = () => {
    actions.abortQuestion();
  };

  if (!state.isVisible) {
    return null;
  }

  // Get glow class based on mood and fade state
  const getGlowClass = () => {
    if (mood === 'happy' && !isGlowFadingOut) {
      return 'lightning-happy-glow';
    }
    if (mood === 'happy' && isGlowFadingOut) {
      return 'lightning-glow-fade-out';
    }
    return '';
  };

  return (
    <div
      className={`fixed z-50 bg-background rounded-lg shadow-lg transition-all duration-300 ${getGlowClass()}`}
      style={{
        width: '320px',
        height: '60px',
        bottom: '52px', // Position above the input area
        right: '20px', // Align with right side of input area
        border: `2px solid ${getBorderColor(mood)}`,
      }}
    >
      {/* Content */}
      <div className='relative w-full h-full flex items-center'>
        {/* Status indicator - top left */}
        <div className='absolute top-2 left-2 flex items-center gap-2'>
          <div
            className={`relative ${state.isLoading ? 'w-3 h-3' : 'w-2 h-2'}`}
          >
            {/* Main dot */}
            <div
              className={`bg-cyan-400 rounded-full ${state.isLoading ? 'animate-pulse-fast' : 'animate-pulse'} ${state.isLoading ? 'w-3 h-3' : 'w-2 h-2'}`}
            ></div>
            {/* Glow effect when loading */}
            {state.isLoading && (
              <div className='absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75'></div>
            )}
          </div>
          {state.isLoading && (
            <div className='text-xs text-muted-foreground'>
              Getting Researching...
            </div>
          )}
        </div>

        {/* Text input - expanded */}
        <input
          ref={textAreaRef as any}
          value={state.questionText}
          onChange={(e) => actions.setQuestionText(e.target.value)}
          onKeyDown={handleKeyDown as any}
          placeholder="Hi!i'm Lightning..."
          className='w-full h-full px-3 text-sm bg-transparent border-none resize-none focus:outline-none'
          style={{ paddingRight: '40px', paddingTop: '3px' }} // Leave space for send button and status
          disabled={state.isLoading}
        />

        {/* Send button - centered vertically on the right */}
        <div className='absolute top-1/2 right-2 transform -translate-y-1/2'>
          <div className='relative'>
            {/* Tooltip */}
            {showTooltip && (
              <div className='absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap z-10'>
                Press Enter to send
                <div className='absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
              </div>
            )}
            <MouseCircle
              disabled={!state.isLoading && !state.questionText.trim()}
              onClick={
                state.isLoading ? handleAbortQuestion : handleSendQuestion
              }
              isLoading={state.isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lightning;
