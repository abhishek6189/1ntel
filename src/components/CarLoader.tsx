const CarLoader = () => {
return ( <div className="flex flex-col items-center justify-center py-20 gap-6">

  {/* Rolling Tyre */}
  <div className="relative w-24 h-24">

    {/* Tyre */}
    <div className="w-24 h-24 rounded-full border-[10px] border-gray-800 border-t-gray-400 animate-spin"></div>

    {/* Rim */}
    <div className="absolute inset-4 rounded-full border-[6px] border-gray-500"></div>

    {/* Center */}
    <div className="absolute inset-[38px] rounded-full bg-gray-700"></div>

  </div>

  {/* Text */}
  <p className="text-muted-foreground text-sm">
    Loading vehicles...
  </p>

</div>


);
};

export default CarLoader;
