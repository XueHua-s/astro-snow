import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@lib/utils';
import { usePrefersReducedMotion } from '@hooks/index';
import { ErrorBoundary, InlineErrorFallback } from '@components/common';
import { SOURCE_CONFIG } from './summary-panel/config';
import { SummaryPanelContent } from './summary-panel/content';

export type SummarySource = 'description' | 'ai' | 'auto';

export interface SummaryPanelProps {
  summary: string;
  source?: SummarySource;
  typingSpeed?: number;
  className?: string;
}

export function SummaryPanel({
  summary,
  source = 'ai',
  typingSpeed = 25,
  className,
}: SummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const hasAnimatedRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const textRef = useRef<HTMLSpanElement | null>(null);

  const config = SOURCE_CONFIG[source];
  const prefersReducedMotion = usePrefersReducedMotion();

  const clearAnimation = useCallback(() => {
    if (!animationRef.current) return;
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }, []);

  const startTyping = useCallback(() => {
    if (!textRef.current) return;

    if (prefersReducedMotion || hasAnimatedRef.current) {
      textRef.current.textContent = summary;
      setIsTyping(false);
      hasAnimatedRef.current = true;
      return;
    }

    setIsTyping(true);
    textRef.current.textContent = '';
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const charIndex = Math.floor(elapsed / typingSpeed);

      if (charIndex < summary.length && textRef.current) {
        textRef.current.textContent = summary.slice(0, charIndex + 1);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (textRef.current) {
          textRef.current.textContent = summary;
        }
        setIsTyping(false);
        hasAnimatedRef.current = true;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [summary, typingSpeed, prefersReducedMotion]);

  const handleToggle = useCallback(() => {
    if (isExpanded) {
      clearAnimation();
      setIsExpanded(false);
      setIsTyping(false);
      return;
    }

    setIsExpanded(true);
    startTyping();
  }, [clearAnimation, isExpanded, startTyping]);

  useEffect(() => {
    return () => clearAnimation();
  }, [clearAnimation]);

  return (
    <ErrorBoundary FallbackComponent={InlineErrorFallback}>
      <div className={cn('overflow-hidden rounded-lg', className)}>
        <button
          onClick={handleToggle}
          className={cn(
            'bg-foreground/5 flex w-full cursor-pointer items-center justify-between px-4 py-3 transition-all duration-250',
            'hover:bg-foreground/10',
            isExpanded && 'bg-foreground/10 rounded-t-lg',
            !isExpanded && 'rounded-lg',
          )}
          aria-expanded={isExpanded}
          aria-controls="summary-panel-content">
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
            <span
              className={cn(
                'transition-transform duration-300',
                isExpanded && source === 'ai' && 'rotate-10',
              )}>
              {config.icon}
            </span>
            {config.label}
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn(
              'text-muted-foreground size-4 transition-transform duration-300',
              isExpanded && 'rotate-180',
            )}
            aria-hidden="true">
            <path d="M12 16L6 10H18L12 16Z" />
          </svg>
        </button>
        <SummaryPanelContent
          isExpanded={isExpanded}
          summary={summary}
          isTyping={isTyping}
          textRef={textRef}
        />
      </div>
    </ErrorBoundary>
  );
}

export default SummaryPanel;
