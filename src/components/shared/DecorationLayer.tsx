import React from 'react';
import { motion } from 'motion/react';

interface DecorationProps {
  type?: 'orchid' | 'petal';
  src: string;
  className?: string;
  delay?: number;
  rotate?: number;
  scale?: number;
  opacity?: number;
  style?: React.CSSProperties;
}

const Decoration = ({ src, className = '', delay = 0, rotate = 0, scale = 1, opacity = 0.4, style }: DecorationProps) => {
  if (src.includes('orchid')) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: scale * 0.8, rotate: rotate - 10 }}
      whileInView={{ opacity, scale, rotate }}
      viewport={{ once: true }}
      transition={{ duration: 1.5, delay, ease: "easeOut" }}
      className={`absolute pointer-events-none select-none ${className}`}
      style={style}
    >
      <img
        src={src}
        className="w-full h-full object-contain"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
          transform: 'translateZ(0)'
        }}
        referrerPolicy="no-referrer"
      />
    </motion.div>
  );
};

export const SectionDecors = {
  Hero: () => (
    <>
      <Decoration 
        src="/orchid-purple.svg" 
        className="top-[-10%] left-[-15%] w-80 md:w-[850px] lg:w-[1000px]" 
        rotate={-25} 
        opacity={0.45}
      />
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[5%] right-[-15%] w-72 md:w-[600px] lg:w-[800px]" 
        rotate={160} 
        delay={0.4}
        opacity={0.4}
      />
      <Decoration 
        src="/orchid-pink-2.svg" 
        className="bottom-[-5%] left-[-10%] w-80 md:w-[750px] lg:w-[900px]" 
        rotate={35} 
        delay={0.2}
        opacity={0.38}
      />
      <Decoration 
        src="/orchid-purple.svg" 
        className="bottom-[10%] right-[-18%] w-64 md:w-[700px] lg:w-[850px]" 
        rotate={-15} 
        delay={0.6}
        opacity={0.3}
      />
      {/* Mid-screen fillers */}
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[40%] left-[-12%] w-40 md:w-[400px]" 
        rotate={85} 
        opacity={0.15}
      />
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[15%] left-[5%] w-32 md:w-[350px] mix-blend-multiply opacity-20" 
        rotate={40} 
        style={{ filter: 'hue-rotate(90deg) brightness(0.8) saturate(1.5)' }} 
      />
      <Decoration 
        src="/orchid-pink-2.svg" 
        className="top-[50%] right-[-10%] w-36 md:w-[350px]" 
        rotate={210} 
        opacity={0.12}
      />
      <Decoration 
        src="/orchid-pink-2.svg" 
        className="bottom-[15%] left-[20%] w-36 md:w-[300px] opacity-15" 
        rotate={10} 
        style={{ filter: 'hue-rotate(-30deg) saturate(1.2)' }} 
      />
      {/* Petals */}
      <Decoration 
        src="/petal-pink.svg" 
        className="top-[30%] right-[25%] w-16 md:w-32" 
        rotate={45} 
        delay={1}
        opacity={0.55}
      />
      <Decoration 
        src="/petal-white.svg" 
        className="bottom-[30%] left-[30%] w-14 md:w-28" 
        rotate={130} 
        delay={1.3}
        opacity={0.5}
      />
    </>
  ),
  Venue: () => (
    <>
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[-8%] right-[-20%] w-96 md:w-[800px] lg:w-[950px]" 
        rotate={-10} 
        opacity={0.3}
      />
      <Decoration 
        src="/orchid-white.svg" 
        className="bottom-[-12%] left-[-15%] w-80 md:w-[750px] lg:w-[900px]" 
        rotate={185} 
        delay={0.3}
        opacity={0.28}
      />
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[10%] left-[10%] w-48 md:w-[450px] opacity-10" 
        rotate={-45} 
        style={{ filter: 'hue-rotate(120deg) saturate(1.2)' }} 
      />
      <Decoration 
        src="/orchid-purple.svg" 
        className="top-[30%] left-[-15%] w-64 md:w-[550px] lg:w-[650px]" 
        rotate={95} 
        delay={0.7}
        opacity={0.2}
      />
      <Decoration 
        src="/orchid-purple.svg" 
        className="bottom-[15%] right-[-12%] w-60 md:w-[600px]" 
        rotate={45} 
        delay={1}
        opacity={0.15}
      />
      <Decoration 
        src="/orchid-pink-2.svg" 
        className="top-[60%] right-[-14%] w-52 md:w-[480px]" 
        rotate={270} 
        opacity={0.12}
      />
      {/* Petals */}
      <Decoration 
        src="/petal-white.svg" 
        className="top-[20%] right-[20%] w-20 md:w-40" 
        rotate={85} 
        opacity={0.4}
      />
      <Decoration 
        src="/petal-pink.svg" 
        className="bottom-[35%] left-[15%] w-18 md:w-36" 
        rotate={-45} 
        opacity={0.35}
      />
    </>
  ),
  DressCode: () => (
    <>
      <Decoration 
        src="/orchid-purple.svg" 
        className="top-[-15%] left-[-15%] w-80 md:w-[750px] lg:w-[850px]" 
        rotate={35} 
        opacity={0.3}
      />
      <Decoration 
        src="/orchid-pink-2.svg" 
        className="bottom-[-15%] right-[-12%] w-96 md:w-[850px] lg:w-[1000px]" 
        rotate={-20} 
        delay={0.4}
        opacity={0.35}
      />
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[25%] right-[-18%] w-72 md:w-[650px]" 
        rotate={150} 
        delay={0.8}
        opacity={0.22}
      />
      <Decoration 
        src="/orchid-purple.svg" 
        className="top-[55%] left-[-15%] w-64 md:w-[500px]" 
        rotate={-40} 
        opacity={0.15}
      />
      <Decoration 
        src="/orchid-white.svg" 
        className="bottom-[40%] left-[-18%] w-60 md:w-[480px]" 
        rotate={-80} 
        opacity={0.18}
      />
      {/* Petals */}
      <Decoration 
        src="/petal-pink.svg" 
        className="bottom-[30%] left-[20%] w-20 md:w-40" 
        rotate={220} 
        opacity={0.45}
      />
      <Decoration 
        src="/petal-white.svg" 
        className="top-[45%] right-[25%] w-16 md:w-32" 
        rotate={30} 
        opacity={0.35}
      />
    </>
  ),
  RSVP: () => (
    <>
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[-18%] right-[-20%] w-96 md:w-[950px] lg:w-[1100px]" 
        rotate={15} 
        opacity={0.4}
      />
      <Decoration 
        src="/orchid-purple.svg" 
        className="bottom-[-22%] left-[-20%] w-80 md:w-[850px] lg:w-[1000px]" 
        rotate={-35} 
        delay={0.5}
        opacity={0.35}
      />
      <Decoration 
        src="/orchid-purple.svg" 
        className="top-[35%] left-[-12%] w-64 md:w-[600px] lg:w-[750px]" 
        rotate={120} 
        opacity={0.25}
      />
      <Decoration 
        src="/orchid-pink-2.svg" 
        className="bottom-[10%] right-[-12%] w-56 md:w-[550px]" 
        rotate={-75} 
        opacity={0.25}
      />
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[60%] right-[-15%] w-52 md:w-[500px]" 
        rotate={200} 
        opacity={0.15}
      />
      {/* Petals */}
      <Decoration 
        src="/petal-white.svg" 
        className="bottom-[40%] right-[30%] w-24 md:w-48" 
        rotate={340} 
        opacity={0.5}
      />
      <Decoration 
        src="/petal-pink.svg" 
        className="top-[25%] left-[25%] w-20 md:w-40" 
        rotate={110} 
        opacity={0.4}
      />
    </>
  ),
  FAQ: () => (
    <>
      <Decoration 
        src="/orchid-pink-2.svg" 
        className="top-[-2%] right-[-18%] w-72 md:w-[750px] lg:w-[850px]" 
        rotate={-5} 
        opacity={0.3}
      />
      <Decoration 
        src="/orchid-purple.svg" 
        className="bottom-[-8%] left-[-15%] w-80 md:w-[800px] lg:w-[900px]" 
        rotate={165} 
        delay={0.3}
        opacity={0.3}
      />
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[35%] left-[-20%] w-64 md:w-[650px]" 
        rotate={45} 
        opacity={0.2}
      />
      <Decoration 
        src="/orchid-white.svg" 
        className="top-[5%] left-[40%] w-40 md:w-[450px] opacity-10" 
        rotate={160} 
        style={{ filter: 'hue-rotate(110deg) saturate(1.3)' }} 
      />
      <Decoration 
        src="/orchid-purple.svg" 
        className="top-[60%] right-[-15%] w-56 md:w-[500px]" 
        rotate={300} 
        opacity={0.15}
      />
      {/* Petals */}
      <Decoration 
        src="/petal-white.svg" 
        className="top-[50%] right-[18%] w-20 md:w-40" 
        rotate={170} 
        opacity={0.45}
      />
      <Decoration 
        src="/petal-pink.svg" 
        className="bottom-[45%] left-[25%] w-16 md:w-32" 
        rotate={60} 
        opacity={0.35}
      />
    </>
  )
};
