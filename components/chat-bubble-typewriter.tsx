"use client";

import { useState, useEffect } from "react";

interface ChatBubbleTypewriterProps {
  text: string;
  startDelay?: number;
  typingSpeed?: number;
  bubbleClassName?: string;
  textClassName?: string;
  timestamp?: string;
  tailColor?: string;
}

export function ChatBubbleTypewriter({
  text,
  startDelay = 1000,
  typingSpeed = 55,
  bubbleClassName = "",
  textClassName = "",
  timestamp,
  tailColor = "#d9fdd3",
}: ChatBubbleTypewriterProps) {
  const [phase, setPhase] = useState<"waiting" | "typing" | "done">("waiting");
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setPhase("typing");
    }, startDelay);
    return () => clearTimeout(startTimer);
  }, [startDelay]);

  useEffect(() => {
    if (phase !== "typing") return;
    if (displayed.length >= text.length) {
      setPhase("done");
      return;
    }
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, typingSpeed);
    return () => clearTimeout(timer);
  }, [phase, displayed, text, typingSpeed]);

  if (phase === "waiting") {
    return (
      <div className="ml-auto max-w-[60%]">
        <div
          className="relative inline-flex items-center gap-1 rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm"
          style={{ backgroundColor: tailColor }}
        >
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
          <div
            className="absolute -right-1 top-0 h-3 w-3"
            style={{ backgroundColor: tailColor, clipPath: "polygon(0 0, 0% 100%, 100% 0)" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={bubbleClassName}>
      <div
        className={`relative rounded-lg rounded-tr-sm px-2.5 py-1.5 text-[11px] leading-relaxed shadow-sm ${bubbleClassName}`}
        style={{ backgroundColor: tailColor }}
      >
        <p className={textClassName}>{displayed}</p>
        {phase === "done" && timestamp && (
          <div className="mt-0.5 flex items-center justify-end gap-1">
            <span className="text-[9px]" style={{ color: "#667781" }}>
              {timestamp}
            </span>
            <svg className="h-2.5 w-2.5" viewBox="0 0 16 11" fill="none">
              <path
                d="M1 5.5L4.5 9L7 6.5M9 5.5L12.5 9L15 6.5"
                stroke="#53bdeb"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <div
          className="absolute -right-1 top-0 h-3 w-3"
          style={{ backgroundColor: tailColor, clipPath: "polygon(0 0, 0% 100%, 100% 0)" }}
        />
      </div>
    </div>
  );
}
