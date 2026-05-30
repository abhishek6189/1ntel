type BrandLogoProps = {
  className?: string;
};

const BrandLogo = ({ className = "" }: BrandLogoProps) => (
  <span
    className={`inline-flex items-end font-logo font-black leading-none tracking-normal ${className}`}
    role="img"
    aria-label="1ntel"
  >
    <span className="relative top-[0.015em] text-[1.06em] leading-none text-[#00357a]">
      1
    </span>
    <span className="leading-none text-black">ntel</span>
  </span>
);

export default BrandLogo;
