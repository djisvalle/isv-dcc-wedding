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
    <div className="flex flex-row items-center justify-center gap-4 md:gap-20 max-w-2xl mx-auto md:max-w-none px-2">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex flex-col items-center justify-center min-w-[50px] md:min-w-0"
        >
          <div className="text-2xl md:text-4xl font-light tracking-tighter text-wedding-dark mb-0.5 md:mb-3">
            {item.value.toString().padStart(2, '0')}
          </div>
          <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.4em] font-sans text-wedding-dark/50 md:text-wedding-dark/40 font-medium">
            {item.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
