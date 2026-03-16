import Lottie from "lottie-react";
import carLoader from "@/assets/carr.json";

const GlobalLoader = () => {
return ( <div className="flex items-center justify-center py-24 w-full"> <div className="w-32 h-32"> <Lottie
       animationData={carLoader}
       loop={true}
     /> </div> </div>
);
};

export default GlobalLoader;
