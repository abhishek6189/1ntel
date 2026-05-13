import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

import {
  Eye, Trash2, Search, ShieldCheck, ShieldX, User
} from 'lucide-react';

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminListings({ cars = [] }) {

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [localCars, setLocalCars] = useState([]);

  /* ✅ FIX: useEffect instead of useMemo (IMPORTANT) */
  useEffect(() => {
    setLocalCars(cars);
  }, [cars]);

  /* ✅ IMAGE FIX (car_images table) */
  const getImage = (car) => {
    return car.car_images?.[0]?.image_url || "/placeholder.png";
  };

  /* 🔍 FILTER */
  const filtered = useMemo(() => {
    return localCars.filter(c => {

      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      if (search) {
        const s = search.toLowerCase();
        return (
          c.title?.toLowerCase().includes(s) ||
          c.profiles?.email?.toLowerCase().includes(s) ||
          c.profiles?.full_name?.toLowerCase().includes(s)
        );
      }

      return true;
    });
  }, [localCars, search, statusFilter]);

  /* 🗑 DELETE */
  const handleDelete = async (id) => {
    if (!confirm('Delete this listing?')) return;

    const { error } = await supabase
      .from("cars")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Deleted");

    setLocalCars(prev => prev.filter(c => c.id !== id));
  };

  /* 🔥 VERIFY TOGGLE */
  const toggleInspection = async (car) => {

    const newStatus =
      car.inspection_status === "passed"
        ? "not_inspected"
        : "passed";

    const { error } = await supabase
      .from("cars")
      .update({ inspection_status: newStatus })
      .eq("id", car.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      newStatus === "passed"
        ? "Marked as Verified"
        : "Marked as Unverified"
    );

    setLocalCars(prev =>
      prev.map(c =>
        c.id === car.id
          ? { ...c, inspection_status: newStatus }
          : c
      )
    );
  };

  /* ✅ VERIFIED CHECK FIX */
  const isVerified = (car) =>
    car.inspection_status === "passed" ||
    car.inspection_status === "verified";

  return (
    <div>

      {/* 🔍 SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">

        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Search listings..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {/* COUNT */}
      <p className="text-sm text-muted-foreground mb-4">
        {filtered.length} listings
      </p>

      {/* 🚗 LIST */}
      <div className="space-y-4">

        {filtered.map(car => (

          <div
            key={car.id}
            className="bg-card rounded-xl border p-4 flex flex-col gap-4 hover:shadow-md transition-all lg:flex-row lg:items-center"
          >

            {/* 🖼 IMAGE */}
            <div className="w-full h-44 rounded-lg overflow-hidden bg-gray-100 sm:h-52 lg:h-24 lg:w-40 lg:min-w-[160px]">
              <img
                src={getImage(car)}
                className="w-full h-full object-cover"
              />
            </div>

            {/* 📄 INFO */}
            <div className="flex-1 min-w-0">

              <h4 className="font-semibold text-foreground">
                {car.title}
              </h4>

              <p className="text-primary font-bold">
                ₹{car.price?.toLocaleString()}
              </p>

              {/* ✅ SELLER FIX */}
              <p className="text-xs text-muted-foreground">
                {car.profiles?.full_name || "Unknown"} 
                {" ("}
                {car.profiles?.email || "No Email"}
                {")"}
              </p>

              {/* 👤 PROFILE LINK */}
              {car.seller_id && (
                <Link
                  to={`/seller/${car.seller_id}`}
                  className="text-xs text-blue-500 flex items-center gap-1 mt-1 hover:underline"
                >
                  <User className="h-3 w-3" />
                  View Seller Profile
                </Link>
              )}

            </div>

            {/* 🏷 STATUS */}
            <div className="flex flex-row flex-wrap items-center gap-2 lg:flex-col lg:items-end">

              {/* ✅ STATUS FIX */}
              <Badge className="capitalize">
                {car.status || "unknown"}
              </Badge>

              {/* ✅ VERIFIED FIX */}
              <Badge
                className={`text-xs ${
                  isVerified(car)
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {isVerified(car)
                  ? "Verified"
                  : "Unverified"}
              </Badge>

            </div>

            {/* ⚙️ ACTIONS */}
            <div className="flex gap-2 self-stretch lg:self-auto">

              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleInspection(car)}
              >
                {isVerified(car)
                  ? <ShieldX className="h-4 w-4" />
                  : <ShieldCheck className="h-4 w-4" />}
              </Button>

              <Link to={`/car/${car.id}`}>
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                className="text-red-500"
                onClick={() => handleDelete(car.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

            </div>

          </div>

        ))}

      </div>
    </div>
  );
}
