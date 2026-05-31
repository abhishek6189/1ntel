import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import BackButton from "@/components/BackButton";
import Breadcrumbs from "@/components/Breadcrumbs";
import CarCard from "@/components/CarCard";
import Footer from "@/components/Footer";
import GlobalLoader from "@/components/GlobalLoader";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import { makes, bodyTypes, transmissions, fuelTypes } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { filterVisibleCarsForPublic } from "@/utils/subscriptionAccess";

import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";

const PAGE_SIZE = 12;
const MAX_PRICE = 1000000;

const normalizeOption = (value: string) => value.toLowerCase();

const getPageNumbers = (page: number, totalPages: number) => {
  const pages: Array<number | "ellipsis"> = [];

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  pages.push(1);

  if (page > 4) pages.push("ellipsis");

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }

  if (page < totalPages - 3) pages.push("ellipsis");

  pages.push(totalPages);
  return pages;
};

const BrowseCars = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const [make, setMake] = useState("all");
  const [bodyType, setBodyType] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [fuelType, setFuelType] = useState("all");
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);
  const startResult = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endResult = Math.min(page * PAGE_SIZE, totalCount);

  useEffect(() => {
    setPage(1);
  }, [query, make, bodyType, transmission, fuelType, priceRange, sort]);

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingSearch(window.scrollY > 260);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const cleanQuery = trimmedQuery.replace(/[,%]/g, "");

    const timer = window.setTimeout(async () => {
      const { data, error } = await (supabase as any)
        .from("cars")
        .select("id, title, make, model, year, location")
        .or("status.is.null,status.eq.active")
        .or(
          `title.ilike.%${cleanQuery}%,make.ilike.%${cleanQuery}%,model.ilike.%${cleanQuery}%,location.ilike.%${cleanQuery}%`
        )
        .order("created_at", { ascending: false })
        .limit(6);

      if (cancelled) return;

      if (error) {
        setSuggestions([]);
        return;
      }

      const seen = new Set<string>();
      const uniqueSuggestions = (data || []).flatMap((car: any) => {
        const label = [car.year, car.make, car.model]
          .filter(Boolean)
          .join(" ")
          .trim() || car.title;
        const value = label || car.title || "";
        const key = value.toLowerCase();

        if (!value || seen.has(key)) return [];

        seen.add(key);
        return [{ ...car, label: value }];
      });

      setSuggestions(uniqueSuggestions);
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const fetchCars = async () => {
      setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const trimmedQuery = query.trim();

      let request = (supabase as any)
        .from("cars")
        .select(
          `
          *,
          car_images (
            image_url
          )
        `,
          { count: "exact" }
        )
        .or("status.is.null,status.eq.active")
        .gte("price", priceRange[0])
        .lte("price", priceRange[1]);

      if (trimmedQuery) {
        request = request.or(
          `title.ilike.%${trimmedQuery}%,make.ilike.%${trimmedQuery}%,model.ilike.%${trimmedQuery}%`
        );
      }

      if (make !== "all") request = request.eq("make", make);
      if (bodyType !== "all") request = request.eq("body_type", bodyType);
      if (transmission !== "all") request = request.eq("transmission", transmission);
      if (fuelType !== "all") request = request.eq("fuel_type", fuelType);

      if (sort === "price-asc") {
        request = request.order("price", { ascending: true });
      } else if (sort === "price-desc") {
        request = request.order("price", { ascending: false });
      } else {
        request = request.order("created_at", { ascending: false });
      }

      const { data, error, count } = await request.range(from, to);

      if (error) {
        console.error("Error fetching cars:", error);
        setCars([]);
        setTotalCount(0);
      } else {
        const visibleCars = await filterVisibleCarsForPublic(data || []);
        setCars(visibleCars);
        setTotalCount(visibleCars.length < (data || []).length ? visibleCars.length : count || 0);
      }

      setLoading(false);
    };

    fetchCars();
  }, [page, query, make, bodyType, transmission, fuelType, priceRange, sort]);

  const clearFilters = () => {
    setQuery("");
    setMake("all");
    setBodyType("all");
    setTransmission("all");
    setFuelType("all");
    setPriceRange([0, MAX_PRICE]);
    setSort("newest");
    setPage(1);
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(safePage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderSearchBox = () => (
    <div className="relative min-w-0 rounded-xl shadow-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search make or model..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSuggestionsOpen(true);
        }}
        onFocus={() => setSuggestionsOpen(true)}
        onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
        className="h-12 border-gray-200 bg-white pl-10 shadow-sm"
      />

      {suggestionsOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-xl border bg-white shadow-lg">
          {suggestions.map((item) => (
            <button
              key={`${item.id}-${item.label}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery(item.label);
                setSuggestionsOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-900">
                  {item.label}
                </span>
                {item.location && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {item.location}
                  </span>
                )}
              </span>
              <Search className="h-4 w-4 shrink-0 text-blue-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <SEO
        title="Used Cars for Sale in Canada | 1ntel"
        description="Browse used cars for sale in Toronto and across Canada. Filter by make, model, price, body type, transmission, fuel type, and location on 1ntel."
        path="/browse"
      />
      <Navbar />

      {showFloatingSearch && (
        <div className="fixed left-0 right-0 top-0 z-[70] border-b border-gray-200 bg-[#f3f4f6]/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {renderSearchBox()}
          </div>
        </div>
      )}

      <main className="container px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <BackButton />
        <Breadcrumbs />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-1">
            Used Cars for Sale in Canada
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Browse private seller, dealer, and garage listings in Toronto and across Canada.
          </p>
        </motion.div>

        <div className="mb-4">
          {renderSearchBox()}
        </div>

        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:ml-auto sm:w-auto sm:grid-cols-[12rem_auto]">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowFilters((value) => !value)}
              className="w-full sm:w-auto"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 rounded-lg border bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={make} onValueChange={setMake}>
                  <SelectTrigger>
                    <SelectValue placeholder="Make" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Makes</SelectItem>
                    {makes.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={bodyType} onValueChange={setBodyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Body Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Body Types</SelectItem>
                    {bodyTypes.map((item) => (
                      <SelectItem key={item} value={normalizeOption(item)}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={transmission} onValueChange={setTransmission}>
                  <SelectTrigger>
                    <SelectValue placeholder="Transmission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transmissions</SelectItem>
                    {transmissions.map((item) => (
                      <SelectItem key={item} value={normalizeOption(item)}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Fuel Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fuel Types</SelectItem>
                    {fuelTypes.map((item) => (
                      <SelectItem key={item} value={normalizeOption(item)}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3 text-sm text-muted-foreground">
                    <span>Price range</span>
                    <span className="font-medium text-foreground">
                      ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={priceRange}
                    min={0}
                    max={MAX_PRICE}
                    step={5000}
                    onValueChange={setPriceRange}
                  />
                </div>

                <Button variant="ghost" onClick={clearFilters} className="w-full lg:w-auto">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <p className="text-sm text-muted-foreground">
            {totalCount} vehicles found
          </p>
          {totalCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {startResult}-{endResult} of {totalCount}
            </p>
          )}
        </div>

        {loading ? (
          <GlobalLoader />
        ) : cars.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {cars.map((car, i) => (
                <CarCard
                  key={car.id}
                  car={{
                    ...car,
                    image_url: car.car_images?.[0]?.image_url || car.image_url,
                  }}
                  index={i}
                  compact
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
                aria-label="Browse cars pagination"
              >
                <Button
                  variant="outline"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="w-full sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="flex flex-wrap justify-center gap-2">
                  {pageNumbers.map((pageNumber, index) =>
                    pageNumber === "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="h-10 min-w-10 px-3 inline-flex items-center justify-center text-muted-foreground"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === page ? "default" : "outline"}
                        onClick={() => goToPage(pageNumber)}
                        className="h-10 min-w-10 px-3"
                      >
                        {pageNumber}
                      </Button>
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="w-full sm:w-auto"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </nav>
            )}
          </>
        ) : (
          <div className="text-center py-16 sm:py-20 text-muted-foreground">
            <p className="text-base sm:text-lg">No vehicles match your filters</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BrowseCars;
