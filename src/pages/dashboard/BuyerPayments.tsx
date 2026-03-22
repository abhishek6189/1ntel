import Navbar from "@/components/Navbar";
import DashboardSidebar from "@/components/DashboardSidebar";

const BuyerPayments = () => {

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar />

      <div className="max-w-7xl mx-auto py-10 px-4 flex gap-8">

        <DashboardSidebar />

        <div className="flex-1">

          <h1 className="text-2xl font-bold mb-6">
            Payment History
          </h1>

          <p className="text-gray-500">
            No payments yet.
          </p>

        </div>

      </div>

    </div>
  );
};

export default BuyerPayments;