import endPhoto from '@/assets/gallery/end-photo.webp';
import endPhotoMobile from '@/assets/gallery/end-photo-mobile.webp';
import FadeInImage from './FadeInImage';

export default function EndPhotoSection() {
  return (
    <div className="relative w-full h-[55vh] md:h-[75vh] lg:h-[85vh] overflow-hidden">
      <picture>
        <source media="(min-width: 1280px)" srcSet={endPhoto} />
        <FadeInImage
          src={endPhotoMobile}
          loading="lazy"
          decoding="async"
          alt="Israel and Deborah"
          className="w-full h-full object-cover object-center"
        />
      </picture>
      <div className="absolute inset-x-0 top-0 h-1/4 bg-[linear-gradient(to_bottom,#FDFBF7_0%,rgba(253,251,247,0.75)_20%,rgba(253,251,247,0.35)_44%,transparent_76%)]" />
    </div>
  );
}
