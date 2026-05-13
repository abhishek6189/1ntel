import {
  Car,
  Users,
  DollarSign,
  Star,
  TrendingUp,
  Building2,
  Shield
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444"
];

export default function AdminOverview({ stats }) {

  const { cars = [], users = [], inspections = [] } = stats;

  /* 📊 CALCULATIONS */
  const activeCars = cars.filter(c => c.status === 'active').length;
  const totalUsers = users.length;
  const dealers = users.filter(u => u.role === 'dealer').length;
  const featuredCars = cars.filter(c => c.is_featured).length;
  const pendingInspections = inspections.filter(i => i.status === 'pending').length;

  const totalRevenue = cars
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.price || 0), 0);

  /* 📊 STATS CARDS */
  const overviewStats = [
    { label: 'Total Listings', value: cars.length, icon: Car, color: 'text-blue-600 bg-blue-100' },
    { label: 'Active Listings', value: activeCars, icon: TrendingUp, color: 'text-green-600 bg-green-100' },
    { label: 'Users', value: totalUsers, icon: Users, color: 'text-purple-600 bg-purple-100' },
    { label: 'Dealers', value: dealers, icon: Building2, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'Featured', value: featuredCars, icon: Star, color: 'text-orange-600 bg-orange-100' },
    { label: 'Pending Inspections', value: pendingInspections, icon: Shield, color: 'text-red-600 bg-red-100' },
  ];

  /* 📊 PIE DATA */
  const statusData = [
    { name: 'Active', value: cars.filter(c => c.status === 'active').length },
    { name: 'Sold', value: cars.filter(c => c.status === 'sold').length },
    { name: 'Pending', value: cars.filter(c => c.status === 'pending').length },
    { name: 'Draft', value: cars.filter(c => c.status === 'draft').length },
  ].filter(d => d.value > 0);

  /* 📊 BAR DATA */
  const roleData = [
    { name: 'Users', value: users.filter(u => u.role === 'buyer' || !u.role).length },
    { name: 'Dealers', value: dealers },
    { name: 'Admins', value: users.filter(u => u.role === 'admin').length },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8">

      {/* 🔥 TOP STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {overviewStats.map((s, i) => (
          <div key={i} className="bg-card rounded-xl border p-4 min-w-0">

            <div className={`h-9 w-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="h-4 w-4" />
            </div>

            <p className="break-words text-xl font-bold sm:text-2xl">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>

          </div>
        ))}
      </div>

      {/* 💰 REVENUE CARD */}
      <div className="bg-card rounded-xl border p-4 sm:p-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-green-100 text-green-600 p-2 rounded-lg">
            <DollarSign />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Total Active Value</p>
            <h2 className="break-words text-xl font-bold sm:text-2xl">
              ${totalRevenue.toLocaleString()}
            </h2>
          </div>
        </div>
      </div>

      {/* 📊 CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* PIE */}
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <h3 className="font-semibold mb-4">Listing Status</h3>

          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No data</p>
          )}
        </div>

        {/* BAR */}
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <h3 className="font-semibold mb-4">User Roles</h3>

          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={roleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No data</p>
          )}
        </div>

      </div>

    </div>
  );
}
