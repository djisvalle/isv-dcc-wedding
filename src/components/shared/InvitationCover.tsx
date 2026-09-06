import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, type Easing, type Variants } from 'motion/react';
import sealImage from '@/assets/seal.webp';
import paperTexture from '@/assets/paper.webp';

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
// the flap lifts clear of it, then thrown off as it leaves. A sheet lying flat
// on another sheet barely shadows at all under diffuse light: a hairline of
// contact and a whisper of falloff, no more. Every keyframe carries the same
// two layers so the shadow interpolates instead of snapping between them.
const OVERLAP_SHADOW = '1px 0 1px rgba(0,0,0,0.03), 3px 0 8px rgba(0,0,0,0.022)';
const LIFTED_SHADOW = '2px 0 6px rgba(0,0,0,0.09), 22px 10px 38px rgba(0,0,0,0.20)';
const GONE_SHADOW = '0 0 0 rgba(0,0,0,0), 60px 16px 80px rgba(0,0,0,0)';

// The cut edge is barely there: a thread of light on the very rim, then the
// faintest shading falling inward, easing off top and bottom so it reads as
// light across a sheet rather than a drawn line.
const EDGE_FADE =
  'linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(0,0,0,0.22) 100%)';

// A cut edge is never a ruled line: the sheet lies a little unevenly, so the
// light along its rim and the shadow it drops both waver down the page. This is
// noise that varies only along Y (no variation across X), compressed to roughly
// 0.6-1.0 alpha, so it modulates the seam's strength without ever breaking it.
const SEAM_VARIANCE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='4' height='900' preserveAspectRatio='none'>
    <filter id='v'>
      <feTurbulence type='fractalNoise' baseFrequency='0 0.011' numOctaves='3' seed='11'/>
      <feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.45 0 0 0 0.62'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#v)'/>
  </svg>`
)}")`;

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
  /** Anything stuck to this sheet — the wax seal — so it turns with the paper. */
  children?: ReactNode;
}

/**
 * One fold of the letter: a single continuous sheet hinged at its fold. The
 * bend is carried by shading and a specular sweep rather than by chopping the
 * sheet into segments — segments seam visibly on translucent paper.
 */
function Flap({ side, isOpening, reduced, delay, tint, children }: FlapProps) {
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
        backfaceVisibility: 'hidden',
        willChange: 'transform',
      }}
      className={`absolute inset-y-0 ${tint}`}
    >
      {/* The stock itself. The tile is mirrored to repeat seamlessly, which
          leaves symmetry axes the eye picks out instantly when they sit square
          to the screen — so the layer is tilted, and oversized to keep its
          corners out of frame. Each sheet gets its own angle and start point:
          two sheets cut from the same stock, not one image split down the
          middle. Pattern size is fixed rather than viewport-derived, since real
          stock has a real-world scale. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -inset-1/3 bg-[length:620px_auto] md:bg-[length:820px_auto]"
          style={{
            backgroundImage: `url(${paperTexture})`,
            backgroundPosition: isLeft ? '0% 0%' : '37% 23%',
            transform: `rotate(${isLeft ? -7 : 6}deg)`,
          }}
        />
      </div>
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
      {/* The crease at the fold: paper rounds into it rather than creasing to a
          line, so the shading is wide and shallow with a little light riding
          the apex. */}
      <div
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(${isLeft ? 'to right' : 'to left'},
            rgba(255,255,255,0.28) 0px,
            rgba(255,255,255,0) 4px,
            rgba(0,0,0,0.035) 20px,
            rgba(0,0,0,0) 72px)`,
          WebkitMaskImage: EDGE_FADE,
          maskImage: EDGE_FADE,
        }}
        className={`absolute inset-y-0 ${isLeft ? 'left-0' : 'right-0'} w-20 pointer-events-none`}
      />
      {/* The shadow the edge drops onto the sheet below. A box-shadow alone is
          perfectly even for its whole length, which is what made the seam look
          drawn; this carries the same wavering as the rim above it, so the two
          agree. It sits just outside the sheet and travels with it. */}
      <div
        aria-hidden
        style={{ WebkitMaskImage: EDGE_FADE, maskImage: EDGE_FADE }}
        className={`absolute inset-y-0 ${isLeft ? 'left-full' : 'right-full'} w-8 pointer-events-none`}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${isLeft ? 'to right' : 'to left'},
              rgba(0,0,0,0.055) 0px,
              rgba(0,0,0,0.030) 3px,
              rgba(0,0,0,0) 26px)`,
            WebkitMaskImage: SEAM_VARIANCE,
            maskImage: SEAM_VARIANCE,
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
          }}
        />
      </div>

      {/* The cut edge resting on the sheet below: a thread of light on the rim,
          the paper dipping into contact just behind it, then shading away
          inward. Two nested masks rather than one — the outer eases the whole
          edge off at top and bottom, the inner wavers its strength along the
          length so it reads as a sheet of paper rather than a ruled line. */}
      <div
        aria-hidden
        style={{ WebkitMaskImage: EDGE_FADE, maskImage: EDGE_FADE }}
        className={`absolute inset-y-0 ${isLeft ? 'right-0' : 'left-0'} w-24 pointer-events-none`}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${isLeft ? 'to left' : 'to right'},
              rgba(255,255,255,0.30) 0px,
              rgba(255,255,255,0.05) 2px,
              rgba(0,0,0,0.030) 5px,
              rgba(0,0,0,0.022) 18px,
              rgba(0,0,0,0) 64px)`,
            WebkitMaskImage: SEAM_VARIANCE,
            maskImage: SEAM_VARIANCE,
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
          }}
        />
      </div>

      {children}
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

  // The wax breaks its bond with the sheet — a short lift toward the viewer, no
  // spin — and that is the whole of its own motion. Everything after is the
  // paper's: the seal is a child of the top flap, so the flap raises it, turns
  // it and carries it away exactly as a seal stuck to a real sheet would go.
  const seal: Variants = {
    closed: { y: 0, scale: 1, opacity: 1 },
    open: prefersReducedMotion
      ? { opacity: 0, transition: { duration: 0.4 } }
      : {
          scale: [1, 1.09, 1.04],
          y: ['0%', '-3%', '-1.5%'],
          transition: { duration: TOP_DELAY, times: [0, 0.6, 1], ease: 'easeOut' satisfies Easing },
        },
  };

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
          // Opaque stock — the sheet below sits a shade deeper than the flap
          // covering it, as a second layer of paper does.
          tint="bg-[#EFE6D6]"
        />
      </div>

      {/* Top flap — overlaps the sheet below, hinged at the left fold, opens
          first, and carries the seal that holds it down. */}
      <div className="absolute inset-0 z-20">
        <Flap
          side="left"
          isOpening={isOpening}
          reduced={prefersReducedMotion}
          delay={TOP_DELAY}
          tint="bg-[#F5EDE0]"
        >
          {/* Centring lives on this wrapper, not the button: Motion writes the
              button's `transform` outright, which would drop a translate class.
              The offset is measured across the flap rather than the viewport,
              since this now hangs off the flap — at 50/58 of the sheet's width
              it still lands dead centre of the page while the letter is shut. */}
          <div
            style={{ left: `${(50 / FLAP_WIDTH_PCT) * 100}%` }}
            className="absolute top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.button
              type="button"
              onClick={handleOpen}
              aria-label="Open invitation"
              variants={seal}
              initial="closed"
              animate={isOpening ? 'open' : 'closed'}
              whileTap={{ scale: 0.97 }}
              className="relative block w-39 md:w-54"
            >
              <img src={sealImage} alt="" className="block w-full h-auto select-none" draggable={false} />
              {/* The paper's own grain, masked to the wax, so both surfaces carry
                  the same texture instead of the seal reading as a pasted cutout. */}
              <span
                aria-hidden
                style={{
                  backgroundImage: VELLUM_GRAIN,
                  backgroundSize: '420px 420px',
                  WebkitMaskImage: `url(${sealImage})`,
                  maskImage: `url(${sealImage})`,
                  WebkitMaskSize: '100% 100%',
                  maskSize: '100% 100%',
                  mixBlendMode: 'multiply',
                }}
                className="absolute inset-0 opacity-60 pointer-events-none"
              />
              {/* Where the wax meets the sheet it presses in slightly — masked to
                  the wax's own scalloped silhouette, barely larger, no offset. It
                  lets go the moment the seal breaks free. */}
              <motion.span
                aria-hidden
                animate={{ opacity: isOpening ? 0 : 0.13 }}
                transition={{ duration: 0.28 }}
                style={{
                  WebkitMaskImage: `url(${sealImage})`,
                  maskImage: `url(${sealImage})`,
                  WebkitMaskSize: '100% 100%',
                  maskSize: '100% 100%',
                  backgroundColor: '#000',
                  filter: 'blur(2.5px)',
                  transform: 'scale(1.03)',
                }}
                className="absolute inset-0 -z-10 pointer-events-none"
              />
            </motion.button>
          </div>
        </Flap>
      </div>
    </div>
  );
}
