import { useRef, type ReactNode } from "react";
import confetti from "canvas-confetti";
import { getThemeColor } from "../lib/theme";

type BoostConfettiProps = {
  children: ReactNode;
};

function BoostConfetti({ children }: BoostConfettiProps) {
  const titleRef = useRef<HTMLSpanElement>(null);

  const handleHover = () => {
    if (!titleRef.current) return;

    const rect = titleRef.current.getBoundingClientRect();

    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 80,
      spread: 70,
      startVelocity: 25,
      origin: {
        x,
        y,
      },
      scalar: 0.8,
      colors: ["--accent", "--dark-walnut", "--midnight-violet", "--grey", "--mint-cream"].map(getThemeColor),
    });
  };

  return (
    <span
      ref={titleRef}
      onMouseEnter={handleHover}
      style={{ display: "inline-block" }}
    >
      {children}
    </span>
  );
}

export default BoostConfetti;
