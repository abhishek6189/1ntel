import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Check, X } from "lucide-react";
import { toast } from "sonner";
import { runAdminListingAction } from "@/utils/adminListingActions";

export default function AdminFeatured({ cars = [], onRefresh }) {
  const pendingRequests = cars.filter(
    (car) => car.feature_request_status === "pending"
  );

  const featuredCars = cars.filter((car) => car.is_featured === true);

  const getImage = (car) =>
    car.car_images?.[0]?.image_url ||
    car.image_url ||
    "/placeholder.svg";

  const getSellerLabel = (car) =>
    car.seller?.full_name || car.seller?.email || car.seller?.phone || "Unknown seller";

  const handleApprove = async (carId) => {
    try {
      await runAdminListingAction("update_feature", carId, "approved");
      toast.success("Car approved as featured");
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReject = async (carId) => {
    try {
      await runAdminListingAction("update_feature", carId, "rejected");
      toast.success("Feature request rejected");
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRemoveFeatured = async (carId) => {
    try {
      await runAdminListingAction("update_feature", carId, "none");
      toast.success("Removed from featured");
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Pending Feature Requests ({pendingRequests.length})
        </h3>

        {pendingRequests.length === 0 ? (
          <div className="bg-card rounded-xl border p-8 text-center text-muted-foreground">
            No pending feature requests
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((car) => (
              <div
                key={car.id}
                className="bg-card rounded-xl border border-yellow-200 p-4 flex flex-col gap-4 lg:flex-row lg:items-center"
              >
                <img
                  src={getImage(car)}
                  className="w-full h-40 rounded-lg object-cover sm:h-48 lg:h-20 lg:w-28"
                  alt={car.title || "Car"}
                />

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold">{car.title || "Untitled listing"}</h4>
                  <p className="text-primary font-bold">
                    ${Number(car.price || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    By: {getSellerLabel(car)}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    size="sm"
                    className="bg-green-600"
                    onClick={() => handleApprove(car.id)}
                  >
                    <Check className="h-3 w-3" /> Approve
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(car.id)}
                  >
                    <X className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-foreground mb-4">
          Currently Featured ({featuredCars.length})
        </h3>

        {featuredCars.length === 0 ? (
          <div className="bg-card rounded-xl border p-8 text-center text-muted-foreground">
            No featured cars yet
          </div>
        ) : (
          <div className="space-y-3">
            {featuredCars.map((car) => (
              <div
                key={car.id}
                className="bg-card rounded-xl border p-4 flex flex-col gap-4 lg:flex-row lg:items-center"
              >
                <img
                  src={getImage(car)}
                  className="w-full h-40 rounded-lg object-cover sm:h-48 lg:h-20 lg:w-28"
                  alt={car.title || "Car"}
                />

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold">{car.title || "Untitled listing"}</h4>
                  <p className="text-sm text-muted-foreground">
                    ${Number(car.price || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    By: {getSellerLabel(car)}
                  </p>
                </div>

                <Badge className="bg-amber-100 text-amber-800">
                  <Star className="h-3 w-3" /> Featured
                </Badge>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleRemoveFeatured(car.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
