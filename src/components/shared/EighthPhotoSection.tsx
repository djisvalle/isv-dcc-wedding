import eighthPhoto from '@/assets/gallery/eighth-section.webp';
import eighthPhotoMobile from '@/assets/gallery/eighth-section-mobile.webp';
import FadeInImage from './FadeInImage';

export default function EighthPhotoSection() {
  return (
    <div className="relative w-full h-[55vh] md:h-[70vh] lg:h-[85vh] overflow-hidden">
      <picture>
        <source media="(min-width: 1280px)" srcSet={eighthPhoto} />
        <FadeInImage
          src={eighthPhotoMobile}
          loading="lazy"
          decoding="async"
          alt="Israel and Deborah"
          className="w-full h-full object-cover object-[33%_center] md:object-center"
        />
      </picture>
      <div className="absolute inset-x-0 top-0 h-1/4 bg-[linear-gradient(to_bottom,#FFFFFF_0%,rgba(255,255,255,0.75)_20%,rgba(255,255,255,0.35)_44%,transparent_76%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[12%] bg-[linear-gradient(to_top,#FDFBF7_0%,rgba(253,251,247,0.75)_35%,transparent_100%)]" />
    </div>
  );
}
