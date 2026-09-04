import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type Stage = 'closed' | 'stamping' | 'revealed';

const SESSION_KEY = 'wedding-invitation-opened';

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function alreadyOpened() {
  try {
    return Boolean(window.sessionStorage.getItem(SESSION_KEY));
  } catch {
    return false;
  }
}

/**
 * Full-screen "vellum" intro shown before the landing page. A sheer paper
 * layer sits over the (already-mounted) site, letting it show through
 * translucently. Pressing the stamp at its center dissolves the paper away.
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
    setStage('stamping');
    schedule(() => setStage('revealed'), 550 * t);
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

  const pressed = stage !== 'closed';

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {stage !== 'revealed' && (
        <motion.div
          key="invitation-cover"
          className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(14px)' }}
          transition={{ duration: reduceMotion ? 0.2 : 0.9, ease: [0.65, 0, 0.35, 1] }}
        >
          {/* Vellum sheet — translucent + blurred so the site shows through */}
          <div className="absolute inset-0 bg-wedding-cream/55 backdrop-blur-xl" />

          {/* Paper grain */}
          <div
            className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
            style={{ backgroundImage: GRAIN_URL }}
          />

          {/* Laid lines, fine horizontal ribbing typical of vellum */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(197,160,89,0.07) 0px, rgba(197,160,89,0.07) 1px, transparent 1px, transparent 4px)',
            }}
          />
          {/* Chain lines, wider vertical ribbing */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, rgba(197,160,89,0.05) 0px, rgba(197,160,89,0.05) 1px, transparent 1px, transparent 52px)',
            }}
          />

          {/* Vignette to draw focus to center */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(26,26,26,0.12)_100%)]" />

          <div className="relative flex h-full w-full flex-col items-center justify-center gap-10 px-6">
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.2em' }}
              animate={{ opacity: 0.7, letterSpacing: '0.4em' }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="font-anaktoria text-[11px] uppercase text-wedding-gold md:text-xs"
              style={{ textShadow: '0 1px 16px rgba(253,251,247,0.95), 0 1px 3px rgba(253,251,247,0.9)' }}
            >
              An Invitation For You
            </motion.p>

            <div className="relative flex items-center justify-center">
              {/* Ink impact ring, pulses outward on press */}
              <motion.span
                className="pointer-events-none absolute rounded-full border-2 border-wedding-gold"
                initial={{ width: 140, height: 140, opacity: 0 }}
                animate={
                  pressed
                    ? { width: 260, height: 260, opacity: [0.5, 0] }
                    : { width: 140, height: 140, opacity: 0 }
                }
                transition={{ duration: reduceMotion ? 0.2 : 0.6, ease: 'easeOut' }}
              />

              <motion.button
                type="button"
                onClick={handleOpen}
                aria-label="Press the stamp to open the invitation"
                disabled={stage !== 'closed'}
                className="relative flex h-36 w-36 items-center justify-center rounded-full sm:h-44 sm:w-44"
                initial={{ y: -160, opacity: 0, rotate: -18, scale: 1.15 }}
                animate={
                  pressed
                    ? { y: 0, opacity: 1, rotate: -6, scale: 0.86 }
                    : {
                        y: 0,
                        opacity: 1,
                        rotate: reduceMotion ? -6 : [-6, -3, -6],
                        scale: 1,
                      }
                }
                transition={
                  pressed
                    ? { duration: reduceMotion ? 0.15 : 0.22, ease: 'easeIn' }
                    : stage === 'closed'
                      ? {
                          y: { duration: reduceMotion ? 0.3 : 0.9, ease: [0.34, 1.56, 0.64, 1] },
                          opacity: { duration: reduceMotion ? 0.3 : 0.6 },
                          scale: { duration: reduceMotion ? 0.3 : 0.9, ease: [0.34, 1.56, 0.64, 1] },
                          rotate: reduceMotion
                            ? { duration: 0.3 }
                            : { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.9 },
                        }
                      : undefined
                }
              >
                {/* Distressed outer ring */}
                <div
                  className="absolute inset-0 rounded-full border-[3px] border-dashed border-wedding-gold/70"
                  style={{ filter: 'url(#invitationStampRoughen)' }}
                />
                <div className="absolute inset-[10px] rounded-full border border-wedding-gold/45" />
                <div className="absolute inset-[10px] rounded-full bg-wedding-cream/50 shadow-[0_0_30px_18px_rgba(253,251,247,0.45)]" />

                <div
                  className="relative flex flex-col items-center justify-center text-wedding-gold"
                  style={{ textShadow: '0 1px 10px rgba(253,251,247,0.9)' }}
                >
                  <span className="font-ballet text-3xl italic sm:text-4xl">I &amp; D</span>
                  <div className="my-1.5 h-px w-8 bg-wedding-gold/40" />
                  <span className="font-anaktoria text-[9px] uppercase tracking-[0.3em] sm:text-[10px]">
                    01 . 08 . 2027
                  </span>
                </div>
              </motion.button>
            </div>

            <motion.p
              className="font-anaktoria text-[10px] uppercase tracking-[0.35em] text-wedding-dark/40 md:text-[11px]"
              style={{ textShadow: '0 1px 12px rgba(253,251,247,0.95), 0 1px 3px rgba(253,251,247,0.9)' }}
              animate={{ opacity: pressed ? 0 : [0.4, 0.9, 0.4] }}
              transition={{ duration: 2.2, repeat: pressed ? 0 : Infinity, ease: 'easeInOut', delay: 1 }}
            >
              Press the stamp to open
            </motion.p>
          </div>

          {/* Hidden filter def used to roughen the stamp's edge */}
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <defs>
              <filter id="invitationStampRoughen">
                <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
