import { motion } from "motion/react";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface VisualizerProps {
  state: VisualizerState;
}

export default function Visualizer({ state }: VisualizerProps) {
  const getRingAnimation = (index: number, reverse: boolean = false) => {
    const baseSpeed = state === "listening" ? 3 : state === "processing" ? 1.5 : state === "speaking" ? 2 : 15;
    return {
      rotate: reverse ? [-360, 0] : [0, 360],
      transition: { duration: baseSpeed + index * 2, repeat: Infinity, ease: "linear" }
    };
  };

  const getPulseAnimation = () => {
    if (state === "speaking") {
      return {
        scale: [1, 1.05, 0.98, 1.02, 1],
        opacity: [0.8, 1, 0.8, 1, 0.8],
        transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "listening") {
      return {
        scale: [1, 1.02, 1],
        opacity: [0.7, 1, 0.7],
        transition: { duration: 1, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "processing") {
      return {
        scale: [0.98, 1.02, 0.98],
        opacity: [0.6, 0.9, 0.6],
        transition: { duration: 0.8, repeat: Infinity, ease: "linear" }
      };
    }
    return {
      scale: [1, 1.01, 1],
      opacity: [0.4, 0.6, 0.4],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    };
  };

  // Elegant Sweet palette (Rose, Peach, Amber)
  const getTheme = () => {
    switch (state) {
      case "listening": return { color: "rgba(244, 114, 182, 1)", glow: "shadow-pink-500/60", border: "border-pink-400" }; // Pink
      case "processing": return { color: "rgba(251, 146, 60, 1)", glow: "shadow-orange-400/80", border: "border-orange-400" }; // Peach
      case "speaking": return { color: "rgba(252, 211, 77, 1)", glow: "shadow-amber-400/80", border: "border-amber-300" }; // Amber
      default: return { color: "rgba(251, 113, 133, 0.8)", glow: "shadow-rose-500/40", border: "border-rose-500/50" }; // Rose for idle
    }
  };

  const theme = getTheme();

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Ambient Glow */}
      <motion.div
        animate={getPulseAnimation()}
        className={`absolute w-[60%] h-[60%] rounded-full blur-[100px] ${theme.glow}`}
        style={{ backgroundColor: theme.color, opacity: 0.12 }}
      />

      {/* Ring 1: Outer Decorative Thin Ring */}
      <motion.div
        animate={getRingAnimation(4, false)}
        className={`absolute w-[100%] h-[100%] rounded-full border-[0.5px] ${theme.border} opacity-10`}
      />

      {/* Ring 2: Dotted Ring */}
      <motion.div
        animate={getRingAnimation(3, true)}
        className={`absolute w-[80%] h-[80%] rounded-full border-[1px] border-dotted ${theme.border} opacity-20`}
      />

      {/* Ring 3: Segmented Ring */}
      <motion.div
        animate={getRingAnimation(2, false)}
        className={`absolute w-[65%] h-[65%] rounded-full border-[1px] ${theme.border} border-t-transparent border-b-transparent opacity-30`}
      />

      {/* Ring 4: Inner Dashed Ring */}
      <motion.div
        animate={getRingAnimation(1, true)}
        className={`absolute w-[50%] h-[50%] rounded-full border-[1.5px] border-dashed ${theme.border} opacity-40`}
      />
      
      {/* Ring 5: Core Orbiting Ring */}
      <motion.div
        animate={getRingAnimation(0, false)}
        className={`absolute w-[35%] h-[35%] rounded-full border-[1.5px] ${theme.border} opacity-60`}
      />

      {/* Core Circle */}
      <motion.div
        animate={getPulseAnimation()}
        className={`absolute w-[22%] h-[22%] rounded-full border-[1px] ${theme.border} bg-black/60 backdrop-blur-xl flex items-center justify-center shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]`}
        style={{ boxShadow: `0 0 50px ${theme.color}44, inset 0 0 30px ${theme.color}22` }}
      >
        {/* Center Text */}
        <div 
          className="font-serif font-bold italic tracking-[0.2em] text-2xl md:text-3xl lg:text-4xl text-white drop-shadow-lg"
          style={{ textShadow: `0 0 20px ${theme.color}` }}
        >
          Sweeti
        </div>
      </motion.div>
    </div>
  );
}
