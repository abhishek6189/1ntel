import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GlobalLoader from "@/components/GlobalLoader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Crown, Star } from "lucide-react";
import { FALLBACK_AVATAR_URL } from "@/utils/imageFiles";

const formatPlanName = (plan?: string) => {
  const normalized = String(plan || "free").toLowerCase();

  if (normalized === "free") return "Free Plan";
  if (normalized === "individual") return "Individual Plan";
  if (normalized === "garage") return "Garage Plan";
  if (normalized === "dealer") return "Dealer Plan";

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} Plan`;
};

const isDealerProfile = (seller: any) =>
  String(seller?.role || "").toLowerCase() === "dealer" ||
  String(seller?.plan || "").toLowerCase() === "dealer";

const SellerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState<any>(null);
  const [cars, setCars] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const client: any = supabase;
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUser(authData.user);

      /* SELLER */
      const { data: sellerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      setSeller(sellerData);

      /* CARS */
      const { data: carsData } = await supabase
        .from("cars")
        .select(`
          *,
          car_images (image_url)
        `)
        .eq("seller_id", id)
        .order("created_at", { ascending: false });

      setCars(carsData || []);

      const { data: reviewRows } = await client
        .from("seller_reviews")
        .select(`
          *,
          reviewer:profiles!seller_reviews_reviewer_id_fkey (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq("seller_id", id)
        .order("created_at", { ascending: false });

      setReviews(reviewRows || []);
      setLoading(false);
    };

    load();
  }, [id]);

  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  const submitReview = async () => {
    if (!id || !currentUser || currentUser.id === id || rating === 0) return;

    setReviewSaving(true);
    setReviewError("");

    const client: any = supabase;
    const payload = {
      seller_id: id,
      reviewer_id: currentUser.id,
      rating,
      review: reviewText.trim() || null,
    };

    const { error } = await client
      .from("seller_reviews")
      .upsert(payload, { onConflict: "seller_id,reviewer_id" });

    if (error) {
      setReviewError("Review save nahi hua. Database migration apply karni padegi.");
      setReviewSaving(false);
      return;
    }

    const { data: reviewRows } = await client
      .from("seller_reviews")
      .select(`
        *,
        reviewer:profiles!seller_reviews_reviewer_id_fkey (
          full_name,
          username,
          avatar_url
        )
      `)
      .eq("seller_id", id)
      .order("created_at", { ascending: false });

    setReviews(reviewRows || []);
    setReviewText("");
    setRating(0);
    setReviewSaving(false);
  };

  if (loading) return <GlobalLoader className="min-h-screen" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10">

        {/* BACK */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm text-gray-600"
        >
          ← Back
        </button>

        {/* SELLER HEADER */}
        <div className="bg-white border rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4 mb-6">

          <img
            src={seller?.avatar_url || FALLBACK_AVATAR_URL}
            className="w-20 h-20 rounded-full object-cover"
          />

          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold">
              {seller?.full_name || "User"}
            </h2>

            <p className="text-gray-500 text-sm">
              {seller?.email}
            </p>

            {seller?.phone && (
              <p className="text-sm mt-1">
                📞 {seller.phone}
              </p>
            )}

          </div>

          {isDealerProfile(seller) ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00357a]/20 bg-[#00357a]/10 px-3 py-1 text-xs font-semibold text-[#00357a]">
              <Crown className="h-3.5 w-3.5 fill-current" />
              Dealer
            </div>
          ) : (
            <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
              {formatPlanName(seller?.plan)}
            </div>
          )}

          <div className="ml-auto text-center">
            <p className="text-2xl font-bold">{cars.length}</p>
            <p className="text-sm text-gray-500">Listings</p>
          </div>

          <div className="text-center sm:border-l sm:pl-6">
            <div className="flex items-center justify-center gap-1 text-[#00357a]">
              <Star className="h-5 w-5 fill-current" />
              <p className="text-2xl font-bold">
                {averageRating.toFixed(1)}
              </p>
            </div>
            <p className="text-sm text-gray-500">{reviews.length} Reviews</p>
          </div>

        </div>

        {/* REVIEWS */}
        <div className="bg-white border rounded-xl p-5 sm:p-6 mb-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ratings & Reviews</h3>
              <p className="text-sm text-gray-500">
                See what buyers say about this seller.
              </p>
            </div>
          </div>

          {currentUser && currentUser.id !== id && (
            <div className="mt-5 rounded-xl border bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={value <= rating ? "text-[#00357a]" : "text-gray-300"}
                    aria-label={`${value} star rating`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review..."
                className="min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />

              {reviewError && (
                <p className="mt-2 text-sm text-red-500">{reviewError}</p>
              )}

              <Button
                onClick={submitReview}
                disabled={reviewSaving || rating === 0}
                className="mt-3"
              >
                {reviewSaving ? "Saving..." : "Submit Review"}
              </Button>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {reviews.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                No reviews yet
              </p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={review.reviewer?.avatar_url || FALLBACK_AVATAR_URL}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">
                          {review.reviewer?.full_name || review.reviewer?.username || "Buyer"}
                        </p>
                        <div className="flex text-[#00357a]">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Star
                              key={value}
                              className={`h-4 w-4 ${value <= review.rating ? "fill-current" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.review && (
                        <p className="mt-2 text-sm text-gray-600">{review.review}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LISTINGS */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Listings by Seller
          </h3>

          {cars.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center">
              No listings found
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

              {cars.map((car) => (
                <div
                  key={car.id}
                  onClick={() => navigate(`/car/${car.id}`)}
                  className="bg-white border rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition"
                >

                  <img
                    src={
                      car.car_images?.[0]?.image_url ||
                      "https://via.placeholder.com/300"
                    }
                    className="w-full h-40 object-cover"
                  />

                  <div className="p-4">

                    <h4 className="font-semibold text-sm line-clamp-1">
                      {car.title}
                    </h4>

                    <p className="text-xs text-gray-500">
                      {car.location} • {car.year}
                    </p>

                    <p className="font-bold mt-2">
                      ${Number(car.price).toLocaleString()}
                    </p>

                  </div>

                </div>
              ))}

            </div>
          )}
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default SellerProfile;
