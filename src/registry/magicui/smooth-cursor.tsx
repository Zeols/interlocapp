"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, useSpring, type SpringOptions } from "framer-motion";

export interface SmoothCursorProps {
  cursor?: React.ReactNode;
  /**
   * Si es true (por defecto), el cursor responde 1:1 en tiempo real sin lag ni retraso de resorte.
   * Si es false, utiliza la física de resorte configurable vía `springConfig`.
   */
  instant?: boolean;
  springConfig?: SpringOptions;
}

const DefaultBlackCursorSVG = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] -translate-x-[3px] -translate-y-[3px]"
  >
    <path
      d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
      fill="#000000"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function SmoothCursor({
  cursor = <DefaultBlackCursorSVG />,
  instant = true,
  springConfig = { damping: 50, stiffness: 1200, mass: 0.1, restDelta: 0.001 },
}: SmoothCursorProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Física de resorte opcional (ultra-reactiva si se desactiva el modo instantáneo)
  const springX = useSpring(cursorX, springConfig);
  const springY = useSpring(cursorY, springConfig);

  // Coordenadas activas: 1:1 instantáneo (Cero Lag) o con resorte
  const posX = instant ? cursorX : springX;
  const posY = instant ? cursorY : springY;

  useEffect(() => {
    setMounted(true);

    const handlePointerMove = (e: PointerEvent) => {
      // Si el evento proviene de toque táctil directo, ocultamos el cursor personalizado
      if (e.pointerType === "touch") {
        setIsVisible(false);
        document.documentElement.classList.remove("has-smooth-cursor");
        return;
      }

      // Si es mouse, trackpad o lápiz
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      setIsVisible(true);
      document.documentElement.classList.add("has-smooth-cursor");
    };

    const handleMouseMoveFallback = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      setIsVisible(true);
      document.documentElement.classList.add("has-smooth-cursor");
    };

    const handleTouchStart = () => {
      setIsVisible(false);
      document.documentElement.classList.remove("has-smooth-cursor");
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      document.documentElement.classList.remove("has-smooth-cursor");
    };

    if (window.PointerEvent) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
    } else {
      window.addEventListener("mousemove", handleMouseMoveFallback, { passive: true });
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.documentElement.classList.remove("has-smooth-cursor");
      if (window.PointerEvent) {
        window.removeEventListener("pointermove", handlePointerMove);
      } else {
        window.removeEventListener("mousemove", handleMouseMoveFallback);
      }
      window.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [cursorX, cursorY]);

  if (!mounted) {
    return null;
  }

  // Renderizado a través de createPortal con el z-index máximo para permanecer siempre sobre modales
  return createPortal(
    <motion.div
      className="pointer-events-none fixed top-0 left-0 will-change-transform"
      style={{
        x: posX,
        y: posY,
        opacity: isVisible ? 1 : 0,
        zIndex: 2147483647, // Z-index máximo de 32-bit en CSS para flotar sobre modales y backdrops
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.08 }}
    >
      {cursor}
    </motion.div>,
    document.body
  );
}

export function SmoothCursorDemo() {
  return (
    <>
      <span className="hidden md:block">Move your mouse around</span>
      <span className="block md:hidden">
        SmoothCursor is disabled on touch devices
      </span>
      <SmoothCursor />
    </>
  );
}
