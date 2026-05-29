import Lottie from "lottie-react";
import carLoader from "@/assets/carr.json";

type GlobalLoaderProps = {
  className?: string;
  sizeClassName?: string;
};

const GlobalLoader = ({
  className = "py-24",
  sizeClassName = "w-32 h-32",
}: GlobalLoaderProps) => (
  <div className={`flex w-full items-center justify-center ${className}`}>
    <div className={sizeClassName}>
      <Lottie animationData={carLoader} loop />
    </div>
  </div>
);

export default GlobalLoader;
