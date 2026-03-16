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

}, [current]);

return ( <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">

  {/* Close */}
  <button
    onClick={onClose}
    className="absolute top-6 right-6 text-white"
  >
    <X size={28} />
  </button>

  {/* Prev */}
  <button
    onClick={prev}
    className="absolute left-6 text-white"
  >
    <ChevronLeft size={40} />
  </button>

  {/* Image */}
  <img
    src={images[current]}
    className="max-h-[90vh] object-contain"
  />

  {/* Next */}
  <button
    onClick={next}
    className="absolute right-6 text-white"
  >
    <ChevronRight size={40} />
  </button>

  {/* Counter */}
  <div className="absolute bottom-6 text-white text-sm">
    {current + 1} / {images.length}
  </div>

</div>

);
};

export default FullscreenGallery;
