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
import { Eye, Trash2, Search, User } from "lucide-react";
import { toast } from "sonner";
import { runAdminListingAction } from "@/utils/adminListingActions";

export default function AdminListings({ cars = [], onRefresh }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [localCars, setLocalCars] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    setLocalCars(cars);
    setSelectedIds(new Set());
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

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((car) => selectedIds.has(car.id));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allFilteredSelected) {
        filtered.forEach((car) => next.delete(car.id));
      } else {
        filtered.forEach((car) => next.add(car.id));
      }

      return next;
    });
  };

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

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (!confirm(`Delete ${ids.length} selected listing${ids.length === 1 ? "" : "s"}?`)) {
      return;
    }

    setBulkDeleting(true);

    const failed = [];
    const deletedIds = [];
    for (const id of ids) {
      try {
        await runAdminListingAction("delete_listing", id);
        deletedIds.push(id);
      } catch (error) {
        failed.push(error.message || id);
      }
    }

    setBulkDeleting(false);

    if (failed.length) {
      toast.error(`${failed.length} listing${failed.length === 1 ? "" : "s"} could not be deleted.`);
    } else {
      toast.success(`Deleted ${ids.length} listing${ids.length === 1 ? "" : "s"}`);
    }

    setSelectedIds(new Set(ids.filter((id) => !deletedIds.includes(id))));
    setLocalCars((prev) => prev.filter((car) => !deletedIds.includes(car.id)));
    onRefresh?.();
  };

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

      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          {filtered.length} listings
          {selectedIds.size ? ` • ${selectedIds.size} selected` : ""}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            disabled={!filtered.length || bulkDeleting}
          >
            {allFilteredSelected ? "Clear selection" : "Select all visible"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={!selectedIds.size || bulkDeleting}
          >
            {bulkDeleting ? "Deleting..." : `Delete selected${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
          </Button>
        </div>
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
              className="flex min-h-20 items-center gap-3 border-b bg-card p-2.5 last:border-b-0 hover:bg-muted/30"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(car.id)}
                onChange={() => toggleSelect(car.id)}
                aria-label={`Select ${car.title || "listing"}`}
                className="h-4 w-4 shrink-0 rounded border-gray-300"
              />

              <div className="h-14 w-[72px] shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-16 sm:w-20">
                <img
                  src={getImage(car)}
                  alt={car.title || "Car listing"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
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

              <div className="hidden w-28 shrink-0 flex-wrap items-center gap-1.5 sm:flex sm:flex-col sm:items-start">
                <Badge className="max-w-full px-2 py-0.5 text-[11px] capitalize">
                  <span className="truncate">{car.status || "unknown"}</span>
                </Badge>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-1.5">
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
