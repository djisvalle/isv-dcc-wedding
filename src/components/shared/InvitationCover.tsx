import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type Stage = 'closed' | 'breaking' | 'opening' | 'rising' | 'revealed';

const SESSION_KEY = 'wedding-invitation-opened';

function alreadyOpened() {
  try {
    return Boolean(window.sessionStorage.getItem(SESSION_KEY));
  } catch {
    return false;
  }
}

/**
 * Full-screen "letter" intro shown before the landing page. A wax-sealed
 * envelope opens on tap/click, a letter rises out of it, then the whole
 * cover dissolves to reveal the site (already mounted underneath).
 */
export default function InvitationCover() {
  const [hidden, setHidden] = useState(alreadyOpened);
  const [stage, setStage] = useState<Stage>('closed');
  const reduceMotion = useReducedMotion();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (hidden) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [hidden]);

  const schedule = (fn: () => void, delay: number) => {
    timers.current.push(setTimeout(fn, delay));
  };

  const handleOpen = () => {
    if (stage !== 'closed') return;
    const t = reduceMotion ? 0.25 : 1;
    setStage('breaking');
    schedule(() => setStage('opening'), 450 * t);
    schedule(() => setStage('rising'), (450 + 700) * t);
    schedule(() => setStage('revealed'), (450 + 700 + 900 + 500) * t);
  };

  const handleExitComplete = () => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* private browsing / storage unavailable — cover will replay next load */
    }
    setHidden(true);
  };

  if (hidden) return null;

  const opened = stage !== 'closed' && stage !== 'breaking';
  const flapOpen = stage === 'opening' || stage === 'rising' || stage === 'revealed';
  const letterUp = stage === 'rising' || stage === 'revealed';

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {stage !== 'revealed' && (
        <motion.div
          key="invitation-cover"
          className="fixed inset-0 z-[100] flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-wedding-cream"
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
          transition={{ duration: reduceMotion ? 0.2 : 0.7, ease: [0.65, 0, 0.35, 1] }}
        >
          <div className="absolute inset-0 -z-10 opacity-5 pointer-events-none">
            <div className="absolute top-10 left-10 h-64 w-64 rounded-full border-2 border-wedding-gold blur-3xl" />
            <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full border-2 border-wedding-gold blur-3xl" />
          </div>

          <div className="relative flex flex-col items-center gap-8 px-6">
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.2em' }}
              animate={{ opacity: 0.7, letterSpacing: '0.4em' }}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="font-anaktoria text-[11px] uppercase text-wedding-gold md:text-xs"
            >
              An Invitation For You
            </motion.p>

            <div className="relative h-[176px] w-[260px] [perspective:1600px] sm:h-[216px] sm:w-[320px]">
              {/* Letter, tucked in the envelope until opened */}
              <motion.div
                className="absolute left-1/2 top-[16%] z-20 w-[82%] -translate-x-1/2 rounded-[2px] border border-wedding-gold/25 bg-white px-5 py-6 text-center shadow-2xl"
                initial={false}
                animate={{
                  y: letterUp ? -188 : 8,
                  opacity: letterUp ? 1 : 0,
                }}
                transition={{ duration: reduceMotion ? 0.25 : 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="font-ballet text-3xl text-wedding-dark sm:text-4xl">
                  Israel <span className="italic text-wedding-gold/70">&amp;</span> Deborah
                </p>
                <div className="mx-auto my-3 h-px w-10 bg-wedding-gold/30" />
                <p className="font-anaktoria text-[11px] uppercase tracking-[0.3em] text-wedding-gold/80 sm:text-xs">
                  are getting married
                </p>
              </motion.div>

              {/* Envelope back panel */}
              <div className="absolute inset-0 rounded-[2px] border border-wedding-gold/40 bg-gradient-to-b from-[#FDFBF7] to-[#F3ECDD] shadow-xl" />

              {/* Envelope side pockets */}
              <div
                className="absolute inset-0 z-[15] bg-wedding-gold/10"
                style={{ clipPath: 'polygon(0% 100%, 50% 45%, 0% 0%)' }}
              />
              <div
                className="absolute inset-0 z-[15] bg-wedding-gold/10"
                style={{ clipPath: 'polygon(100% 100%, 50% 45%, 100% 0%)' }}
              />

              {/* Envelope front pocket */}
              <div
                className="absolute inset-0 z-[25] border-t border-wedding-gold/20 bg-gradient-to-t from-[#F3ECDD] to-[#FDFBF7]"
                style={{ clipPath: 'polygon(0% 100%, 100% 100%, 50% 38%)' }}
              />

              {/* Flap, folds open like a page */}
              <motion.div
                className="absolute inset-x-0 top-0 z-30 h-[56%] origin-top [backface-visibility:hidden] [transform-style:preserve-3d]"
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}
                animate={{ rotateX: flapOpen ? -180 : 0 }}
                transition={{ duration: reduceMotion ? 0.25 : 0.75, ease: [0.65, 0, 0.35, 1] }}
              >
                <div className="h-full w-full bg-gradient-to-b from-wedding-gold to-wedding-gold/70" />
              </motion.div>

              {/* Wax seal */}
              <motion.button
                type="button"
                onClick={handleOpen}
                aria-label="Open the invitation"
                disabled={stage !== 'closed'}
                className="absolute left-1/2 top-[40%] z-40 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-wedding-gold to-[#9C7C3A] text-wedding-cream shadow-[0_2px_10px_rgba(0,0,0,0.35)] ring-2 ring-wedding-cream/70 sm:h-16 sm:w-16"
                initial={{ scale: 1, opacity: 1, rotate: 0 }}
                animate={
                  opened
                    ? { scale: 0.2, opacity: 0, rotate: 35 }
                    : { scale: reduceMotion ? 1 : [1, 1.06, 1], opacity: 1, rotate: 0 }
                }
                transition={
                  opened
                    ? { duration: reduceMotion ? 0.15 : 0.4, ease: 'easeIn' }
                    : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                }
              >
                <span className="font-ballet text-lg italic sm:text-xl">I&amp;D</span>
              </motion.button>
            </div>

            <motion.p
              className="font-anaktoria text-[10px] uppercase tracking-[0.35em] text-wedding-dark/40 md:text-[11px]"
              animate={{ opacity: opened ? 0 : [0.4, 0.9, 0.4] }}
              transition={{ duration: 2.2, repeat: opened ? 0 : Infinity, ease: 'easeInOut' }}
            >
              Tap the seal to open
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
