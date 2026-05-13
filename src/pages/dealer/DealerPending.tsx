import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DealerPending() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Clock className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-bold mb-4">
          Request Under Review
        </h1>

        <p className="text-gray-500 mb-6">
          Your request has been submitted. Once your request is accepted by the admin,
          you can log in with your license number and password. This usually takes up to 24 hours.
        </p>

        <Button onClick={() => navigate("/")}>
          Go to Home
        </Button>
      </div>
    </div>
  );
}
