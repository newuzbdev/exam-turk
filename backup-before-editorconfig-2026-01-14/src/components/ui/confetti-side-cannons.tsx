import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface ConfettiSideCannonsProps {
  /**
   * Duration in seconds for the confetti animation
   * @default 3
   */
  duration?: number;
  /**
   * Colors for the confetti particles
   * @default ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]
   */
  colors?: string[];
  /**
   * Whether to trigger automatically on mount
   * @default true
   */
  autoTrigger?: boolean;
}

export function ConfettiSideCannons({
  duration = 3,
  colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"],
  autoTrigger = true,
}: ConfettiSideCannonsProps) {
  const hasTriggered = useRef(false);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (autoTrigger && !hasTriggered.current) {
      hasTriggered.current = true;
      
      // Small delay to ensure the page is fully rendered and canvas is available
      const timeout = setTimeout(() => {
        try {
          // Verify confetti is available
          if (typeof confetti !== 'function') {
            console.error("Confetti is not a function");
            return;
          }

          const end = Date.now() + duration * 1000;

          const frame = () => {
            if (Date.now() > end) {
              if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
              }
              return;
            }

            confetti({
              particleCount: 3,
              angle: 60,
              spread: 55,
              startVelocity: 60,
              origin: { x: 0, y: 0.5 },
              colors: colors,
            });
            confetti({
              particleCount: 3,
              angle: 120,
              spread: 55,
              startVelocity: 60,
              origin: { x: 1, y: 0.5 },
              colors: colors,
            });

            animationFrameId.current = requestAnimationFrame(frame);
          };

          frame();
        } catch (error) {
          console.error("Confetti error:", error);
        }
      }, 300);

      return () => {
        clearTimeout(timeout);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
      };
    }
  }, [autoTrigger, duration, colors]);

  return null;
}
