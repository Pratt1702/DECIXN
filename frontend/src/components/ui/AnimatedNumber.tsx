import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  showPlusSign?: boolean;
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  showPlusSign = false,
}: AnimatedNumberProps) {
  const numRef = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!numRef.current) return;

    // We animate from 0 on the first render, and from the previous value on subsequent updates
    const startValue = hasAnimated
      ? parseFloat(numRef.current.dataset.raw || "0")
      : 0;

    // Set up the proxy object for GSAP to animate
    const obj = { val: startValue };

    gsap.to(obj, {
      val: value,
      duration: 2,
      ease: "power4.inOut",
      onUpdate: () => {
        if (numRef.current) {
          // Store the raw value for the next animation
          numRef.current.dataset.raw = obj.val.toString();

          // Format with Indian locale
          const isNegative = obj.val < 0;
          const absVal = Math.abs(obj.val);

          const formatted = absVal.toLocaleString("en-IN", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });

          // Determine sign
          let sign = "";
          if (isNegative) sign = "-";
          else if (showPlusSign && obj.val > 0) sign = "+";

          // Add the sign BEFORE the prefix
          const finalStr = `${sign}${prefix}${formatted}${suffix}`;
          numRef.current.innerText = finalStr;
        }
      },
      onComplete: () => {
        setHasAnimated(true);
      },
    });
  }, [value, prefix, suffix, decimals, hasAnimated, showPlusSign]);

  return (
    <span ref={numRef} className={className} data-raw={hasAnimated ? value : 0}>
      --
    </span>
  );
}
