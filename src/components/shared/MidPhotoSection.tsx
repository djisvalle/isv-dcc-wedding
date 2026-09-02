import { motion } from 'motion/react';
import portraitCenter from '@/assets/gallery/portrait-mid-center.webp';
import portraitSide1 from '@/assets/gallery/portrait-mid-side-1.webp';
import portraitSide2 from '@/assets/gallery/portrait-mid-side-2.webp';

const desktopTopGradient = "absolute inset-x-0 top-0 h-14 lg:h-16 bg-[linear-gradient(to_bottom,rgba(253,251,247,0.55)_0%,rgba(253,251,247,0.2)_45%,transparent_100%)] pointer-events-none";
const desktopBottomGradient = "absolute inset-x-0 bottom-0 h-14 lg:h-16 bg-[linear-gradient(to_top,rgba(253,251,247,0.55)_0%,rgba(253,251,247,0.2)_45%,transparent_100%)] pointer-events-none";

export default function MidPhotoSection() {
  return (
    <section className="relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex items-center justify-center gap-3 md:gap-4 lg:gap-6 md:py-16"
      >
        <div className="hidden md:block relative w-[24vw] lg:w-auto rounded-2xl border border-wedding-gold/10 shadow-sm opacity-90 overflow-hidden">
          <img
            src={portraitSide1}
            loading="lazy"
            decoding="async"
            alt="Israel and Deborah"
            className="w-full lg:w-auto lg:h-[min(58vh,38vw)]"
          />
          <div className={desktopTopGradient} />
          <div className={desktopBottomGradient} />
        </div>
        <div className="relative w-full md:w-[32vw] lg:w-auto md:rounded-2xl md:border md:border-wedding-gold/10 md:shadow-md md:overflow-hidden">
          <img
            src={portraitCenter}
            loading="lazy"
            decoding="async"
            alt="Israel and Deborah"
            className="w-full h-auto object-contain lg:h-[min(70vh,46vw)] lg:w-auto"
          />
          <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(to_bottom,#FDFBF7_0%,rgba(253,251,247,0.7)_20%,rgba(253,251,247,0.35)_45%,rgba(253,251,247,0.12)_70%,transparent_100%)] md:hidden pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(to_top,#FDFBF7_0%,rgba(253,251,247,0.7)_20%,rgba(253,251,247,0.35)_45%,rgba(253,251,247,0.12)_70%,transparent_100%)] md:hidden pointer-events-none" />
          <div className={`hidden md:block ${desktopTopGradient}`} />
          <div className={`hidden md:block ${desktopBottomGradient}`} />
        </div>
        <div className="hidden md:block relative w-[24vw] lg:w-auto rounded-2xl border border-wedding-gold/10 shadow-sm opacity-90 overflow-hidden">
          <img
            src={portraitSide2}
            loading="lazy"
            decoding="async"
            alt="Israel and Deborah"
            className="w-full lg:w-auto lg:h-[min(58vh,38vw)]"
          />
          <div className={desktopTopGradient} />
          <div className={desktopBottomGradient} />
        </div>
      </motion.div>
    </section>
  );
}
