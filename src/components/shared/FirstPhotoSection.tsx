import firstPhotoDesktop from '@/assets/gallery/first-section-desktop.webp';
import firstPhotoMobile from '@/assets/gallery/first-section-mobile.webp';

export default function FirstPhotoSection() {
  return (
    <div className="relative w-full h-[55vh] md:h-[70vh] lg:h-[85vh] overflow-hidden">
      <picture>
        <source media="(min-width: 1280px)" srcSet={firstPhotoDesktop} />
        <img
          src={firstPhotoMobile}
          loading="lazy"
          decoding="async"
          alt="Israel and Deborah"
          className="w-full h-full object-cover object-center"
        />
      </picture>
      <div className="absolute inset-x-0 top-0 h-1/4 bg-[linear-gradient(to_bottom,#FDFBF7_0%,rgba(253,251,247,0.5)_25%,transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,#FFFFFF_0%,rgba(255,255,255,0.75)_20%,rgba(255,255,255,0.35)_44%,transparent_76%)]" />
    </div>
  );
}
