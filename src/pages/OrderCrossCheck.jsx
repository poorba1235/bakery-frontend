import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    Check,
    CheckCircle2,
    ClipboardList,
    Eye,
    Loader2,
    Plus,
    Search,
    TrendingDown,
    TrendingUp,
    User,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const formatSriLankaDate = (dateVal) => {
    if (!dateVal) {
        const d = new Date();
        const colomboOffset = 5.5 * 60 * 60 * 1000;
        const colomboTime = new Date(d.getTime() + colomboOffset);
        return colomboTime.toISOString().split('T')[0];
    }
    if (typeof dateVal === 'string') {
        const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateOnlyRegex.test(dateVal)) {
            return dateVal;
        }
        if (dateVal.includes('T') || dateVal.includes(' ')) {
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                const colomboOffset = 5.5 * 60 * 60 * 1000;
                const colomboTime = new Date(d.getTime() + colomboOffset);
                return colomboTime.toISOString().split('T')[0];
            }
        }
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
        const now = new Date();
        const colomboOffset = 5.5 * 60 * 60 * 1000;
        const colomboTime = new Date(now.getTime() + colomboOffset);
        return colomboTime.toISOString().split('T')[0];
    }
    const colomboOffset = 5.5 * 60 * 60 * 1000;
    const colomboTime = new Date(d.getTime() + colomboOffset);
    return colomboTime.toISOString().split('T')[0];
};

const OrderCrossCheck = () => {
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'

    // Data states
    const [crossChecks, setCrossChecks] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [selectedOrderItems, setSelectedOrderItems] = useState([]);
    const [locations, setLocations] = useState([]);

    // Form states
    const [remarks, setRemarks] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search/Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // View detail modal state
    const [viewingCrossCheck, setViewingCrossCheck] = useState(null);
    const [viewingDetails, setViewingDetails] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [ccRes, ordersRes, locRes] = await Promise.all([
                api.get('/orders/cross-check/all'),
                api.get('/orders'),
                api.get('/warehouse/locations')
            ]);
            setCrossChecks(ccRes.data);

            // Map already cross-checked order IDs
            const crossCheckedOrderIds = new Set(ccRes.data.map(cc => cc.OCH_ORDER_H_ID));

            // Keep only approved orders (status = 2) that haven't been cross-checked yet
            const approvedOrders = ordersRes.data.filter(o => o.OR_STATUS === 2 && !crossCheckedOrderIds.has(o.OR_ID));

            setOrders(approvedOrders);
            setLocations(locRes.data);
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            showNotification('Failed to load data from server', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // When a user selects a previous order to cross check
    const handleOrderSelect = async (orderId) => {
        setSelectedOrderId(orderId);
        if (!orderId) {
            setSelectedOrderItems([]);
            return;
        }

        setIsLoadingDetails(true);
        try {
            const res = await api.get(`/orders/${orderId}`);
            // Map details to include OCD_ORDER_D_ID and default OCD_ENTERED_QTY to original qty
            const itemsMapped = res.data.map(item => ({
                OCD_ORDER_D_ID: item.OD_ID,
                product_name: item.product_name,
                product_code: item.product_code,
                OCD_ORDERED_QTY: parseFloat(item.OD_QTY) || 0,
                OCD_ENTERED_QTY: parseFloat(item.OD_QTY) || 0, // Default to expected qty
                OCD_REMARK: '',
                OCD_LOCATION_ID: item.LOCATIONID || 1
            }));
            setSelectedOrderItems(itemsMapped);
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            showNotification('Failed to load order details', 'error');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Handle single input quantity change
    const handleQtyChange = (index, value) => {
        const updated = [...selectedOrderItems];
        updated[index].OCD_ENTERED_QTY = value === '' ? '' : (parseFloat(value) || 0);
        setSelectedOrderItems(updated);
    };

    // Handle single item remark change
    const handleItemRemarkChange = (index, value) => {
        const updated = [...selectedOrderItems];
        updated[index].OCD_REMARK = value;
        setSelectedOrderItems(updated);
    };

    // Handle single item location change
    const handleItemLocationChange = (index, value) => {
        const updated = [...selectedOrderItems];
        updated[index].OCD_LOCATION_ID = parseInt(value);
        setSelectedOrderItems(updated);
    };

    // Submit the cross check form
    const handleSubmitCrossCheck = async (e) => {
        e.preventDefault();
        if (!selectedOrderId) {
            showNotification('Please select an order to cross check', 'warning');
            return;
        }
        if (selectedOrderItems.length === 0) {
            showNotification('Order contains no items to verify', 'warning');
            return;
        }

        // Validate that items with discrepancy must have a remark
        for (const item of selectedOrderItems) {
            const expected = parseFloat(item.OCD_ORDERED_QTY) || 0;
            const actual = parseFloat(item.OCD_ENTERED_QTY) || 0;
            if (expected !== actual) {
                if (!item.OCD_REMARK || item.OCD_REMARK.trim() === '') {
                    showNotification(`Discrepancy detected for "${item.product_name}". Please enter a remark to explain the mismatch.`, 'warning');
                    return;
                }
            }
        }

        // Validate that general remarks/notes are filled
        if (!remarks || remarks.trim() === '') {
            showNotification('General Cross Check Remarks/Notes are required to explain the verification status.', 'warning');
            return;
        }

        const selectedOrder = orders.find(o => o.OR_ID === parseInt(selectedOrderId));
        if (!selectedOrder) return;

        setIsSubmitting(true);
        try {
            const totalOrderedQty = selectedOrderItems.reduce((sum, item) => sum + item.OCD_ORDERED_QTY, 0);
            const totalEnteredQty = selectedOrderItems.reduce((sum, item) => sum + item.OCD_ENTERED_QTY, 0);

            const payload = {
                OCH_ORDER_H_ID: parseInt(selectedOrderId),
                OCH_ORDER_DATE: formatSriLankaDate(selectedOrder.OR_DATE),
                OCH_ORDER_TOT_QTY: totalOrderedQty,
                OCH_CROSS_CHECK_QTY_TOT: totalEnteredQty,
                OCH_REMARKS: remarks,
                items: selectedOrderItems
            };

            await api.post('/orders/cross-check', payload);
            showNotification('Order cross-check verified and submitted successfully!', 'success');

            // Reset form and return to list
            setSelectedOrderId('');
            setSelectedOrderItems([]);
            setRemarks('');
            setActiveTab('list');

            // Refresh data
            fetchInitialData();
        } catch (error) {
            console.error('Failed to submit order cross-check:', error);
            showNotification(error.response?.data?.message || 'Failed to submit cross-check', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // View past cross check detail
    const handleViewDetail = async (cc) => {
        setViewingCrossCheck(cc);
        setIsModalOpen(true);
        setIsLoadingDetails(true);
        try {
            const res = await api.get(`/orders/cross-check/${cc.OCH_ID}`);
            setViewingDetails(res.data);
        } catch (error) {
            console.error('Failed to load cross check details:', error);
            showNotification('Failed to load details', 'error');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Filter list data
    const filteredCrossChecks = crossChecks.filter(cc =>
        cc.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cc.OCH_REMARKS && cc.OCH_REMARKS.toLowerCase().includes(searchTerm.toLowerCase())) ||
        cc.OCH_ENTERED_BY.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredCrossChecks.length / itemsPerPage);
    const paginatedCrossChecks = filteredCrossChecks.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] p-4 lg:p-8 text-slate-800 dark:text-white transition-colors duration-200">
            {/* Header section */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg text-white">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">Order Cross Checking</h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Verify actual production outputs against scheduled orders to detect and record discrepancies.
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        {activeTab === 'list' ? (
                            <button
                                onClick={() => {
                                    setActiveTab('new');
                                    setSelectedOrderId('');
                                    setSelectedOrderItems([]);
                                    setRemarks('');
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Verify New Order</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setActiveTab('list')}
                                className="bg-slate-200 dark:bg-[#1e293b] hover:bg-slate-300 dark:hover:bg-[#334155] text-slate-700 dark:text-white font-bold px-6 py-3 rounded-xl flex items-center space-x-2 transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Back to List</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Tabs Container */}
            <div className="max-w-7xl mx-auto">
                {activeTab === 'list' ? (
                    <div className="bg-white dark:bg-[#1e293b] rounded-[2rem] shadow-xl border border-slate-200 dark:border-[#334155] overflow-hidden transition-all duration-300">
                        {/* Table Header Filter */}
                        <div className="p-6 border-b border-slate-100 dark:border-[#334155] flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50 dark:bg-[#1e293b]/50">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by order code, remarks or entered by..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                            <div className="text-xs font-bold text-slate-400 font-mono tracking-widest uppercase">
                                Verified Records: {filteredCrossChecks.length}
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/70 dark:bg-[#0f172a]/20 border-b border-slate-100 dark:border-[#334155] text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                        <th className="px-6 py-4 w-28">ID</th>
                                        <th className="px-6 py-4">Order Code</th>
                                        <th className="px-6 py-4">Order Date</th>
                                        <th className="px-6 py-4">Verification Date</th>
                                        <th className="px-6 py-4 text-center">Expected Qty</th>
                                        <th className="px-6 py-4 text-center">Actual Qty</th>
                                        <th className="px-6 py-4 text-center">Discrepancy</th>
                                        <th className="px-6 py-4">Verified By</th>
                                        <th className="px-6 py-4 text-right w-28">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="9" className="px-6 py-16 text-center text-slate-500">
                                                <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-500" />
                                                <span className="font-semibold text-slate-600 dark:text-slate-400">Fetching records...</span>
                                            </td>
                                        </tr>
                                    ) : paginatedCrossChecks.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="px-6 py-16 text-center text-slate-500 font-semibold">
                                                No cross check verifications found.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedCrossChecks.map((cc) => {
                                            const diff = cc.OCH_CROSS_CHECK_QTY_TOT - cc.OCH_ORDER_TOT_QTY;
                                            return (
                                                <tr key={cc.OCH_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 rounded-lg text-xs font-mono font-bold">
                                                            #{cc.OCH_ID}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">{cc.order_no}</div>
                                                        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{cc.order_reference || 'N/A'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-500">
                                                        {new Date(cc.OCH_ORDER_DATE).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-500">
                                                        {new Date(cc.OCH_CROSS_CHECK_DATE).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-white text-sm">
                                                        {parseFloat(cc.OCH_ORDER_TOT_QTY).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                                                        {parseFloat(cc.OCH_CROSS_CHECK_QTY_TOT).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className={`inline-flex items-center space-x-1 font-bold text-sm px-2.5 py-1 rounded-full border ${diff < 0
                                                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                : diff > 0
                                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                    : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                            }`}>
                                                            {diff < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : diff > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : null}
                                                            <span>{diff > 0 ? `+${diff}` : diff}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-2 text-sm font-bold text-slate-700 dark:text-white">
                                                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs shrink-0">
                                                                {cc.OCH_ENTERED_BY[0].toUpperCase()}
                                                            </div>
                                                            <span className="truncate max-w-[120px]">{cc.OCH_ENTERED_BY}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleViewDetail(cc)}
                                                            className="p-2.5 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                                                            title="View detail items"
                                                        >
                                                            <Eye className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination UI */}
                        {totalPages > 1 && (
                            <div className="p-6 border-t border-slate-100 dark:border-[#334155] flex items-center justify-between">
                                <span className="text-sm text-slate-500">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-slate-100 dark:bg-[#0f172a] rounded-lg disabled:opacity-50 text-sm font-bold"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-slate-100 dark:bg-[#0f172a] rounded-lg disabled:opacity-50 text-sm font-bold"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // New Cross Check verification form
                    <div className="grid grid-cols-1 gap-8">
                        {!selectedOrderId ? (
                            /* Master Table to select approved order */
                            <div className="bg-white dark:bg-[#1e293b] rounded-[2rem] shadow-xl border border-slate-200 dark:border-[#334155] overflow-hidden transition-all duration-300">
                                <div className="p-8 border-b border-slate-100 dark:border-[#334155] flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50 dark:bg-[#1e293b]/50">
                                    <div>
                                        <h2 className="text-xl font-bold flex items-center space-x-2.5 text-slate-800 dark:text-white mb-1">
                                            <Calendar className="w-5 h-5 text-blue-500" />
                                            <span>1. Select Approved Order for Cross-Checking</span>
                                        </h2>
                                        <p className="text-xs text-slate-400">Choose a recently approved production order to verify its actual yields.</p>
                                    </div>
                                    <div className="relative w-full max-w-xs">
                                        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search approved orders..."
                                            value={orderSearchTerm}
                                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/70 dark:bg-[#0f172a]/20 border-b border-slate-100 dark:border-[#334155] text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                                <th className="px-6 py-4">Order Code</th>
                                                <th className="px-6 py-4">Order Date</th>
                                                <th className="px-6 py-4">Reference</th>
                                                <th className="px-6 py-4 text-center">Scheduled Total Qty</th>
                                                <th className="px-6 py-4 text-right w-36">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                                            {orders.filter(order =>
                                                order.OR_NO.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                                                (order.OR_REFFERENCE && order.OR_REFFERENCE.toLowerCase().includes(orderSearchTerm.toLowerCase()))
                                            ).length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm font-semibold">
                                                        No approved orders available for verification.
                                                    </td>
                                                </tr>
                                            ) : (
                                                orders.filter(order =>
                                                    order.OR_NO.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                                                    (order.OR_REFFERENCE && order.OR_REFFERENCE.toLowerCase().includes(orderSearchTerm.toLowerCase()))
                                                ).map((order) => (
                                                    <tr key={order.OR_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-mono font-black">
                                                                {order.OR_NO}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-semibold text-slate-500">
                                                            {new Date(order.OR_DATE).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 font-semibold">
                                                            {order.OR_REFFERENCE || '---'}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-white text-sm">
                                                            {parseFloat(order.OR_TOTAL_QTY).toLocaleString()} Units
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleOrderSelect(order.OR_ID)}
                                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/10"
                                                            >
                                                                Select Order
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* Header selected banner */
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-blue-200 block mb-1">Currently Cross Checking</span>
                                    <h2 className="text-xl sm:text-2xl font-black flex items-center">
                                        Order: {orders.find(o => o.OR_ID === parseInt(selectedOrderId))?.OR_NO}
                                        <span className="ml-3 text-xs bg-white/20 px-2.5 py-1 rounded-lg font-bold border border-white/10 font-mono">
                                            {orders.find(o => o.OR_ID === parseInt(selectedOrderId))?.OR_REFFERENCE || 'No Reference'}
                                        </span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden md:block">
                                        <span className="text-[10px] text-blue-200 block font-bold uppercase tracking-wider">Expected Yield</span>
                                        <span className="text-lg font-bold">
                                            {parseFloat(orders.find(o => o.OR_ID === parseInt(selectedOrderId))?.OR_TOTAL_QTY || 0).toLocaleString()} Units
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedOrderId('');
                                            setSelectedOrderItems([]);
                                        }}
                                        className="bg-white hover:bg-slate-100 text-blue-600 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md"
                                    >
                                        Change Order
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Items input card */}
                        {selectedOrderId && (
                            <form onSubmit={handleSubmitCrossCheck} className="space-y-8">
                                <div className="bg-white dark:bg-[#1e293b] rounded-[2rem] shadow-xl border border-slate-200 dark:border-[#334155] overflow-hidden">
                                    <div className="p-8 border-b border-slate-100 dark:border-[#334155]">
                                        <h2 className="text-xl font-bold flex items-center space-x-2.5 text-slate-800 dark:text-white">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            <span>2. Input Actual Production Output</span>
                                        </h2>
                                    </div>

                                    {isLoadingDetails ? (
                                        <div className="p-16 text-center text-slate-500">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                                            <span>Loading items details...</span>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50 dark:bg-[#0f172a]/20 border-b border-slate-100 dark:border-[#334155] text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                                        <th className="px-6 py-4">Product Code & Name</th>
                                                        <th className="px-6 py-4 w-36 text-center">Expected Qty</th>
                                                        <th className="px-6 py-4 w-44 text-center">Actual Made Qty *</th>
                                                        <th className="px-6 py-4 w-32 text-center">Discrepancy</th>
                                                        <th className="px-6 py-4 w-44">Location</th>
                                                        <th className="px-6 py-4">Item Remark</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                                                    {selectedOrderItems.map((item, index) => {
                                                        const diff = item.OCD_ENTERED_QTY - item.OCD_ORDERED_QTY;
                                                        return (
                                                            <tr key={index} className="hover:bg-slate-50/30 dark:hover:bg-[#1e293b]/20">
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm font-bold text-slate-800 dark:text-white">{item.product_name}</div>
                                                                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{item.product_code}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400 text-sm">
                                                                    {item.OCD_ORDERED_QTY}
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        required
                                                                        value={item.OCD_ENTERED_QTY}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                            handleQtyChange(index, val);
                                                                        }}
                                                                        className="w-32 bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-lg py-2 px-3 text-center text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${diff < 0
                                                                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                            : diff > 0
                                                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                                : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                                        }`}>
                                                                        {diff > 0 ? `+${diff}` : diff}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <select
                                                                        value={item.OCD_LOCATION_ID}
                                                                        onChange={(e) => handleItemLocationChange(index, e.target.value)}
                                                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-lg py-2 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700 dark:text-white"
                                                                    >
                                                                        {locations.map(loc => (
                                                                            <option key={loc.L_ID} value={loc.L_ID}>{loc.L_NAME}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <input
                                                                        type="text"
                                                                        value={item.OCD_REMARK}
                                                                        onChange={(e) => handleItemRemarkChange(index, e.target.value)}
                                                                        placeholder={diff !== 0 ? "Remark required for mismatch *" : "Add verification notes..."}
                                                                        className={`w-full bg-slate-50 dark:bg-[#0f172a] border rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-2 ${
                                                                            diff !== 0 && (!item.OCD_REMARK || item.OCD_REMARK.trim() === '')
                                                                                ? 'border-amber-500 focus:ring-amber-500/50 dark:border-amber-500/50 placeholder-amber-500 dark:placeholder-amber-500/70 font-semibold'
                                                                                : 'border-slate-300 dark:border-[#334155] focus:ring-blue-500/50 text-slate-800 dark:text-white'
                                                                        }`}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* General remarks card */}
                                <div className="bg-white dark:bg-[#1e293b] rounded-[2rem] shadow-xl border border-slate-200 dark:border-[#334155] p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                                            <span>3. General Cross Check Remarks / Notes <span className="text-amber-500">*</span></span>
                                            {(!remarks || remarks.trim() === '') && (
                                                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Required *</span>
                                            )}
                                        </label>
                                        <textarea
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            rows="3"
                                            required
                                            placeholder="Write overall observations on discrepancy, wastage, machine calibration issues, or reasons for variations... (Required)"
                                            className={`w-full bg-slate-50 dark:bg-[#0f172a] border rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 text-sm transition-all ${
                                                !remarks || remarks.trim() === ''
                                                    ? 'border-amber-500/60 focus:ring-amber-500/50 dark:border-amber-500/40'
                                                    : 'border-slate-300 dark:border-[#334155] focus:ring-blue-500/50'
                                            }`}
                                        />
                                    </div>

                                    {/* Action button */}
                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-8 py-4 rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all text-sm"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span>Submitting Verification...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-5 h-5" />
                                                    <span>Verify and Submit Output</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* Modal to view specific verified items */}
            <AnimatePresence>
                {isModalOpen && viewingCrossCheck && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />

                        {/* Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="px-10 py-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <div className="flex items-center space-x-5">
                                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-600/30">
                                        <ClipboardList className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                                            Verification Detail: {viewingCrossCheck.order_no}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                                            Cross check ID #{viewingCrossCheck.OCH_ID} • {new Date(viewingCrossCheck.OCH_CROSS_CHECK_DATE).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
                                {/* Summary info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-5 bg-slate-50 dark:bg-[#0f172a] rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-widest mb-1">Expected Production</span>
                                        <span className="text-xl font-black text-slate-700 dark:text-white">
                                            {parseFloat(viewingCrossCheck.OCH_ORDER_TOT_QTY).toLocaleString()} Units
                                        </span>
                                    </div>
                                    <div className="p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10 shadow-sm">
                                        <span className="text-[10px] text-blue-400 block font-bold uppercase tracking-widest mb-1">Actual Verified Output</span>
                                        <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                                            {parseFloat(viewingCrossCheck.OCH_CROSS_CHECK_QTY_TOT).toLocaleString()} Units
                                        </span>
                                    </div>
                                    <div className="p-5 bg-slate-50 dark:bg-[#0f172a] rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-widest mb-1">Verified By</span>
                                        <span className="text-xl font-black text-slate-700 dark:text-white flex items-center mt-0.5">
                                            <User className="w-5 h-5 mr-2 text-slate-400" />
                                            {viewingCrossCheck.OCH_ENTERED_BY}
                                        </span>
                                    </div>
                                </div>

                                {/* Remarks info */}
                                {viewingCrossCheck.OCH_REMARKS && (
                                    <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl shadow-sm">
                                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest block mb-1">General Observations</span>
                                        <p className="text-sm italic font-medium text-slate-600 dark:text-[#94a3b8]">"{viewingCrossCheck.OCH_REMARKS}"</p>
                                    </div>
                                )}

                                {/* Detail Items list */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                                        <ClipboardList className="w-4 h-4 mr-2 text-blue-500" />
                                        <span>Verification Breakdown</span>
                                    </h4>
                                    {isLoadingDetails ? (
                                        <div className="py-16 text-center text-slate-500">
                                            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-500" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading item breakdown...</span>
                                        </div>
                                    ) : (
                                        <div className="border border-slate-200 dark:border-[#334155] rounded-[1.5rem] overflow-hidden shadow-sm">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50 dark:bg-[#0f172a]/20 border-b border-slate-200 dark:border-[#334155] text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        <th className="px-6 py-4">Product Info</th>
                                                        <th className="px-6 py-4 text-center">Expected</th>
                                                        <th className="px-6 py-4 text-center">Actual Verified</th>
                                                        <th className="px-6 py-4 text-center">Diff</th>
                                                        <th className="px-6 py-4">Location</th>
                                                        <th className="px-6 py-4">Observation</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                                                    {viewingDetails.map((item) => {
                                                        const diff = parseFloat(item.OCD_DIF_QTYS);
                                                        return (
                                                            <tr key={item.OCD_ID} className="text-sm hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-slate-800 dark:text-white">{item.product_name}</div>
                                                                    <span className="text-[10px] text-slate-400 font-mono tracking-tight font-bold uppercase">{item.product_code}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center font-semibold text-slate-600 dark:text-slate-400">
                                                                    {parseFloat(item.OCD_ORDERED_QTY).toLocaleString()}
                                                                </td>
                                                                <td className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400">
                                                                    {parseFloat(item.OCD_ENTERED_QTY).toLocaleString()}
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${diff < 0
                                                                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                            : diff > 0
                                                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                                : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                                        }`}>
                                                                        {diff > 0 ? `+${diff}` : diff}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                                    {locations.find(l => l.L_ID === item.OCD_LOCATION_ID)?.L_NAME || `Location #${item.OCD_LOCATION_ID}`}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-slate-500 italic max-w-[200px] truncate" title={item.OCD_REMARK}>
                                                                    {item.OCD_REMARK || '---'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-10 py-6 border-t border-slate-100 dark:border-[#334155] flex justify-end gap-4 bg-slate-50/50 dark:bg-[#1e293b]/50">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-widest rounded-2xl transition-all"
                                >
                                    Close Details
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrderCrossCheck;
