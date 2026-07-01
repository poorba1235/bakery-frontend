import React, { useState, useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart, DollarSign, ShieldAlert, ShoppingBag, TrendingUp, Calendar, X, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { REPORTS_URL } from '../services/api';

const Reports = () => {
    const { user } = useAuth();
    const perms = user?.permissions?.split(',') || [];
    const canViewReports = perms.includes('view_reports');

    const [showDateModal, setShowDateModal] = useState(false);
    const [dateRange, setDateRange] = useState({ from: '', to: '', productId: '', shopId: '', srId: '', shopType: 'all', supplierId: '', materialId: '' });
    const [productsList, setProductsList] = useState([]);
    const [customersList, setCustomersList] = useState([]);
    const [salesRepsList, setSalesRepsList] = useState([]);
    const [suppliersList, setSuppliersList] = useState([]);
    const [rawMaterialsList, setRawMaterialsList] = useState([]);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const results = await Promise.allSettled([
                    api.get('/product/items'),
                    api.get('/customers'),
                    api.get('/sales-rep'),
                    api.get('/suppliers'),
                    api.get('/raw-material')
                ]);

                if (results[0].status === 'fulfilled') setProductsList(results[0].value.data);
                if (results[1].status === 'fulfilled') setCustomersList(results[1].value.data);
                if (results[2].status === 'fulfilled') setSalesRepsList(results[2].value.data);
                if (results[3].status === 'fulfilled') setSuppliersList(results[3].value.data);
                if (results[4].status === 'fulfilled') setRawMaterialsList(results[4].value.data);
            } catch (err) {
                console.error('Failed to fetch filters data', err);
            }
        };
        fetchFilters();
    }, []);

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

            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            </div> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] hover:border-emerald-500/30 transition-all group">
                    <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Raw Material Inventory Report</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] mb-6">Complete list of all active raw materials, including units, reorder levels, and available stock.</p>
                    <button 
                        onClick={() => setShowDateModal('raw-materials')}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20">
                        Generate PDF Report
                    </button>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] hover:border-blue-500/30 transition-all group">
                    <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-7 h-7 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Daily Production Report</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] mb-6">Detailed breakdown of total quantities manufactured for each product, grouped by day.</p>
                    <button 
                        onClick={() => setShowDateModal('products')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20">
                        Generate PDF Report
                    </button>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] hover:border-amber-500/30 transition-all group">
                    <div className="w-14 h-14 bg-amber-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-7 h-7 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Daily Profit Report</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] mb-6">Detailed day-wise breakdown of sales quantities and profits generated by products.</p>
                    <button 
                        onClick={() => setShowDateModal('product-profit')}
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20">
                        Generate PDF Report
                    </button>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] hover:border-purple-500/30 transition-all group">
                    <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-7 h-7 text-purple-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Shop Sales Report</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] mb-6">Detailed overview of gross and net sales generated by each shop.</p>
                    <button 
                        onClick={() => setShowDateModal('shop-sales')}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-purple-500/20">
                        Generate PDF Report
                    </button>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] hover:border-rose-500/30 transition-all group">
                    <div className="w-14 h-14 bg-rose-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-7 h-7 text-rose-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Product Cost Track Report</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] mb-6">Track the historical manufacturing cost (per unit and total) of your products over time.</p>
                    <button 
                        onClick={() => setShowDateModal('product-cost-track')}
                        className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-rose-500/20">
                        Generate PDF Report
                    </button>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] hover:border-cyan-500/30 transition-all group">
                    <div className="w-14 h-14 bg-cyan-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-7 h-7 text-cyan-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Supplier Stock Report</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] mb-6">View raw material stock provided by each supplier and the exact quantity and cost used for production.</p>
                    <button 
                        onClick={() => setShowDateModal('supplier-stock')}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-cyan-500/20">
                        Generate PDF Report
                    </button>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-300 dark:border-[#334155] hover:border-orange-500/30 transition-all group">
                    <div className="w-14 h-14 bg-orange-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Package className="w-7 h-7 text-orange-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Recipe Cost Report</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] mb-6">Generate a comprehensive breakdown of raw materials required for products and their estimated costs.</p>
                    <button 
                        onClick={() => setShowDateModal('recipe-cost')}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-orange-500/20">
                        Generate PDF Report
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

            {/* Date Range Modal */}
            {showDateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Select Date Range</h3>
                            </div>
                            <button onClick={() => setShowDateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {(showDateModal === 'products' || showDateModal === 'product-profit' || showDateModal === 'product-cost-track' || showDateModal === 'recipe-cost') && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter by Product</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Package className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <select
                                            value={dateRange.productId}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, productId: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
                                        >
                                            <option value="">All Products</option>
                                            {productsList.map(p => (
                                                <option key={p.P_ID} value={p.P_ID}>
                                                    {p.P_CODE} - {p.P_NAME}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {showDateModal === 'product-profit' && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter by Shop Type</label>
                                    <select
                                        value={dateRange.shopType}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, shopType: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 transition-all appearance-none"
                                    >
                                        <option value="all">All Sales (Owner + Other Shops)</option>
                                        <option value="owner">Owner Shop Only (Storefront POS)</option>
                                        <option value="other">Other Shops Only (Sales Rep Invoices)</option>
                                    </select>
                                </div>
                            )}

                            {showDateModal === 'shop-sales' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter by Shop</label>
                                        <select
                                            value={dateRange.shopId}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, shopId: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 transition-all appearance-none"
                                        >
                                            <option value="">All Shops</option>
                                            {customersList.map(c => (
                                                <option key={c.C_ID} value={c.C_ID}>
                                                    {c.C_NAME}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter by Sales Rep</label>
                                        <select
                                            value={dateRange.srId}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, srId: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 transition-all appearance-none"
                                        >
                                            <option value="">All Sales Reps</option>
                                            {salesRepsList.map(sr => (
                                                <option key={sr.SR_ID} value={sr.SR_ID}>
                                                    {sr.SR_NAME}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {showDateModal === 'supplier-stock' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter by Supplier</label>
                                        <select
                                            value={dateRange.supplierId}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, supplierId: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 transition-all appearance-none"
                                        >
                                            <option value="">All Suppliers</option>
                                            {suppliersList.map(s => (
                                                <option key={s.CS_ID} value={s.CS_ID}>
                                                    {s.CS_FULL_NAME}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter by Material</label>
                                        <select
                                            value={dateRange.materialId}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, materialId: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 transition-all appearance-none"
                                        >
                                            <option value="">All Materials</option>
                                            {rawMaterialsList.map(rm => (
                                                <option key={rm.RM_ID} value={rm.RM_ID}>
                                                    {rm.RM_NAME}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {showDateModal !== 'recipe-cost' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">From Date (Optional)</label>
                                        <input
                                            type="date"
                                            value={dateRange.from}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">To Date (Optional)</label>
                                        <input
                                            type="date"
                                            value={dateRange.to}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700/50">
                            <button
                                onClick={() => setShowDateModal(false)}
                                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    if (dateRange.from) params.append('from', dateRange.from);
                                    if (dateRange.to) params.append('to', dateRange.to);
                                    if ((showDateModal === 'products' || showDateModal === 'product-profit' || showDateModal === 'product-cost-track' || showDateModal === 'recipe-cost') && dateRange.productId) {
                                        params.append('productId', dateRange.productId);
                                    }
                                    if (showDateModal === 'product-profit' && dateRange.shopType) {
                                        params.append('shopType', dateRange.shopType);
                                    }
                                    if (showDateModal === 'shop-sales') {
                                        if (dateRange.shopId) params.append('shopId', dateRange.shopId);
                                        if (dateRange.srId) params.append('srId', dateRange.srId);
                                    }
                                    if (showDateModal === 'supplier-stock') {
                                        if (dateRange.supplierId) params.append('supplierId', dateRange.supplierId);
                                        if (dateRange.materialId) params.append('materialId', dateRange.materialId);
                                    }
                                    window.open(`${REPORTS_URL}/${showDateModal}?${params.toString()}`, '_blank');
                                    setShowDateModal(false);
                                }}
                                className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-all"
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
