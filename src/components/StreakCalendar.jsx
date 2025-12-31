import { createPortal } from "react-dom";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  subDays,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

function StreakCalendar({ streak, onClose }) {
  const today = new Date();

  const streakDays = Array.from({ length: streak }, (_, i) =>
    subDays(today, i)
  );

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 0.3 },
    exit: { opacity: 0 },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 25 },
    },
  exit: { opacity: 0, y: 20, scale: 0.96, transition: { duration: 0.2 } },
  };

  const dayVariants = {
    hover: { scale: 1.05, boxShadow: "0px 4px 12px rgba(0,0,0,0.4)" },
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black backdrop-blur-sm z-[9998] cursor-pointer"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        aria-label="Close streak calendar"
      />

      <motion.div
        className="fixed bottom-6 right-6 z-[9999]"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="relative w-[360px] bg-gray-900/80 backdrop-blur-xl border border-yellow-500/20 rounded-2xl p-5 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white border border-red-300 hover:bg-red-700 transition-colors cursor-pointer"
            aria-label="Close streak calendar"
          >
            <FiX className="w-5 h-5" />
          </button>

          <h3 className="mb-3 text-center text-lg font-bold text-yellow-400">
            🔥 Streak Calendar
          </h3>

          <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div key={d} className="font-semibold text-gray-500">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {monthDays.map((day) => {
              const active = streakDays.some((s) => isSameDay(s, day));

              return (
                <motion.div
                  key={day.toISOString()}
                  variants={dayVariants}
                  whileHover="hover"
                  className={`h-9 flex items-center justify-center rounded-lg border ${
                    active
                      ? "bg-yellow-500/20 border-yellow-400 text-yellow-300 animate-pulse"
                      : "bg-gray-900/60 border-gray-700 text-gray-400"
                  } transition-transform duration-150`}
                >
                  {format(day, "d")}
                </motion.div>
              );
            })}
          </div>

          <p className="mt-3 text-center text-xs text-gray-400">
            Keep showing up daily. Miss once → streak resets!
          </p>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export default StreakCalendar;
