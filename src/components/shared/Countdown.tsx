import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { intervalToDuration } from 'date-fns';

interface CountdownProps {
  targetDate: string;
}

export default function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(targetDate);
      
      if (target > now) {
        const duration = intervalToDuration({ start: now, end: target });
        
        setTimeLeft({
          months: duration.months || 0,
          days: duration.days || 0,
          hours: duration.hours || 0,
          minutes: duration.minutes || 0,
        });
      } else {
        setTimeLeft({ months: 0, days: 0, hours: 0, minutes: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const items = [
    { label: 'Months', value: timeLeft.months },
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Mins', value: timeLeft.minutes },
  ];

  return (
    <div className="grid grid-cols-2 md:flex md:flex-row items-center justify-center gap-4 md:gap-20 max-w-2xl mx-auto md:max-w-none">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white/60 backdrop-blur-sm border border-wedding-gold/10 p-4 md:p-0 md:bg-transparent md:backdrop-blur-none md:border-none md:shadow-none flex flex-col items-center justify-center shadow-sm"
        >
          <div className="text-2xl md:text-4xl font-light tracking-tighter text-wedding-dark mb-1 md:mb-3">
            {item.value.toString().padStart(2, '0')}
          </div>
          <div className="text-[10px] md:text-[10px] uppercase tracking-[0.4em] font-sans text-wedding-dark/50 md:text-wedding-dark/40 font-medium">
            {item.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
