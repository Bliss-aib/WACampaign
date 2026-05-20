"use client";

import { useState, useEffect, useCallback } from "react";

interface TypewriterProps {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  className?: string;
}

export function Typewriter({
  words,
  typingSpeed = 80,
  deletingSpeed = 50,
  pauseDuration = 2000,
  className = "",
}: TypewriterProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const type = useCallback(() => {
    const fullWord = words[currentWordIndex];

    if (isPaused) {
      return;
    }

    if (isDeleting) {
      setCurrentText((prev) => prev.slice(0, -1));
      if (currentText.length === 0) {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
      }
    } else {
      setCurrentText(fullWord.slice(0, currentText.length + 1));
      if (currentText.length + 1 === fullWord.length) {
        setIsPaused(true);
        setTimeout(() => {
          setIsPaused(false);
          setIsDeleting(true);
        }, pauseDuration);
      }
    }
  }, [currentText, isDeleting, isPaused, currentWordIndex, words, pauseDuration]);

  useEffect(() => {
    const speed = isDeleting ? deletingSpeed : typingSpeed;
    const timer = setTimeout(type, speed);
    return () => clearTimeout(timer);
  }, [type, isDeleting, typingSpeed, deletingSpeed]);

  return (
    <span className={className}>
      {currentText}
      <span className="animate-pulse ml-0.5 inline-block w-[2px] h-[1em] align-middle bg-current" />
    </span>
  );
}
