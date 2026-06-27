import { motion } from "framer-motion";
import { Shield, Users, Package, ShoppingCart, DollarSign, Activity, Sparkles, TrendingUp, Wallet, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../services/api";
import { useNotification } from "../context/NotificationContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.roles?.split(",")[0] || "Staff";
  const { showNotification } = useNotification();

  const [expense, setExpense] = useState('');
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    users: 0,
    products: 0,
    orders: 0,
    monthlyRevenue: 0,
    revenueChart: []
  });

  useEffect(() => {
    fetchExpense();
    fetchDashboardStats();
  }, []);

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
      value: dashboardData.users,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Active Products",
      value: dashboardData.products,
      icon: Package,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Today's Orders",
      value: dashboardData.orders,
      icon: ShoppingCart,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "Monthly Revenue",
      value: `Rs. ${Number(dashboardData.monthlyRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
              <button className="px-6 py-3.5 rounded-2xl bg-white text-blue-800 font-bold hover:bg-blue-50 shadow-xl shadow-black/10 transition-all flex items-center gap-2">
                <Activity className="w-5 h-5" />
                View Detailed Reports
              </button>
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
                {dashboardData.revenueChart && dashboardData.revenueChart.length > 0 ? (
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

            {/* Expense Management */}
            <div className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-[#334155] shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-400 to-rose-600" />
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Store Expenses</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage daily or weekly fixed costs</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-end gap-4 bg-slate-50 dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Fixed Cost Amount (Rs.)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={expense}
                        onChange={(e) => setExpense(e.target.value)}
                        placeholder="0.00"
                        className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-slate-800 dark:text-white font-bold text-lg outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpdateExpense}
                    disabled={isUpdatingExpense}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70 h-[54px]"
                  >
                    {isUpdatingExpense ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Updating...
                      </span>
                    ) : (
                      "Update Expense"
                    )}
                  </motion.button>
                </div>
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
            <div className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-[#334155] p-6 shadow-lg shadow-slate-200/50 dark:shadow-none h-full min-h-[300px] flex flex-col">
              {/* <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Recent Activity
                </h3>
              </div> */}

              {/* <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-[#334155] rounded-2xl bg-slate-50/50 dark:bg-[#0f172a]/50">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No Recent Activity</h4>
                <p className="text-xs text-slate-500 dark:text-slate-500 max-w-[200px]">System activity logs will appear here once users perform actions.</p>
              </div> */}
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