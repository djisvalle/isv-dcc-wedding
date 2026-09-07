import thirdPhoto from '@/assets/gallery/third-section.webp';
import thirdPhotoMobile from '@/assets/gallery/third-section-mobile.webp';
import FadeInImage from './FadeInImage';

export default function ThirdPhotoSection() {
  return (
    <div className="relative w-full h-[40vh] md:h-[55vh] lg:h-[70vh] overflow-hidden">
      <picture>
        <source media="(min-width: 1280px)" srcSet={thirdPhoto} />
        <FadeInImage
          src={thirdPhotoMobile}
          loading="lazy"
          decoding="async"
          alt="Israel and Deborah"
          className="w-full h-full object-cover object-center"
        />
      </picture>
      <div className="absolute inset-x-0 top-0 h-[12%] bg-[linear-gradient(to_bottom,#FDFBF7_0%,rgba(253,251,247,0.5)_25%,transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[12%] bg-[linear-gradient(to_top,#FDFBF7_0%,rgba(253,251,247,0.5)_25%,transparent_70%)]" />
    </div>
  );
}
