import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, Gauge, Calendar, Fuel, Heart } from "lucide-react";

const planConfig: any = {
  dealer: { label: "Dealer", className: "bg-blue-600 text-white border-blue-600" },
  free: { label: "Private Seller", className: "bg-white text-gray-900 border-white" },
};

const CarCard = ({ car, index = 0 }: any) => {
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

          <div className="relative aspect-[16/10] overflow-hidden">

            <img
              src={image}
              alt={car?.title || "Vehicle"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />

            {/* SELLER TYPE BADGE */}

            <div className="absolute top-3 left-3">

              <Badge
                variant="outline"
                className={plan.className}
              >
                {sellerLabel}
              </Badge>

            </div>

            {/* FAVORITE BUTTON (future feature) */}

            <button
              className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full p-2 shadow hover:bg-white transition"
            >
              <Heart className="h-4 w-4 text-muted-foreground" />
            </button>

          </div>

          {/* CARD CONTENT */}

          <div className="p-4">

            {/* TITLE */}

            <h3 className="font-heading font-semibold text-base group-hover:text-primary transition-colors line-clamp-1 mb-1">
              {car?.title || "Vehicle"}
            </h3>

            {/* PRICE */}

            <p className="text-2xl font-bold text-primary mb-3">
              ${Number(car?.price || 0).toLocaleString()}
            </p>

            {/* SPECS */}

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-medium text-slate-600">

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
