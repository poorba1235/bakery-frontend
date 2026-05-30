import { ArrowDownRight, ArrowUpRight, BarChart, DollarSign, ShieldAlert, ShoppingBag, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { REPORTS_URL } from '../services/api';

const Reports = () => {
    const { user } = useAuth();
    const perms = user?.permissions?.split(',') || [];
    const canViewReports = perms.includes('view_reports');

    if (!canViewReports && user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Restricted Section</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">The Reports section is reserved for administrative staff only.</p>
            </div>
        );
    }

    const stats = [
        { label: 'Total Revenue', value: 'LKR 1.2M', change: '+12.5%', isUp: true, icon: DollarSign, color: 'emerald' },
        { label: 'Total Sales', value: '850', change: '+5.2%', isUp: true, icon: ShoppingBag, color: 'blue' },
        { label: 'Active Staff', value: '12', change: '0%', isUp: true, icon: TrendingUp, color: 'amber' },
    ];

    return (
        <div className="p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Reports & Analytics</h1>
                <p className="text-slate-600 dark:text-[#94a3b8]">Insightful data about your bakery's performance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-300 dark:border-[#334155] relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 dark:bg-${stat.color}-500/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center text-sm font-bold ${stat.isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                {stat.isUp ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                                {stat.change}
                            </div>
                        </div>
                        <h3 className="text-slate-600 dark:text-[#94a3b8] font-medium mb-1">{stat.label}</h3>
                        <p className="text-3xl font-bold text-slate-800 dark:text-white">{stat.value}</p>

                        <div className={`absolute bottom-0 left-0 w-full h-1 bg-${stat.color}-500 opacity-20 group-hover:opacity-40 transition-opacity`} />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] hover:border-blue-500/30 transition-all group">
                    <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-7 h-7 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Category & Subcategory Report</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] mb-6">Complete list of all item categories and their associated subcategories.</p>
                    <button 
                        onClick={() => window.open(`${REPORTS_URL}/category-report`, '_blank')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20"
                    >
                        Generate Report
                    </button>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] hover:border-purple-500/30 transition-all group">
                    <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <ShieldAlert className="w-7 h-7 text-purple-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Users & Permissions Report</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] mb-6">Detailed audit of all users, their assigned roles, and specific permissions.</p>
                    <button 
                        onClick={() => window.open(`${REPORTS_URL}/user-report`, '_blank')}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-purple-500/20"
                    >
                        Generate Report
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-6">
                    <BarChart className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">More Reports Coming Soon</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">Integrating advanced visualization tools for dynamic sales and inventory tracking.</p>
            </div>
        </div>
    );
};

export default Reports;
