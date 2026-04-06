import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function DealerPending() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">

        <h1 className="text-2xl font-bold mb-4">
          ⏳ Request Under Review
        </h1>

        <p className="text-gray-500 mb-6">
          Your dealer application is being reviewed by our team.  
          You’ll get access once approved.
        </p>

        <Button onClick={() => navigate("/")}>
          Go to Home
        </Button>
      </div>
    </div>
  );
}