import Breadcrumbs from "@/components/Breadcrumbs";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  Plus,
  CreditCard,
  ClipboardCheck,
  Trash,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // ✅ FIXED

const SellerDashboard = () => {

  const [cars, setCars] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    /* SELLER CARS */

    const { data: carData } = await (supabase as any)
      .from("cars")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (carData) setCars(carData);

    /* INSPECTIONS */

    const { data: inspectionData } = await (supabase as any)
      .from("inspection_requests")
      .select(`
        *,
        cars ( title )
      `)
      .eq("seller_id", user.id);

    if (inspectionData) setInspections(inspectionData);

    setLoading(false);
  };

  const deleteListing = async (id: string) => {

    const confirmDelete = confirm("Delete this listing?");
    if (!confirmDelete) return;

    await (supabase as any)
      .from("cars")
      .delete()
      .eq("id", id);

    setCars(cars.filter((c) => c.id !== id));
  };

  const markSold = async (id: string) => {

    await (supabase as any)
      .from("cars")
      .update({ status: "sold" })
      .eq("id", id);

    loadDashboard();
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar />

      <div className="container py-8 max-w-6xl">

        <Breadcrumbs />

        {/* HEADER */}

        <div className="flex items-center justify-between mb-8">

          <div>
            <h1 className="text-3xl font-bold">
              Seller Dashboard
            </h1>

            <p className="text-muted-foreground">
              Manage your car listings and inspection requests
            </p>
          </div>

          <Button asChild>
            <Link to="/listing/new">
              <Plus className="h-4 w-4 mr-2" />
              New Listing
            </Link>
          </Button>

        </div>

        {/* PLAN */}

        <div className="bg-white border rounded-xl p-6 flex items-center justify-between mb-8">

          <div>
            <p className="text-sm text-muted-foreground">
              Current Plan
            </p>

            <p className="font-bold text-lg">
              Free Plan
            </p>

            <p className="text-sm text-muted-foreground">
              {cars.length} active listings
            </p>
          </div>

          <Button asChild variant="outline">
            <Link to="/pricing">
              <CreditCard className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Link>
          </Button>

        </div>

        <Tabs defaultValue="listings">

          <TabsList>

            <TabsTrigger value="listings">
              <Car className="h-4 w-4 mr-2" />
              My Listings
            </TabsTrigger>

            <TabsTrigger value="inspections">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Inspections
            </TabsTrigger>

          </TabsList>

          {/* LISTINGS */}

          <TabsContent value="listings" className="mt-6">

            {loading ? (
              <p>Loading listings...</p>
            ) : cars.length === 0 ? (

              <div className="text-center py-20 border rounded-xl">

                <p className="mb-4 text-muted-foreground">
                  No listings yet
                </p>

                <Button asChild>
                  <Link to="/listing/new">
                    Create Your First Listing
                  </Link>
                </Button>

              </div>

            ) : (

              <div className="space-y-4">

                {cars.map((car) => (

                  <div
                    key={car.id}
                    className="bg-white border rounded-xl p-5 flex items-center justify-between"
                  >

                    <div>

                      <p className="font-semibold">
                        {car.title}
                      </p>

                      <p className="text-primary font-bold">
                        ${Number(car.price).toLocaleString()}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {car.location}
                      </p>

                    </div>

                    <div className="flex items-center gap-2">

                      <Badge>
                        {car.status || "active"}
                      </Badge>

                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/car/${car.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markSold(car.id)}
                      >
                        Mark Sold
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteListing(car.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </TabsContent>

          {/* INSPECTIONS */}

          <TabsContent value="inspections" className="mt-6">

            {inspections.length === 0 ? (

              <div className="text-center py-16 border rounded-xl">
                <p className="text-muted-foreground">
                  No inspection requests yet
                </p>
              </div>

            ) : (

              <div className="space-y-4">

                {inspections.map((inspection) => (

                  <div
                    key={inspection.id}
                    className="bg-white border rounded-xl p-5 flex justify-between"
                  >

                    <div>

                      <p className="font-semibold">
                        {inspection.cars?.title}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Buyer ID: {inspection.buyer_id}
                      </p>

                    </div>

                    <Badge>
                      {inspection.status || "pending"}
                    </Badge>

                  </div>

                ))}

              </div>

            )}

          </TabsContent>

        </Tabs>

      </div>

      <Footer />

    </div>
  );
};

export default SellerDashboard;