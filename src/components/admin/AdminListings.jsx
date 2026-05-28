import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Trash2, Search, ShieldCheck, ShieldX, User } from "lucide-react";
import { toast } from "sonner";
import { runAdminListingAction } from "@/utils/adminListingActions";

export default function AdminListings({ cars = [], onRefresh }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [localCars, setLocalCars] = useState([]);

  useEffect(() => {
    setLocalCars(cars);
  }, [cars]);

  const getImage = (car) =>
    car.car_images?.[0]?.image_url || car.image_url || "/placeholder.svg";

  const getSellerName = (car) =>
    car.seller?.full_name || car.seller?.email || car.seller?.phone || "Unknown seller";

  const getSellerContact = (car) =>
    car.seller?.email || car.seller?.phone || "No contact added";

  const filtered = useMemo(() => {
    return localCars.filter((car) => {
      if (car.status === "removed") return false;

      if (statusFilter !== "all" && (car.status || "unknown") !== statusFilter) {
        return false;
      }

      if (!search) return true;

      const term = search.toLowerCase();
      return (
        car.title?.toLowerCase().includes(term) ||
        car.seller?.email?.toLowerCase().includes(term) ||
        car.seller?.phone?.toLowerCase().includes(term) ||
        car.seller?.full_name?.toLowerCase().includes(term)
      );
    });
  }, [localCars, search, statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this listing?")) return;

    try {
      await runAdminListingAction("delete_listing", id);
      toast.success("Deleted");
      setLocalCars((prev) => prev.filter((car) => car.id !== id));
      onRefresh?.();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const toggleInspection = async (car) => {
    const newStatus =
      car.inspection_status === "passed" ? "not_inspected" : "passed";

    try {
      await runAdminListingAction("update_inspection", car.id, newStatus);
      toast.success(
        newStatus === "passed" ? "Marked as Verified" : "Marked as Unverified"
      );

      setLocalCars((prev) =>
        prev.map((item) =>
          item.id === car.id ? { ...item, inspection_status: newStatus } : item
        )
      );
      onRefresh?.();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const isVerified = (car) =>
    car.inspection_status === "passed" || car.inspection_status === "verified";

  return (
    <div className="min-w-0">
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, seller, email, or phone..."
            className="h-10 rounded-xl pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full rounded-xl md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} listings
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No listings found
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          {filtered.map((car) => (
            <div
              key={car.id}
              className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)_auto] gap-3 border-b bg-card p-2.5 last:border-b-0 hover:bg-muted/30 sm:grid-cols-[80px_minmax(0,1fr)_120px_116px] sm:items-center"
            >
              <div className="h-14 w-[72px] overflow-hidden rounded-md bg-gray-100 sm:h-16 sm:w-20">
                <img
                  src={getImage(car)}
                  alt={car.title || "Car listing"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-foreground">
                    {car.title || "Untitled listing"}
                  </h4>
                  <p className="text-base font-bold text-primary">
                    ${Number(car.price || 0).toLocaleString()}
                  </p>
                </div>

                <div className="min-w-0 text-[11px] leading-4 text-muted-foreground">
                  <p className="truncate font-medium text-foreground/80">
                    {getSellerName(car)}
                  </p>
                  <p className="truncate">{getSellerContact(car)}</p>
                </div>

                {car.seller_id && (
                  <Link
                    to={`/seller/${car.seller_id}`}
                    className="inline-flex max-w-full items-center gap-1 text-[11px] text-blue-600 hover:underline"
                  >
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">View Seller Profile</span>
                  </Link>
                )}
              </div>

              <div className="hidden flex-wrap items-center gap-1.5 sm:flex sm:flex-col sm:items-start">
                <Badge className="max-w-full px-2 py-0.5 text-[11px] capitalize">
                  <span className="truncate">{car.status || "unknown"}</span>
                </Badge>

                <Badge
                  className={`max-w-full px-2 py-0.5 text-[11px] ${
                    isVerified(car)
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {isVerified(car) ? "Verified" : "Unverified"}
                </Badge>
              </div>

              <div className="flex items-center justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title={isVerified(car) ? "Mark unverified" : "Mark verified"}
                  onClick={() => toggleInspection(car)}
                >
                  {isVerified(car) ? (
                    <ShieldX className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                </Button>

                <Button asChild variant="outline" size="icon" className="h-8 w-8" title="View listing">
                  <Link to={`/car/${car.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  title="Delete listing"
                  className="h-8 w-8 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => handleDelete(car.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
