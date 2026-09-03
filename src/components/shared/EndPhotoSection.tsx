import endPhoto from '@/assets/gallery/end-photo.webp';

export default function EndPhotoSection() {
  return (
    <div className="relative w-full h-[55vh] md:h-[75vh] lg:h-[85vh] overflow-hidden">
      <img
        src={endPhoto}
        loading="lazy"
        decoding="async"
        alt="Israel and Deborah"
        className="w-full h-full object-cover object-center"
      />
      <div className="absolute inset-x-0 top-0 h-1/4 bg-[linear-gradient(to_bottom,#FDFBF7_0%,rgba(253,251,247,0.75)_20%,rgba(253,251,247,0.35)_44%,transparent_76%)]" />
    </div>
  );
}
