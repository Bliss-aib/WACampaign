"use client";

import { useState } from "react";
import { Smartphone, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

const SAMPLE_VALUES: Record<string, string> = {
  name: "John Doe",
  firstname: "John",
  lastname: "Doe",
  business: "Acme Inc.",
  company: "Acme Inc.",
  date: "May 18, 2026",
  time: "2:30 PM",
  product: "Premium Plan",
  item: "Wireless Headphones",
  price: "$49.99",
  discount: "20%",
  code: "SAVE20",
  link: "https://example.com/shop",
  phone: "+1 (555) 000-0000",
  email: "john@example.com",
  location: "New York, NY",
  orderid: "#12345",
  status: "Shipped",
};

function fillVariables(body: string): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const lower = key.toLowerCase();
    return SAMPLE_VALUES[lower] || `{{${key}}}`;
  });
}

function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="relative w-full">
      <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-100">
        <Image
          src={images[current]}
          alt={`Slide ${current + 1}`}
          width={600}
          height={600}
          className="h-auto w-full object-cover"
          style={{ maxHeight: 280 }}
          priority
        />
        <span className="absolute bottom-2 right-2 text-[10px] font-medium text-white bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
          {current + 1} / {images.length}
        </span>
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="mt-2 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-4 bg-zinc-700" : "w-1.5 bg-zinc-300"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface WhatsAppPreviewProps {
  body: string;
  imageUrls?: string[] | null;
}

export function WhatsAppPreview({ body, imageUrls }: WhatsAppPreviewProps) {
  const previewText = fillVariables(body).trim();
  const images = imageUrls || [];
  const hasImages = images.length > 0;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-[340px] rounded-[2rem] border-[6px] border-zinc-800 bg-zinc-900 p-2 shadow-2xl">
        {/* Notch */}
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-zinc-800" />

        {/* Screen */}
        <div className="rounded-[1.5rem] bg-[#e5ddd5] p-3 overflow-hidden">
          {/* Header */}
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#f0f0f0] p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-300">
              <Smartphone className="h-5 w-5 text-zinc-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-800">Campaign Preview</p>
              <p className="text-[10px] text-zinc-500">online</p>
            </div>
          </div>

          {/* Chat area */}
          <div className="min-h-[200px] space-y-2">
            {hasImages && (
              <div className="flex justify-start">
                <div className="w-[95%]">
                  <ImageCarousel images={images} />
                </div>
              </div>
            )}

            {previewText ? (
              <div className="flex justify-start">
                <div className="relative w-[95%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm">
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-800">
                    {previewText}
                  </p>
                  <span className="mt-1 block text-right text-[10px] text-zinc-400">
                    10:30 AM
                  </span>
                </div>
              </div>
            ) : !hasImages && (
              <div className="flex h-40 items-center justify-center">
                <p className="text-center text-xs text-zinc-400">
                  Start typing to see preview...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-zinc-400">Preview with sample values</p>
    </div>
  );
}
