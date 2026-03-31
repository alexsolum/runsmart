import { useEffect, useRef, useState } from "react";

export function useScrollDirection(threshold = 20) {
  const [direction, setDirection] = useState("up");
  const prevY = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleScroll = () => {
      const currentY = window.scrollY;
      if (Math.abs(currentY - prevY.current) < threshold) {
        return;
      }

      setDirection(currentY > prevY.current ? "down" : "up");
      prevY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return direction;
}
