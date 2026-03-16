import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, Gauge, Calendar, Fuel, Heart } from "lucide-react";

const statusConfig: any = {
  none: { label: "Not Inspected", variant: "secondary" },
  pending: { label: "Inspection Pending", variant: "outline" },
  passed: { label: "Verified", variant: "default" },
  passed_with_issues: { label: "Verified (Issues)", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" }
};

const CarCard = ({ car, index = 0 }: any) => {

  const status =
    statusConfig[car?.inspection_status] || statusConfig.none;

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

            {/* STATUS BADGE */}

            <div className="absolute top-3 left-3">

              <Badge
                variant={status.variant}
                className={
                  car?.inspection_status === "passed"
                    ? "bg-green-600 text-white border-green-600"
                    : ""
                }
              >
                {status.label}
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

            <div className="grid grid-cols-2 gap-y-2 text-xs text-muted-foreground">

              <span className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                {Number(car?.mileage || 0).toLocaleString()} km
              </span>

              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {car?.year || "-"}
              </span>

              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {car?.location || "-"}
              </span>

              <span className="flex items-center gap-1.5">
                <Fuel className="h-3.5 w-3.5" />
                {car?.fuel_type || "-"}
              </span>

            </div>

          </div>

        </div>

      </Link>

    </motion.div>
  );
};

export default CarCard;