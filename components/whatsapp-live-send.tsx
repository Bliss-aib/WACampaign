"use client";

import { useState, useEffect, useCallback } from "react";

const SENT_COLOR = "#d9fdd3";
const RECEIVED_COLOR = "#ffffff";
const BG_COLOR = "#efeae2";
const INPUT_BG = "#f0f2f5";
const HEADER_COLOR = "#008069";
const TIMESTAMP_COLOR = "#667781";
const CHECK_COLOR = "#53bdeb";

export function WhatsAppLiveSend() {
  const [phase, setPhase] = useState<
    "idle" | "typing" | "ready" | "sending" | "sent"
  >("idle");
  const [inputText, setInputText] = useState("");
  const [showSent, setShowSent] = useState(false);
  const fullText = "Absolutely — here is your link!";

  const typeChar = useCallback(() => {
    setInputText((prev) => {
      if (prev.length >= fullText.length) {
        setPhase("ready");
        return prev;
      }
      return fullText.slice(0, prev.length + 1);
    });
  }, []);

  useEffect(() => {
    if (phase !== "typing") return;
    const timer = setTimeout(typeChar, 55);
    return () => clearTimeout(timer);
  }, [phase, inputText, typeChar]);

  useEffect(() => {
    // Start typing after first two messages have appeared
    const startTimer = setTimeout(() => {
      setPhase("typing");
    }, 2200);
    return () => clearTimeout(startTimer);
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;
    // Brief pause then "press send"
    const sendTimer = setTimeout(() => {
      setPhase("sending");
      setInputText("");
      setShowSent(true);
      setPhase("sent");
    }, 600);
    return () => clearTimeout(sendTimer);
  }, [phase]);

  return (
    <div className="flex h-full flex-col rounded-[2.2rem] overflow-hidden">
      {/* Chat header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 pt-8"
        style={{ backgroundColor: HEADER_COLOR }}
      >
        {/* Back arrow placeholder */}
        <svg className="h-4 w-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <div className="flex-1">
          <div className="text-xs font-semibold text-white">Bliss</div>
          <div className="text-[10px] text-white/70">online</div>
        </div>
      </div>

      {/* Chat body */}
      <div className="flex-1 space-y-3 p-3" style={{ backgroundColor: BG_COLOR }}>
        {/* Date separator */}
        <div className="flex justify-center">
          <span
            className="rounded-lg px-2 py-0.5 text-[10px]"
            style={{ backgroundColor: "#c5e8f9" }}
          >
            <span className="text-teal-900">Today</span>
          </span>
        </div>

        {/* Sent message 1 */}
        <div className="ml-auto max-w-[88%]">
          <div
            className="relative rounded-lg rounded-tr-sm px-2.5 py-1.5 text-[11px] leading-relaxed shadow-sm"
            style={{ backgroundColor: SENT_COLOR }}
          >
            <p className="text-zinc-800">
              Hey Bliss! Summer sale is live — 30% off all plans this weekend
              only 🎉
            </p>
            <div className="mt-0.5 flex items-center justify-end gap-1">
              <span className="text-[9px]" style={{ color: TIMESTAMP_COLOR }}>
                10:32
              </span>
              <svg className="h-2.5 w-2.5" viewBox="0 0 16 11" fill="none">
                <path
                  d="M1 5.5L4.5 9L7 6.5M9 5.5L12.5 9L15 6.5"
                  stroke={CHECK_COLOR}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div
              className="absolute -right-1 top-0 h-3 w-3"
              style={{
                backgroundColor: SENT_COLOR,
                clipPath: "polygon(0 0, 0% 100%, 100% 0)",
              }}
            />
          </div>
        </div>

        {/* Received message */}
        <div className="mr-auto max-w-[82%]">
          <div
            className="relative rounded-lg rounded-tl-sm px-2.5 py-1.5 text-[11px] leading-relaxed shadow-sm"
            style={{ backgroundColor: RECEIVED_COLOR }}
          >
            <p className="text-zinc-800">
              That sounds great! Can I book a demo?
            </p>
            <div className="mt-0.5 flex justify-end">
              <span className="text-[9px]" style={{ color: TIMESTAMP_COLOR }}>
                10:33
              </span>
            </div>
            <div
              className="absolute -left-1 top-0 h-3 w-3"
              style={{
                backgroundColor: RECEIVED_COLOR,
                clipPath: "polygon(100% 0, 0 0, 100% 100%)",
              }}
            />
          </div>
        </div>

        {/* Sent message 2 — appears after typing + send */}
        {showSent && (
          <div className="animate-fade-in ml-auto max-w-[85%]">
            <div
              className="relative rounded-lg rounded-tr-sm px-2.5 py-1.5 text-[11px] leading-relaxed shadow-sm"
              style={{ backgroundColor: SENT_COLOR }}
            >
              <p className="text-zinc-800">Absolutely — here is your link!</p>
              <div className="mt-0.5 flex items-center justify-end gap-1">
                <span
                  className="text-[9px]"
                  style={{ color: TIMESTAMP_COLOR }}
                >
                  10:33
                </span>
                <svg className="h-2.5 w-2.5" viewBox="0 0 16 11" fill="none">
                  <path
                    d="M1 5.5L4.5 9L7 6.5M9 5.5L12.5 9L15 6.5"
                    stroke={CHECK_COLOR}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div
                className="absolute -right-1 top-0 h-3 w-3"
                style={{
                  backgroundColor: SENT_COLOR,
                  clipPath: "polygon(0 0, 0% 100%, 100% 0)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="flex items-center gap-2 px-2.5 py-2"
        style={{ backgroundColor: INPUT_BG }}
      >
        <div className="h-8 flex-1 rounded-full bg-white px-3 text-[11px] flex items-center overflow-hidden">
          {inputText ? (
            <span className="text-zinc-800 truncate">{inputText}</span>
          ) : (
            <span style={{ color: "#8696a0" }}>Message</span>
          )}
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors"
          style={{
            backgroundColor:
              phase === "ready" || phase === "sending" || showSent
                ? "#008069"
                : "#8696a0",
          }}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
