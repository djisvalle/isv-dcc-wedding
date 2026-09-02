import landingPhoto from '@/assets/gallery/landing-1.webp';
import landingPhotoTablet from '@/assets/gallery/landing-1-tablet.webp';
import landingPhotoMobile from '@/assets/gallery/landing-1-mobile.webp';

export default function LandingPhotoSection() {
  return (
    <div className="relative w-full h-[85dvh] md:h-[100dvh] overflow-hidden">
      <picture>
        <source media="(min-width: 1024px)" srcSet={landingPhoto} />
        <source media="(min-width: 768px)" srcSet={landingPhotoTablet} />
        <img
          src={landingPhotoMobile}
          alt="Israel and Deborah"
          className="w-full h-full object-cover object-bottom md:object-[center_75%]"
        />
      </picture>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_65%,rgba(253,251,247,0.15)_78%,rgba(253,251,247,0.45)_88%,rgba(253,251,247,0.8)_96%,#FDFBF7_100%)]" />
    </div>
  );
}
