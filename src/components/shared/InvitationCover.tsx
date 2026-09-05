import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Easing, type Variants } from 'motion/react';
import sealImage from '@/assets/seal.webp';

const SESSION_KEY = 'invitation-cover-opened';

// Fibrous grain so the flaps read as paper rather than flat colour. Kept very
// faint and on a large tile — a tight, strong tile shows its repeat as
// texture banding on a surface this size.
const VELLUM_GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/></filter>
    <rect width='100%' height='100%' filter='url(#n)' opacity='0.22'/>
  </svg>`
)}")`;

// Each flap runs past the centre line so they overlap, the way a letter folded
// in on itself does — the top flap's free edge is what the seal holds down.
const FLAP_WIDTH_PCT = 58;

// The shadow the free edge casts — resting on the sheet below, deepening as
// the flap lifts clear of it, then thrown off as it leaves.
const OVERLAP_SHADOW = '7px 0 16px rgba(0,0,0,0.16)';
const LIFTED_SHADOW = '34px 12px 50px rgba(0,0,0,0.32)';
const GONE_SHADOW = '70px 16px 90px rgba(0,0,0,0)';

const FLAP_MOTION = {
  duration: 1.9,
  times: [0, 0.35, 1],
  ease: ['easeIn', 'easeOut'] satisfies Easing[],
};
const TOP_DELAY = 0.3;
const UNDER_DELAY = 1.3;

interface FlapProps {
  side: 'left' | 'right';
  isOpening: boolean;
  reduced: boolean;
  delay: number;
  /** Cream opacity — the top flap sits a touch denser than the sheet below. */
  tint: string;
}

/**
 * One fold of the letter: a single continuous sheet hinged at its fold. The
 * bend is carried by shading and a specular sweep rather than by chopping the
 * sheet into segments — segments seam visibly on translucent paper.
 */
function Flap({ side, isOpening, reduced, delay, tint }: FlapProps) {
  const isLeft = side === 'left';
  const dir = isLeft ? -1 : 1;
  const state = isOpening ? 'open' : 'closed';
  const transition = { ...FLAP_MOTION, delay };
  const toEdge = isLeft ? 'to right' : 'to left';

  // A slow tug against the fold, then it gives and swings clear.
  const sheet: Variants = {
    closed: { rotateY: 0, x: '0%', y: '0%', boxShadow: OVERLAP_SHADOW },
    open: reduced
      ? { opacity: 0, transition: { duration: 0.5, delay } }
      : {
          rotateY: [0, dir * 12, dir * 104],
          x: ['0%', `${dir * 1.5}%`, `${dir * 26}%`],
          y: ['0%', `${dir * 0.3}%`, `${dir * 1.6}%`],
          boxShadow: [OVERLAP_SHADOW, LIFTED_SHADOW, GONE_SHADOW],
          transition,
        },
  };

  // Shading and highlight ride the turn: the surface darkens toward the free
  // edge as it rolls away from the light, with a band of light along the crest.
  const surface: Variants = {
    closed: { opacity: 0 },
    open: reduced ? {} : { opacity: [0, 1, 0.55], transition },
  };

  return (
    <motion.div
      variants={sheet}
      initial="closed"
      animate={state}
      style={{
        width: `${FLAP_WIDTH_PCT}%`,
        [isLeft ? 'left' : 'right']: 0,
        transformOrigin: isLeft ? 'left center' : 'right center',
        backgroundImage: VELLUM_GRAIN,
        backgroundSize: '420px 420px',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
      }}
      className={`absolute inset-y-0 ${tint}`}
    >
      {/* Curvature: gathers toward the free edge, none at the fold */}
      <motion.div
        variants={surface}
        initial="closed"
        animate={state}
        style={{
          backgroundImage: `linear-gradient(${toEdge}, rgba(0,0,0,0) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.20) 78%, rgba(0,0,0,0.34) 100%)`,
        }}
        className="absolute inset-0 pointer-events-none"
      />
      {/* Light along the crest of the bend */}
      <motion.div
        variants={surface}
        initial="closed"
        animate={state}
        style={{
          backgroundImage: `linear-gradient(${toEdge}, rgba(255,255,255,0) 22%, rgba(255,255,255,0.22) 45%, rgba(255,255,255,0) 68%)`,
        }}
        className="absolute inset-0 pointer-events-none"
      />
      {/* Standing paper cues: the crease at the fold and the lit cut edge */}
      <div
        className={`absolute inset-y-0 ${isLeft ? 'left-0 bg-gradient-to-r' : 'right-0 bg-gradient-to-l'} w-12 from-black/[0.06] to-transparent pointer-events-none`}
      />
      <div
        className={`absolute inset-y-0 ${isLeft ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} w-24 from-black/[0.04] to-transparent pointer-events-none`}
      />
      <div
        className={`absolute inset-y-0 ${isLeft ? 'right-0 border-r' : 'left-0 border-l'} w-px border-white/70 pointer-events-none`}
      />
    </motion.div>
  );
}

export default function InvitationCover() {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const prefersReducedMotion = useReducedMotion() ?? false;
  // Tapping the seal fires its own handler and then bubbles to the sheet's,
  // both within one batch — a ref (not `isOpening`) is what keeps the second
  // call from scheduling a second teardown.
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) !== '1') {
      setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    // `html` carries a global `overflow-y: scroll` (see index.css), which makes
    // it — not `body` — the scroll container, so lock both.
    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    // A browser restoring the scroll position of an earlier visit would leave
    // the cover sitting over the middle of the page and open onto it, so start
    // the reveal at the top.
    window.scrollTo(0, 0);
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isMounted]);

  if (!isMounted) return null;

  const handleOpen = () => {
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, '1');
    setIsOpening(true);
    // Tear down on the sequence's own clock rather than waiting for the
    // animation callback: that fires a beat after the paper has visually
    // cleared, and every extra beat is one where the site is on screen but
    // still unscrollable.
    const total = prefersReducedMotion ? UNDER_DELAY + 0.5 : UNDER_DELAY + FLAP_MOTION.duration;
    window.setTimeout(() => setIsMounted(false), total * 1000);
  };

  return (
    // Anywhere on the letter opens it. The seal stays a real button so the
    // gesture has a focusable, named control behind it for keyboard and
    // assistive tech, rather than only a click target on a div.
    <div
      onClick={handleOpen}
      className="fixed inset-0 z-50 overflow-hidden touch-none overscroll-none cursor-pointer"
      style={{ perspective: '1400px', perspectiveOrigin: '50% 50%' }}
      aria-hidden={isOpening}
    >
      {/* Sheet underneath — hinged at the right fold, opens second */}
      <div className="absolute inset-0 z-10">
        <Flap
          side="right"
          isOpening={isOpening}
          reduced={prefersReducedMotion}
          delay={UNDER_DELAY}
          tint="bg-wedding-cream/95"
        />
      </div>

      {/* Top flap — overlaps the sheet below, hinged at the left fold, opens first */}
      <div className="absolute inset-0 z-20">
        <Flap
          side="left"
          isOpening={isOpening}
          reduced={prefersReducedMotion}
          delay={TOP_DELAY}
          tint="bg-wedding-cream/[0.97]"
        />
      </div>

      <motion.button
        type="button"
        onClick={handleOpen}
        aria-label="Open invitation"
        animate={isOpening ? { opacity: 0, scale: 0.72, rotate: -12 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.45 }}
        whileTap={{ scale: 0.94 }}
        // A box-shadow would trace a square behind the scalloped wax edge —
        // drop-shadow follows the silhouette instead.
        style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.30))' }}
        className="absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 w-26 md:w-36"
      >
        <img src={sealImage} alt="" className="block w-full h-auto select-none" draggable={false} />
      </motion.button>
    </div>
  );
}
