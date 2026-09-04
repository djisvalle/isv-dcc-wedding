import { motion } from 'motion/react';
import landingPhoto from '@/assets/gallery/landing-1.webp';
import landingPhotoTablet from '@/assets/gallery/landing-1-tablet.webp';
import landingPhotoMobile from '@/assets/gallery/landing-1-mobile.webp';

export default function LandingPhotoSection() {
  return (
    <div className="relative w-full h-[85dvh] md:h-[100dvh] overflow-hidden">
      <motion.picture
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
        className="block w-full h-full"
      >
        <source media="(min-width: 1024px)" srcSet={landingPhoto} />
        <source media="(min-width: 768px)" srcSet={landingPhotoTablet} />
        <img
          src={landingPhotoMobile}
          alt="Israel and Deborah"
          // This is the LCP element — fetch it at the highest priority
          // rather than letting it compete with fonts/scripts. Spread as a
          // lowercase attribute: React DOM 18 doesn't recognize the
          // camelCase `fetchPriority` prop (that lands in React 19) and
          // drops it with a console warning, but passes an unrecognized
          // lowercase attribute straight through to the DOM.
          {...{ fetchpriority: 'high' }}
          decoding="async"
          className="w-full h-full object-cover object-bottom md:object-[center_75%]"
        />
      </motion.picture>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_82%,rgba(253,251,247,0.15)_88%,rgba(253,251,247,0.45)_93%,rgba(253,251,247,0.8)_97%,#FDFBF7_100%)]" />
    </div>
  );
}
