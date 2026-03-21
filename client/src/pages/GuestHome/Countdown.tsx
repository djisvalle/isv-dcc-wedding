import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WeddingCountdown() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const targetDate = new Date('2027-01-08T00:00:00').getTime();

  useEffect(() => {
    setMounted(true);
    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };
    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [targetDate]);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfcfb] px-6 py-12 text-stone-800">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="w-full max-w-lg text-center"
      >
        {/* Header */}
        <header className="mb-5 space-y-3">
          <span className="block text-[8px] uppercase tracking-[0.4em] text-stone-400 sm:text-[10px]">
            Save the Date
          </span>
          <h1 className="font-ballet text-5xl font-light tracking-wide mt-10 md:text-7xl">
            Israel <span className="text-stone-300">&</span> Deborah
          </h1>
          <div className="mx-auto h-px w-12 bg-stone-200 my-6" />
        </header>

        {/* Responsive Countdown Grid */}
        <div className="grid grid-cols-2 gap-4 sm:flex sm:justify-between sm:gap-2">
          <TimeUnit value={timeLeft.days} label="Days" />
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <TimeUnit value={timeLeft.minutes} label="Mins" />
          <TimeUnit value={timeLeft.seconds} label="Secs" />
        </div>

        {/* Footer */}
        <footer className="mt-12 space-y-4">
          <p className="block text-[8px] uppercase tracking-[0.4em] text-stone-400 sm:text-[10px]">
            January 8, 2027 • Intramuros
          </p>
        </footer>
      </motion.div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number, label: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center border border-stone-50 bg-stone p-3 shadow-sm sm:w-24 sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none">
      {/*   */}
      <div className="overflow-hidden h-12 sm:h-14">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="block font-serif text-2xl font-light text-stone-800 sm:text-4xl"
          >
            {String(value).padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1 text-[9px] uppercase tracking-[0.3em] text-stone-400">
        {label}
      </span>
    </div>
  );
}