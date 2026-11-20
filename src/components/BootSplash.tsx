import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BootPhase } from '../types/orbit';

interface BootSplashProps {
  phase: BootPhase;
  centerY: number;
}

const WORD = 'ORBIT';

export function BootSplash({ phase, centerY }: BootSplashProps) {
  const [charCount, setCharCount] = useState(WORD.length);

  useEffect(() => {
    if (phase === 'word') {
      setCharCount(WORD.length);
      return;
    }
    if (phase === 'collapsing') {
      setCharCount(WORD.length);
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 1; i <= WORD.length; i++) {
        timers.push(
          setTimeout(() => {
            setCharCount(WORD.length - i);
          }, i * 85)
        );
      }
      return () => timers.forEach(clearTimeout);
    }
  }, [phase]);

  const showSplash = phase === 'word' || phase === 'collapsing';
  const displayed = WORD.slice(0, charCount);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          data-testid="boot-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-40 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="absolute left-1/2 flex items-center justify-center"
            style={{
              top: `${centerY}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="flex items-center justify-center select-none font-semibold tracking-[0.18em]"
              style={{
                fontSize: 'clamp(2rem, 5.5vw, 3rem)',
                color: 'var(--fg)',
              }}
            >
              <span>{displayed}</span>
              {/* Blinking keyboard caret */}
              <span
                className="inline-block w-[3px] rounded-full ml-1 animate-caret-blink"
                style={{
                  height: '1.05em',
                  backgroundColor: 'var(--acc)',
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
