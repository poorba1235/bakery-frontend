import { motion } from "framer-motion";
import { Shield, Terminal, User, Users, Package, ShoppingCart, DollarSign } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.roles?.split(",")[0] || "Staff";

  const stats = [
    {
      title: "Users",
      value: "12",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Products",
      value: "356",
      icon: Package,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Orders",
      value: "89",
      icon: ShoppingCart,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Revenue",
      value: "Rs.120,000.00",
      icon: DollarSign,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-white">

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-6 relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 shadow-xl shadow-blue-600/20">

            <h2 className="text-3xl font-bold mb-3">
              Welcome back, {user?.username} 👋
            </h2>

            <p className="text-blue-100 max-w-md">
              Manage users, roles, products and system activity from your dashboard.
            </p>

            <div className="mt-6 flex gap-3">
              <button className="px-4 py-2 rounded-xl bg-white text-blue-700 font-medium hover:bg-blue-50 transition">
                View Reports
              </button>
              {/* <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition">
                System Status
              </button> */}
            </div>

            <Shield className="absolute -right-10 -bottom-10 w-56 h-56 text-white/10" />
          </div>

          {/* Role Card */}
          {/* <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 shadow-md">
            <h3 className="text-sm text-slate-500 mb-4">Active Role</h3>
            <p className="text-2xl font-bold">{role}</p>
            <p className="text-sm text-slate-500 mt-1">Permission Level</p>

            <div className="mt-6 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-blue-500 rounded-full" />
            </div>
          </div> */}
        </motion.div>

        {/* 🔥 NEW STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {stats.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                whileHover={{ scale: 1.03 }}
                className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-sm hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{item.title}</p>
                    <p className="text-2xl font-bold mt-1">{item.value}</p>
                  </div>

                  <div className={`p-3 rounded-xl ${item.bg}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Activity */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>

          <div className="rounded-3xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] p-10 text-center text-slate-500">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No recent activity</p>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;