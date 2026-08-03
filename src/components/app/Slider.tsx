import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Auto-advancing image slider used on the storefront home page. */
export function ImageSlider({ images, intervalSec }: { images: string[]; intervalSec: number }) {
  const [i, setI] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    timer.current = setInterval(() => setI((p) => (p + 1) % images.length), Math.max(1, intervalSec) * 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [images.length, intervalSec]);

  useEffect(() => { setI(0); }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-surface/60 aspect-[16/7] grid place-items-center text-xs text-muted-foreground">
        ຍັງບໍ່ມີຮູບສະໄລ້
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-surface aspect-[16/7]">
      {images.map((src, idx) => (
        <img
          key={idx}
          src={src}
          alt={`ສະໄລ້ ${idx + 1}`}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            idx === i ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setI((p) => (p - 1 + images.length) % images.length)}
            aria-label="ກ່ອນ"
            className="absolute left-1 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-full bg-background/70"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setI((p) => (p + 1) % images.length)}
            aria-label="ຕໍ່ໄປ"
            className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-full bg-background/70"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <span key={idx} className={cn("h-1.5 rounded-full transition-all", idx === i ? "w-4 bg-primary" : "w-1.5 bg-background/70")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Full-screen advertisement popup with its own swipeable slides. */
export function AdPopup({ images, onClose }: { images: string[]; onClose: () => void }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setI((p) => (p + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm">
        <button
          onClick={onClose}
          aria-label="ປິດ"
          className="absolute -top-3 -right-3 z-10 grid place-items-center size-9 rounded-full bg-background border border-border shadow"
        >
          <X className="size-4" />
        </button>
        <div className="rounded-2xl overflow-hidden bg-card">
          <img src={images[i]} alt={`ໂຄສະນາ ${i + 1}`} className="w-full h-auto object-contain" />
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <button onClick={() => setI((p) => (p - 1 + images.length) % images.length)} className="grid place-items-center size-8 rounded-full bg-background/90">
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex gap-1.5">
              {images.map((_, idx) => (
                <span key={idx} className={cn("h-1.5 rounded-full", idx === i ? "w-4 bg-primary" : "w-1.5 bg-background/80")} />
              ))}
            </div>
            <button onClick={() => setI((p) => (p + 1) % images.length)} className="grid place-items-center size-8 rounded-full bg-background/90">
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
