type BrandLogoProps = {
  className?: string;
};

const BrandLogo = ({ className = "" }: BrandLogoProps) => (
  <span
    className={`inline-flex items-baseline font-extrabold tracking-tight leading-none ${className}`}
    aria-label="1ntel"
  >
    <span className="text-blue-600">1</span>
    <span className="text-slate-950">ntel</span>
  </span>
);

export default BrandLogo;
