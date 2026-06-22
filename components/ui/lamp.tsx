"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const LampContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden w-full z-0",
        className
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">
        {/* Left beam */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          animate={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-amber-300 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top] dark:from-amber-500"
        >
          {/* Mask bottom */}
          <div className="absolute w-[100%] left-0 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]"
            style={{ background: 'var(--bg)', transition: 'background 0.3s' }} />
          <div className="absolute w-40 h-[100%] left-0 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]"
            style={{ background: 'var(--bg)', transition: 'background 0.3s' }} />
        </motion.div>

        {/* Right beam */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          animate={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-amber-300 text-white [--conic-position:from_290deg_at_center_top] dark:to-amber-500"
        >
          <div className="absolute w-40 h-[100%] right-0 bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]"
            style={{ background: 'var(--bg)', transition: 'background 0.3s' }} />
          <div className="absolute w-[100%] right-0 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]"
            style={{ background: 'var(--bg)', transition: 'background 0.3s' }} />
        </motion.div>

        {/* Center fill blur */}
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 blur-2xl"
          style={{ background: 'var(--bg)', transition: 'background 0.3s' }} />

        {/* Warm glow orb */}
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full opacity-40 blur-3xl bg-amber-300 dark:opacity-25 dark:bg-amber-500" />

        {/* Hot center beam */}
        <motion.div
          initial={{ width: "8rem" }}
          animate={{ width: "16rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-30 h-36 -translate-y-[6rem] rounded-full blur-2xl bg-amber-200 dark:bg-amber-400"
        />

        {/* Horizontal bar */}
        <motion.div
          initial={{ width: "15rem" }}
          animate={{ width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-50 h-0.5 -translate-y-[7rem] bg-amber-300 dark:bg-amber-400"
        />

        {/* Top mask */}
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem]"
          style={{ background: 'var(--bg)', transition: 'background 0.3s' }} />
      </div>

      <div className="relative z-50 flex -translate-y-80 flex-col items-center px-5">
        {children}
      </div>
    </div>
  );
};
