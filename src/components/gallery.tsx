"use client";

import { useState } from "react";

export function Gallery({ images }: { images: { url: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = images[index] ?? images[0];
  if (!current) return <div className="aspect-square rounded-3xl bg-warm" />;
  return (
    <div>
      <button type="button" className="block w-full overflow-hidden rounded-3xl bg-warm" onClick={() => setZoom(true)} aria-label={`Zoom ${current.alt}`}>
        <img src={current.url} alt={current.alt} className="aspect-square w-full object-cover" />
      </button>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2">
          {images.map((image, imageIndex) => (
            <li key={image.url}>
              <button type="button" className={`overflow-hidden rounded-xl border ${imageIndex === index ? "border-primary" : "border-line"}`} onClick={() => setIndex(imageIndex)} aria-label={`Show image ${imageIndex + 1}`}>
                <img src={image.url} alt="" className="h-16 w-16 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4" role="dialog" aria-modal="true" aria-label="Zoomed product photo">
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white px-4 py-2" onClick={() => setZoom(false)}>Close</button>
          <img
            src={current.url}
            alt={current.alt}
            className="max-h-[85vh] max-w-full cursor-zoom-in object-contain"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / rect.width) * 100;
              const y = ((event.clientY - rect.top) / rect.height) * 100;
              event.currentTarget.style.transformOrigin = `${x}% ${y}%`;
              event.currentTarget.style.transform = "scale(1.6)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}
