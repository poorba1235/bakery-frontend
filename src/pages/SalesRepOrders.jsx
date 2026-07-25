import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle,
    FileText,
    Loader2,
    Search,
    Truck,
    X,
    ClipboardCheck,
    Plus,
    ShoppingBag,
    Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const SalesRepOrders = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();

    const [orders, setOrders] = useState([]);
    const [salesReps, setSalesReps] = useState([]);
    const [products, setProducts] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Distribute Modal States
    const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
    const [activeOrder, setActiveOrder] = useState(null);
    const [distributeDetails, setDistributeDetails] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Create Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [formData, setFormData] = useState({
        SR_ID: '',
        SROH_ORDER_FOR_DATE: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
        details: []
    });

    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('order-manage');

    const roles = currentUser?.roles?.split(',') || [];
    const isAdmin = roles.some(role => role.toLowerCase() === 'admin');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [ordersRes, repsRes, productsRes] = await Promise.all([
                api.get('/sales-rep-orders'),
                api.get('/sales-rep'),
                api.get('/product/items')
            ]);
            setOrders(ordersRes.data);
            setSalesReps(repsRes.data);
            setProducts(productsRes.data);
        } catch (error) {
            console.error('Fetch Data Error:', error);
            showNotification(`Failed to load data: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOpen = () => {
        setFormData({
            SR_ID: '',
            SROH_ORDER_FOR_DATE: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
            details: products.map(p => ({
                P_ID: p.P_ID,
                P_NAME: p.P_NAME,
                P_CODE: p.P_CODE,
                SROD_REQUESTED_QTY: '0',
                C_ID: null
            }))
        });
        setProductSearch('');
        setIsCreateModalOpen(true);
    };

    const addProductToOrder = (productId) => {
        const product = products.find(p => p.P_ID === parseInt(productId));
        if (!product) return;

        if (formData.details.find(d => d.P_ID === product.P_ID)) {
            showNotification('Product already added to order', 'error');
            return;
        }

        setFormData(prev => ({
            ...prev,
            details: [
                ...prev.details,
                {
                    P_ID: product.P_ID,
                    P_NAME: product.P_NAME,
                    P_CODE: product.P_CODE,
                    SROD_REQUESTED_QTY: 1,
                    C_ID: null
                }
            ]
        }));
    };

    const updateProductQty = (productId, qty) => {
        setFormData(prev => ({
            ...prev,
            details: prev.details.map(d =>
                d.P_ID === productId ? { ...d, SROD_REQUESTED_QTY: qty } : d
            )
        }));
    };

    const removeProduct = (productId) => {
        setFormData(prev => ({
            ...prev,
            details: prev.details.filter(d => d.P_ID !== productId)
        }));
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        if (!formData.SR_ID) {
            showNotification('Please select a Sales Representative', 'error');
            return;
        }

        if (formData.details.length === 0) {
            showNotification('Please add at least one product', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/sales-rep-orders', formData);
            showNotification('Order request created successfully', 'success');
            await fetchData();
            setIsCreateModalOpen(false);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to create order', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const openDistributeModal = async (orderId) => {
        try {
            const res = await api.get(`/sales-rep-orders/${orderId}`);
            setActiveOrder(res.data.header);
            // Default distributed qty to requested qty if order is pending
            setDistributeDetails(res.data.details.map(d => ({
                ...d,
                SROD_DISTRIBUTED_QTY: res.data.header.SROH_STATUS === 0
                    ? d.SROD_REQUESTED_QTY
                    : (d.SROD_DISTRIBUTED_QTY !== null ? d.SROD_DISTRIBUTED_QTY : d.SROD_REQUESTED_QTY)
            })));
            setIsDistributeModalOpen(true);
        } catch (error) {
            showNotification('Failed to fetch order details', 'error');
        }
    };

    const updateDistQty = (srodId, qty) => {
        setDistributeDetails(prev => prev.map(d =>
            d.SROD_ID === srodId ? { ...d, SROD_DISTRIBUTED_QTY: qty } : d
        ));
    };

    const handleApprove = async () => {
        setIsSaving(true);
        try {
            await api.put(`/sales-rep-orders/${activeOrder.SROH_ID}/status`, {
                SROH_STATUS: 1, // 1 = Approved & Distributed
                SROH_ORDER_FOR_DATE: activeOrder.SROH_ORDER_FOR_DATE,
                distributedDetails: distributeDetails.map(d => ({
                    SROD_ID: d.SROD_ID,
                    SROD_DISTRIBUTED_QTY: d.SROD_DISTRIBUTED_QTY,
                    SROD_STATUS: 1
                }))
            });
            showNotification('Order approved and distributed successfully', 'success');
            await fetchData();
            setIsDistributeModalOpen(false);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to approve order', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm('Are you sure you want to reject this order?')) return;
        setIsSaving(true);
        try {
            await api.put(`/sales-rep-orders/${activeOrder.SROH_ID}/status`, {
                SROH_STATUS: 2 // 2 = Rejected
            });
            showNotification('Order rejected', 'success');
            await fetchData();
            setIsDistributeModalOpen(false);
        } catch (error) {
            showNotification('Failed to reject order', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 0: return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">Pending</span>;
            case 1: return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">Approved & Distributed</span>;
            case 2: return <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-bold">Rejected</span>;
            default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold">Unknown</span>;
        }
    };

    const filteredData = orders.filter(item =>
        searchTerm === '' ||
        (item.SR_NAME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.SROH_ID.toString().includes(searchTerm)
    );

    // Sort so pending (0) is at top
    const sortedData = [...filteredData].sort((a, b) => {
        if (a.SROH_STATUS === 0 && b.SROH_STATUS !== 0) return -1;
        if (a.SROH_STATUS !== 0 && b.SROH_STATUS === 0) return 1;
        return b.SROH_ID - a.SROH_ID;
    });

    const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Sales Rep Orders & Distribution</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Create requests and distribute products to Sales Reps.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCreateOpen}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Request</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search by Sales Rep or Order ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-6 py-4">Order ID</th>
                                <th className="px-6 py-4">Sales Rep</th>
                                <th className="px-6 py-4">For Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Requested On</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : paginatedData.map((order) => (
                                <tr key={order.SROH_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
                                        #{order.SROH_ID}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                                        {order.SR_NAME || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400">
                                        {new Date(order.SROH_ORDER_FOR_DATE).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(order.SROH_STATUS)}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {new Date(order.SROH_CREATED_DATE).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {order.SROH_STATUS === 0 && isAdmin ? (
                                            <button
                                                onClick={() => openDistributeModal(order.SROH_ID)}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center ml-auto"
                                            >
                                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                                Distribute
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => openDistributeModal(order.SROH_ID)}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors ml-auto"
                                            >
                                                View Details
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {!isLoading && sortedData.length > itemsPerPage && (
                <div className="mt-6 flex justify-between items-center bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] shadow-sm">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} entries
                    </span>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-slate-300 dark:border-[#334155] rounded-xl text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[#0f172a] font-bold transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(sortedData.length / itemsPerPage)))}
                            disabled={currentPage === Math.ceil(sortedData.length / itemsPerPage)}
                            className="px-4 py-2 border border-slate-300 dark:border-[#334155] rounded-xl text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[#0f172a] font-bold transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-200 dark:border-[#334155] flex justify-between items-center bg-slate-50/50 dark:bg-[#0f172a]/50 rounded-t-3xl">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    <ShoppingBag className="w-5 h-5 mr-2 text-blue-500" />
                                    New Order Request
                                </h3>
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-[#334155]">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sales Representative *</label>
                                        <select required value={formData.SR_ID} onChange={e => setFormData({ ...formData, SR_ID: e.target.value })} className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium">
                                            <option value="">Select a Rep...</option>
                                            {salesReps.map(sr => (
                                                <option key={sr.SR_ID} value={sr.SR_ID}>{sr.SR_NAME}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order For Date *</label>
                                        <input type="date" required value={formData.SROH_ORDER_FOR_DATE} onChange={e => setFormData({ ...formData, SROH_ORDER_FOR_DATE: e.target.value })} className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search Products</label>
                                            <div className="relative group">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="Filter products by name or code..."
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    className="w-full pl-11 pr-6 py-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl outline-none text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 dark:bg-[#0f172a] sticky top-0 z-10 shadow-sm">
                                                <tr className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                                    <th className="px-4 py-3">Product Name</th>
                                                    <th className="px-4 py-3 w-32 text-center">Pro Stock Qty</th>
                                                    <th className="px-4 py-3 w-32 text-center">Req. Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                                                {products.filter(p => p.P_NAME?.toLowerCase().includes(productSearch.toLowerCase()) || p.P_CODE?.toLowerCase().includes(productSearch.toLowerCase())).map(p => {
                                                    const existingDetail = formData.details.find(d => d.P_ID === p.P_ID);
                                                    const qty = existingDetail ? existingDetail.SROD_REQUESTED_QTY : '0';
                                                    return (
                                                        <tr key={p.P_ID} className="hover:bg-slate-50 dark:hover:bg-[#0f172a]/50">
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-slate-800 dark:text-white">{p.P_NAME}</div>
                                                                <div className="text-xs text-slate-500">{p.P_CODE}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                                                                    {p.stock_balance || 0}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    placeholder="0"
                                                                    value={qty}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                                        const targetVal = val === '' ? '0' : val;
                                                                        if (existingDetail) {
                                                                            updateProductQty(p.P_ID, targetVal);
                                                                        } else {
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                details: [
                                                                                    ...prev.details,
                                                                                    {
                                                                                        P_ID: p.P_ID,
                                                                                        P_NAME: p.P_NAME,
                                                                                        P_CODE: p.P_CODE,
                                                                                        SROD_REQUESTED_QTY: targetVal,
                                                                                        C_ID: null
                                                                                    }
                                                                                ]
                                                                            }));
                                                                        }
                                                                    }}
                                                                    className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-2 px-3 text-center font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </form>

                            <div className="p-6 border-t border-slate-200 dark:border-[#334155] flex justify-end gap-3 bg-slate-50/50 dark:bg-[#0f172a]/50 rounded-b-3xl">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSaving || formData.details.length === 0} onClick={handleCreateSubmit} className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center disabled:opacity-50">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    Submit Request
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Distribute/View Modal */}
            <AnimatePresence>
                {isDistributeModalOpen && activeOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDistributeModalOpen(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-200 dark:border-[#334155] flex justify-between items-center bg-slate-50/50 dark:bg-[#0f172a]/50 rounded-t-3xl">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    {activeOrder.SROH_STATUS === 0 ? (
                                        <><Truck className="w-5 h-5 mr-2 text-indigo-500" />Distribute Order #{activeOrder.SROH_ID}</>
                                    ) : (
                                        <><FileText className="w-5 h-5 mr-2 text-blue-500" />Order #{activeOrder.SROH_ID} Details</>
                                    )}
                                </h3>
                                <button onClick={() => setIsDistributeModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4 mb-2">
                                    <div className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-[#334155]">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</div>
                                        <div>{getStatusBadge(activeOrder.SROH_STATUS)}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-[#334155]">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Order For</div>
                                        {activeOrder.SROH_STATUS === 0 && isAdmin ? (
                                            <input
                                                type="date"
                                                value={activeOrder.SROH_ORDER_FOR_DATE ? new Date(activeOrder.SROH_ORDER_FOR_DATE).toISOString().split('T')[0] : ''}
                                                onChange={(e) => setActiveOrder({ ...activeOrder, SROH_ORDER_FOR_DATE: e.target.value })}
                                                className="w-full bg-white dark:bg-[#1e293b] border border-indigo-300 dark:border-indigo-500/50 rounded-lg py-1 px-2 font-bold focus:ring-2 focus:ring-indigo-500 text-indigo-700 dark:text-indigo-400"
                                            />
                                        ) : (
                                            <div className="font-bold text-slate-800 dark:text-white">{new Date(activeOrder.SROH_ORDER_FOR_DATE).toLocaleDateString()}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-[#0f172a]">
                                            <tr className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                                <th className="px-4 py-3">Product</th>
                                                <th className="px-4 py-3 text-center">Requested</th>
                                                <th className="px-4 py-3 text-center">Distribute Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                                            {distributeDetails.map(item => (
                                                <tr key={item.SROD_ID} className="hover:bg-slate-50 dark:hover:bg-[#0f172a]/50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-800 dark:text-white">{item.P_NAME}</div>
                                                        <div className="text-xs text-slate-500">{item.P_CODE}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                                        {item.SROD_REQUESTED_QTY}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {activeOrder.SROH_STATUS === 0 && isAdmin ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.SROD_DISTRIBUTED_QTY}
                                                                onChange={(e) => updateDistQty(item.SROD_ID, e.target.value)}
                                                                className="w-24 bg-white dark:bg-[#1e293b] border border-indigo-300 dark:border-indigo-500/50 rounded-lg py-1.5 px-3 text-center font-bold focus:ring-2 focus:ring-indigo-500 text-indigo-700 dark:text-indigo-400"
                                                            />
                                                        ) : (
                                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                                                                {item.SROD_DISTRIBUTED_QTY !== null ? item.SROD_DISTRIBUTED_QTY : item.SROD_REQUESTED_QTY}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {activeOrder.SROH_STATUS === 0 && isAdmin ? (
                                <div className="p-6 border-t border-slate-200 dark:border-[#334155] flex justify-between gap-3 bg-slate-50/50 dark:bg-[#0f172a]/50 rounded-b-3xl">
                                    <button type="button" onClick={handleReject} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors">
                                        Reject Request
                                    </button>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setIsDistributeModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                        <button type="button" onClick={handleApprove} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center">
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                            Approve & Distribute
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 border-t border-slate-200 dark:border-[#334155] flex justify-end gap-3 bg-slate-50/50 dark:bg-[#0f172a]/50 rounded-b-3xl">
                                    <button type="button" onClick={() => setIsDistributeModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">Close</button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SalesRepOrders;