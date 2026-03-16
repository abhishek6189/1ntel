import BackButton from "@/components/BackButton";
import GlobalLoader from "@/components/GlobalLoader";
import Breadcrumbs from "@/components/Breadcrumbs";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CarCard from "@/components/CarCard";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue
} from "@/components/ui/select";

import { Slider } from "@/components/ui/slider";

import { makes, bodyTypes, transmissions, fuelTypes } from "@/lib/mockData";

import { supabase } from "@/integrations/supabase/client";

import { Search, SlidersHorizontal, X } from "lucide-react";

import { motion } from "framer-motion";

const BrowseCars = () => {

const [searchParams] = useSearchParams();
const [query, setQuery] = useState(searchParams.get("q") || "");

const [cars, setCars] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

const [make, setMake] = useState("all");
const [bodyType, setBodyType] = useState("all");
const [transmission, setTransmission] = useState("all");
const [fuelType, setFuelType] = useState("all");

const [priceRange, setPriceRange] = useState([0, 1000000]);

const [sort, setSort] = useState("newest");
const [showFilters, setShowFilters] = useState(false);

/* FETCH CARS */

useEffect(() => {

const fetchCars = async () => {

setLoading(true);

const { data, error } = await (supabase as any)
.from("cars")
.select(`       *,
      car_images (
        image_url
      )
    `)
.order("created_at", { ascending: false });

if (error) {
console.error("Error fetching cars:", error);
} else {
setCars(data || []);
}

setLoading(false);
};

fetchCars();

}, []);

/* FILTER LOGIC */

const filtered = useMemo(() => {

let filteredCars = cars.filter((c) => {

const price = Number(c.price) || 0;

if (
query &&
!c.title?.toLowerCase().includes(query.toLowerCase()) &&
!c.make?.toLowerCase().includes(query.toLowerCase()) &&
!c.model?.toLowerCase().includes(query.toLowerCase())
) return false;

if (make !== "all" && c.make !== make) return false;

if (bodyType !== "all" && c.body_type !== bodyType) return false;

if (transmission !== "all" && c.transmission !== transmission) return false;

if (fuelType !== "all" && c.fuel_type !== fuelType) return false;

if (price < priceRange[0] || price > priceRange[1]) return false;

return true;

});

if (sort === "price-asc") {
filteredCars.sort((a, b) => Number(a.price) - Number(b.price));
}

if (sort === "price-desc") {
filteredCars.sort((a, b) => Number(b.price) - Number(a.price));
}

if (sort === "newest") {
filteredCars.sort(
(a, b) =>
new Date(b.created_at).getTime() -
new Date(a.created_at).getTime()
);
}

return filteredCars;

}, [cars, query, make, bodyType, transmission, fuelType, priceRange, sort]);

const clearFilters = () => {

setQuery("");
setMake("all");
setBodyType("all");
setTransmission("all");
setFuelType("all");
setPriceRange([0, 1000000]);
setSort("newest");

};

return (

<div className="min-h-screen">

<Navbar />

<div className="container py-8">

<BackButton />

<Breadcrumbs />

<motion.div
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
className="mb-6"

>

<h1 className="font-heading text-3xl font-bold mb-1">
Browse Cars
</h1>

<p className="text-muted-foreground">
Find your next verified vehicle.
</p>

</motion.div>

{/* STICKY SEARCH BAR */}

<div className="sticky top-16 z-30 bg-white/80 backdrop-blur border-b pb-4 mb-6">

<div className="flex flex-col md:flex-row gap-3 pt-4">

<div className="relative flex-1">

<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

<Input
placeholder="Search make or model..."
value={query}
onChange={(e) => setQuery(e.target.value)}
className="pl-10"
/>

</div>

<Select value={sort} onValueChange={setSort}>

<SelectTrigger className="w-48">
<SelectValue placeholder="Sort by" />
</SelectTrigger>

<SelectContent>

<SelectItem value="newest">
Newest
</SelectItem>

<SelectItem value="price-asc">
Price: Low to High
</SelectItem>

<SelectItem value="price-desc">
Price: High to Low
</SelectItem>

</SelectContent>

</Select>

<Button
variant="outline"
onClick={() => setShowFilters(!showFilters)}

>

<SlidersHorizontal className="h-4 w-4 mr-2" />
Filters
</Button>

</div>

</div>

{/* RESULTS HEADER */}

<div className="flex items-center justify-between mb-4">

<p className="text-sm text-muted-foreground">
{filtered.length} vehicles found
</p>

</div>

{/* LOADING */}

{loading ? (

<GlobalLoader />

) : filtered.length > 0 ? (

<div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

{filtered.map((car, i) => (

<CarCard
key={car.id}
car={{
...car,
image_url: car.car_images?.[0]?.image_url || car.image_url
}}
index={i}
/>

))}

</div>

) : (

<div className="text-center py-20 text-muted-foreground">

<p className="text-lg">
No vehicles match your filters
</p>

<Button
variant="outline"
className="mt-4"
onClick={clearFilters}

>

Clear Filters </Button>

</div>

)}

</div>

<Footer />

</div>

);

};

export default BrowseCars;
