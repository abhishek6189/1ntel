import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, Gauge, Calendar, Fuel, Heart } from "lucide-react";

const planConfig: any = {
  dealer: { label: "Dealer", className: "bg-blue-600 text-white border-blue-600" },
  free: { label: "Private Seller", className: "bg-white text-gray-900 border-white" },
};

const CarCard = ({ car, index = 0, compact = false }: any) => {
  const sellerPlan = String(car?.seller_plan || "free").toLowerCase();
  const plan = planConfig[sellerPlan] || planConfig.free;
  const sellerLabel = car?.seller_plan_label || plan.label;

  const image =
    car?.image_url ||
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >

      <Link to={`/car/${car.id}`} className="group block">

        <div className="bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300">

          {/* IMAGE */}

          <div className={`relative overflow-hidden ${compact ? "aspect-[4/3] sm:aspect-[16/10]" : "aspect-[16/10]"}`}>

            <img
              src={image}
              alt={car?.title || "Vehicle"}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "auto"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />

            {/* SELLER TYPE BADGE */}

            <div className={compact ? "absolute left-2 top-2 sm:left-3 sm:top-3" : "absolute top-3 left-3"}>

              <Badge
                variant="outline"
                className={`${plan.className} ${compact ? "px-1.5 py-0 text-[10px] sm:px-2.5 sm:py-0.5 sm:text-xs" : ""}`}
              >
                {sellerLabel}
              </Badge>

            </div>

            {/* FAVORITE BUTTON (future feature) */}

            <button
              className={`${compact ? "absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow backdrop-blur transition hover:bg-white sm:right-3 sm:top-3 sm:p-2" : "absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full p-2 shadow hover:bg-white transition"}`}
            >
              <Heart className={`${compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4"} text-muted-foreground`} />
            </button>

          </div>

          {/* CARD CONTENT */}

          <div className={compact ? "p-2.5 sm:p-4" : "p-4"}>

            {/* TITLE */}

            <h3 className={`${compact ? "mb-1 line-clamp-2 min-h-[2.25rem] text-sm leading-tight sm:min-h-0 sm:text-base" : "text-base line-clamp-1 mb-1"} font-heading font-semibold group-hover:text-primary transition-colors`}>
              {car?.title || "Vehicle"}
            </h3>

            {/* PRICE */}

            <p className={`${compact ? "mb-2 text-lg sm:mb-3 sm:text-2xl" : "text-2xl mb-3"} font-bold text-primary`}>
              ${Number(car?.price || 0).toLocaleString()}
            </p>

            {/* SPECS */}

            <div className={`${compact ? "grid grid-cols-1 gap-y-1 text-[11px] sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2 sm:text-xs" : "grid grid-cols-2 gap-x-3 gap-y-2 text-xs"} font-medium text-slate-600`}>

              <span className="flex min-w-0 items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{Number(car?.mileage || 0).toLocaleString()} km</span>
              </span>

              <span className="flex min-w-0 items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{car?.year || "-"}</span>
              </span>

              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{car?.location || "-"}</span>
              </span>

              <span className="flex min-w-0 items-center gap-1.5">
                <Fuel className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{car?.fuel_type || "-"}</span>
              </span>

            </div>

          </div>

        </div>

      </Link>

    </motion.div>
  );
};

export default CarCard;
