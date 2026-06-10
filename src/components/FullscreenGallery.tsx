import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  images: string[];
  current: number;
  setCurrent: (i: number) => void;
  onClose: () => void;
}

const FullscreenGallery = ({ images, current, setCurrent, onClose }: Props) => {
  const next = () => {
    setCurrent((current + 1) % images.length);
  };

  const prev = () => {
    setCurrent((current - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [current, images.length, onClose]);

  if (!images.length) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
        <div className="rounded-full bg-white/12 px-3 py-1 text-sm font-medium text-white backdrop-blur">
          {current + 1} / {images.length}
        </div>

        <button
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition hover:bg-white/20"
          aria-label="Close gallery"
        >
          <X size={24} />
        </button>
      </div>

      {images.length > 1 && (
        <button
          onClick={prev}
          className="absolute left-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition hover:bg-white/20 sm:left-6 sm:h-12 sm:w-12"
          aria-label="Previous image"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      <img
        src={images[current]}
        alt={`Vehicle photo ${current + 1}`}
        loading="eager"
        decoding="async"
        className="h-full w-full object-contain px-0 py-20 sm:px-16"
      />

      {images.length > 1 && (
        <button
          onClick={next}
          className="absolute right-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition hover:bg-white/20 sm:right-6 sm:h-12 sm:w-12"
          aria-label="Next image"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 z-10 flex max-w-[90vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-full bg-black/35 p-2 backdrop-blur">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              onClick={() => setCurrent(index)}
              className={`h-12 w-16 shrink-0 overflow-hidden rounded-md border transition ${
                index === current ? "border-white" : "border-white/20 opacity-60"
              }`}
              aria-label={`Show photo ${index + 1}`}
            >
              <img
                src={image}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FullscreenGallery;
