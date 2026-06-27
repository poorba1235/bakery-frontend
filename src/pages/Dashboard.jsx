import { motion } from "framer-motion";
import { Shield, Users, Package, ShoppingCart, DollarSign, Activity, Sparkles, TrendingUp, Wallet, BarChart3, PieChart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../services/api";
import { useNotification } from "../context/NotificationContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.roles?.split(",")[0] || "Staff";
  const isAdmin = role.toLowerCase() === 'admin';
  const { showNotification } = useNotification();

  const [expense, setExpense] = useState('');
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    users: 0,
    products: 0,
    orders: 0,
    monthlyRevenue: 0,
    revenueChart: [],
    topProducts: []
  });

  useEffect(() => {
    if (isAdmin) {
      fetchExpense();
      fetchDashboardStats();
    }
  }, [isAdmin]);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/reports/dashboard-stats');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  const fetchExpense = async () => {
    try {
      const res = await api.get('/expense');
      const val = parseFloat(res.data.cost_price);
      setExpense(val === 0 ? '' : res.data.cost_price);
    } catch (err) {
      console.error('Failed to fetch expense:', err);
    }
  };

  const handleUpdateExpense = async () => {
    setIsUpdatingExpense(true);
    try {
      await api.put('/expense', { cost_price: expense });
      showNotification('Expense updated successfully!', 'success');
    } catch (err) {
      showNotification('Failed to update expense', 'error');
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  const stats = [
    {
      title: "Total Users",
      value: isAdmin ? dashboardData.users : '🔒',
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Active Products",
      value: isAdmin ? dashboardData.products : '🔒',
      icon: Package,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Today's Orders",
      value: isAdmin ? dashboardData.orders : '🔒',
      icon: ShoppingCart,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "Monthly Revenue",
      value: isAdmin ? `Rs. ${Number(dashboardData.monthlyRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '🔒',
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl border border-slate-700">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-emerald-400">
            Rs. {Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl border border-slate-700">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-purple-400">
            {Number(payload[0].value).toLocaleString()} Units Sold
          </p>
        </div>
      );
    }
    return null;
  };

  const BAR_COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0f172a] text-slate-800 dark:text-white pb-12">
      {/* Background ambient light */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[2rem] p-8 md:p-12 bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-900 shadow-2xl shadow-blue-900/20 mb-8 border border-white/10"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-blue-100 text-xs font-bold uppercase tracking-wider mb-4"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>Admin Portal</span>
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Welcome back, {user?.username} <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
              </h2>
              <p className="text-blue-100/80 max-w-xl text-lg font-medium leading-relaxed">
                Here's what's happening with your bakery today. Manage operations, track sales, and oversee your entire system.
              </p>
            </div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0"
            >
              
            </motion.div>
          </div>
          
          <Shield className="absolute -right-8 -bottom-8 w-64 h-64 text-white/5 transform rotate-12 pointer-events-none" />
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl border ${item.border} dark:border-[#334155] rounded-3xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none transition-all group relative overflow-hidden`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-${item.color.split('-')[1]}-500/10 to-transparent rounded-bl-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3.5 rounded-2xl ${item.bg} text-${item.color.split('-')[1]}-600 dark:${item.color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-1 tracking-tight">{item.value}</h3>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.title}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 space-y-8"
          >
            {/* Revenue Trend Chart */}
            <div className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-[#334155] shadow-lg shadow-slate-200/50 dark:shadow-none p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Revenue Trend</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Daily sales performance over the last 7 days</p>
                </div>
              </div>

              <div className="h-[300px] w-full">
                {!isAdmin ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Shield className="w-8 h-8 mb-2 opacity-50 text-indigo-500" />
                    <p className="text-sm">Admin access required to view revenue trends.</p>
                  </div>
                ) : dashboardData.revenueChart && dashboardData.revenueChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dashboardData.revenueChart}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value) => `Rs.${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    No data available for the last 7 days.
                  </div>
                )}
              </div>
            </div>

          
          </motion.div>

          {/* Sidebar Area */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            {/* Top Selling Products */}
            <div className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-[#334155] shadow-lg shadow-slate-200/50 dark:shadow-none p-8 flex flex-col h-full min-h-[420px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Top Products</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Best sellers (last 30 days)</p>
                </div>
              </div>

              <div className="flex-1 w-full min-h-[250px]">
                {!isAdmin ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Shield className="w-8 h-8 mb-2 opacity-50 text-purple-500" />
                    <p className="text-sm">Admin access required.</p>
                  </div>
                ) : dashboardData.topProducts && dashboardData.topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardData.topProducts}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                        width={100}
                      />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#334155', opacity: 0.1 }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                        {dashboardData.topProducts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <PieChart className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No sales data available.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

      </main>

      {/* Tailwind animation utility for the waving hand */}
      <style>{`
        @keyframes wave {
          0% { transform: rotate( 0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate( 0.0deg) }
          100% { transform: rotate( 0.0deg) }
        }
        .animate-wave {
          animation: wave 2.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;