import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle,
    ClipboardCheck,
    FileText,
    Loader2,
    Printer,
    Search,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const SalesRepSettlements = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();

    const [settlements, setSettlements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSettlement, setActiveSettlement] = useState(null);
    const [settlementDetails, setSettlementDetails] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const roles = currentUser?.roles?.split(',') || [];
    const isAdmin = roles.some(role => role.toLowerCase() === 'admin');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/sales-rep-settlements');
            setSettlements(res.data);
        } catch (error) {
            console.error('Fetch Data Error:', error);
            showNotification(`Failed to load settlements: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const openSettlementModal = async (id) => {
        try {
            const res = await api.get(`/sales-rep-settlements/${id}`);
            setActiveSettlement(res.data.header);

            // Store the original SOLD_QTY to prevent the admin from decreasing it below invoice level
            const detailsWithOriginals = res.data.details.map(d => ({
                ...d,
                _originalSold: parseFloat(d.SOLD_QTY) || 0,
                _originalCash: parseFloat(d.LINE_NET_CASH) || 0
            }));

            setSettlementDetails(detailsWithOriginals);
            setIsModalOpen(true);
        } catch (error) {
            showNotification('Failed to fetch settlement details', 'error');
        }
    };

    const updateQty = (detailId, field, value) => {
        const val = value === '' ? '' : (parseFloat(value) || 0);
        setSettlementDetails(prev => prev.map(d => {
            if (d.P_ID === detailId) {
                if (field === 'SOLD_QTY') {
                    const updated = { ...d, [field]: value };

                    const numVal = value === '' ? 0 : val;
                    const loaded = parseFloat(d.LOADED_QTY) || 0;
                    const old = parseFloat(d.OLD_QTY) || 0;
                    const free = parseFloat(d.FREE_QTY) || 0;
                    updated.UNSOLD_QTY = Math.max(0, loaded + old - numVal - free);

                    const originalSold = parseFloat(d._originalSold) || 0;
                    const originalCash = parseFloat(d._originalCash) || 0;
                    const basePrice = parseFloat(d.UNIT_PRICE) || 0;

                    const addedQty = numVal - originalSold;

                    if (addedQty >= 0) {
                        updated.LINE_NET_CASH = originalCash + (addedQty * basePrice);
                    } else {
                        updated.LINE_NET_CASH = originalCash;
                    }

                    return updated;
                }
                return { ...d, [field]: value };
            }
            return d;
        }));
    };

    const handleQtyBlur = (item) => {
        const currentSold = parseFloat(item.SOLD_QTY) || 0;
        const originalSold = parseFloat(item._originalSold) || 0;
        if (currentSold < originalSold) {
            showNotification(`Cannot decrease Sold Qty below the invoiced amount (${originalSold})`, 'error');
            updateQty(item.P_ID, 'SOLD_QTY', originalSold.toString());
        }
    };

    const handleSave = async (statusVal) => {
        for (const d of settlementDetails) {
            const currentSold = parseFloat(d.SOLD_QTY) || 0;
            const originalSold = parseFloat(d._originalSold) || 0;
            if (currentSold < originalSold) {
                showNotification(`Cannot save: Sold Qty for ${d.P_NAME} is below the invoiced amount (${originalSold})`, 'error');
                return;
            }
        }

        setIsSaving(true);
        try {
            await api.put(`/sales-rep-settlements/${activeSettlement.SETTLE_ID}`, {
                STATUS: statusVal,
                details: settlementDetails.map(d => ({
                    P_ID: d.P_ID,
                    SOLD_QTY: d.SOLD_QTY,
                    UNSOLD_QTY: d.UNSOLD_QTY,
                    LOADED_QTY: d.LOADED_QTY,
                    FREE_QTY: d.FREE_QTY,
                    EXPIRED_QTY: d.EXPIRED_QTY,
                    OLD_QTY: d.OLD_QTY,
                    LINE_NET_CASH: d.LINE_NET_CASH
                }))
            });
            showNotification('Settlement updated successfully', 'success');
            await fetchData();
            setIsModalOpen(false);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to update settlement', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        if (!activeSettlement) return;

        const totalLoaded = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LOADED_QTY) || 0), 0);
        const totalUnsold = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.UNSOLD_QTY) || 0), 0);
        const grossCash = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LINE_NET_CASH) || 0), 0);
        const dayDiscount = parseFloat(activeSettlement.TOTAL_DISCOUNT) || 0;
        const currentTotalNetCash = grossCash - dayDiscount;

        const originalNetCash = parseFloat(activeSettlement.TOTAL_NET_CASH) || 0;
        const penalty = Math.max(0, currentTotalNetCash - originalNetCash);
        const actualPaidCash = activeSettlement.STATUS === 1
            ? parseFloat(activeSettlement.TOTAL_PAID_CASH) || 0
            : (parseFloat(activeSettlement.TOTAL_PAID_CASH) || 0) + penalty;

        const commissionPercent = parseFloat(activeSettlement.SR_COMMISSION_PERCENT) || 10;
        const currentCommission = actualPaidCash * (commissionPercent / 100);
        const currentHandover = actualPaidCash - currentCommission;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Settlement A4 Report - #${activeSettlement.SETTLE_ID}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; margin: 0 auto; padding: 20px; font-size: 14px; color: #333; }
                    .header-section { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                    .logo-area { text-align: left; }
                    .logo-area img { height: 50px; }
                    .logo-area h1 { margin: 5px 0 0 0; font-size: 24px; color: #000; }
                    .logo-area p { margin: 2px 0; color: #555; }
                    .info-area { text-align: right; }
                    .info-area h2 { margin: 0 0 10px 0; font-size: 20px; color: #000; }
                    .info-area p { margin: 2px 0; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th, td { border: 1px solid #ccc; padding: 10px; text-align: center; }
                    th { background-color: #f4f4f4; color: #000; font-weight: bold; text-transform: uppercase; font-size: 12px; }
                    td.left { text-align: left; }
                    td.right { text-align: right; }
                    .summary-section { display: flex; justify-content: flex-end; }
                    .summary-box { width: 350px; border: 1px solid #ccc; padding: 15px; border-radius: 5px; background-color: #fafafa; }
                    .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                    .summary-row.bold { font-weight: bold; color: #000; }
                    .summary-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
                    .summary-row.deduction { color: #d32f2f; }
                    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #777; border-top: 1px solid #ccc; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header-section">
                    <div class="logo-area">
                        <img src="/logo.png" alt="Logo">
                        <h1>INDIKA BAKERS</h1>
                        <p>Mehiellagama, Hiripitiya, Nikadalupotha</p>
                        <p>Tel: 071660 0165</p>
                    </div>
                    <div class="info-area">
                        <h2>DAILY SETTLEMENT REPORT</h2>
                        <p>Settlement ID: #${activeSettlement.SETTLE_ID}</p>
                        <p>Sales Rep: ${activeSettlement.SR_NAME || 'N/A'}</p>
                        <p>Date: ${new Date(activeSettlement.SETTLE_DATE).toLocaleDateString()}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="left">Product Name</th>
                            <th>Loaded</th>
                            <th>Sold</th>
                            <th>Free</th>
                            <th>Expired</th>
                            <th>Old</th>
                            <th>Unsold</th>
                            <th class="right">Net Value (Rs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${settlementDetails.map(item => `
                            <tr>
                                <td class="left"><b>${item.P_NAME}</b><br><span style="font-size:10px;color:#777;">${item.P_CODE}</span></td>
                                <td>${item.LOADED_QTY}</td>
                                <td>${item.SOLD_QTY}</td>
                                <td>${item.FREE_QTY}</td>
                                <td>${item.EXPIRED_QTY}</td>
                                <td>${item.OLD_QTY}</td>
                                <td>${item.UNSOLD_QTY}</td>
                                <td class="right">${parseFloat(item.LINE_NET_CASH).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary-section">
                    <div class="summary-box">
                        <div class="summary-row"><span>Total Loaded Qty:</span> <span>${totalLoaded}</span></div>
                        <div class="summary-row"><span>Total Return Qty:</span> <span>${totalUnsold}</span></div>
                        <div class="summary-row" style="margin-bottom: 20px;"><span>Total Given Credit:</span> <span>Rs. ${(parseFloat(activeSettlement.TOTAL_CREDIT) || 0).toFixed(2)}</span></div>
                        <div class="summary-row" style="color: #6b21a8;"><span>Debt Collected:</span> <span>Rs. ${(parseFloat(activeSettlement.DEBT_COLLECTION) || 0).toFixed(2)}</span></div>

                        
                        <div class="summary-row bold"><span>Gross Value:</span> <span>Rs. ${grossCash.toFixed(2)}</span></div>
                        <div class="summary-row deduction"><span>Global Discount:</span> <span>- Rs. ${dayDiscount.toFixed(2)}</span></div>
                        <div class="summary-row bold" style="border-top:1px dotted #ccc; padding-top:5px;"><span>Net Value:</span> <span>Rs. ${currentTotalNetCash.toFixed(2)}</span></div>
                        
                        <div class="summary-row" style="margin-top: 15px;"><span>Total Actual Cash:</span> <span>Rs. ${actualPaidCash.toFixed(2)}</span></div>

                        <div class="summary-row deduction"><span>Commission (${commissionPercent}%):</span> <span>- Rs. ${currentCommission.toFixed(2)}</span></div>
                        
                        <div class="summary-row total"><span>FINAL HANDOVER:</span> <span>Rs. ${currentHandover.toFixed(2)}</span></div>
                    </div>
                </div>

                <div class="footer">
                    System Generated Settlement Report &bull; Indika Bakery Management System
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const printDocument = iframe.contentWindow.document;
        printDocument.open();
        printDocument.write(html);
        printDocument.close();

        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };

    const [statusFilter, setStatusFilter] = useState('0'); // '0' for Pending, '1' for Settled, 'ALL' for All

    const getStatusBadge = (status) => {
        switch (status) {
            case 0: return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">Pending</span>;
            case 1: return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">Settled</span>;
            default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold">Unknown</span>;
        }
    };

    const filteredData = settlements.filter(item => {
        const matchesSearch = searchTerm === '' ||
            (item.SR_NAME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.SETTLE_ID.toString().includes(searchTerm);

        const matchesStatus = statusFilter === 'ALL' || item.STATUS?.toString() === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Daily Settlements</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Review sales rep end-of-day returns, missing stock, and finalize handovers.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search by Sales Rep or Settlement ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold"
                >
                    <option value="0">Pending Settlements</option>
                    <option value="1">Settled / Completed</option>
                    <option value="ALL">Show All</option>
                </select>
            </div>

            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Sales Rep</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Total Value</th>

                                <th className="px-6 py-4">Cash (Paid)</th>
                                <th className="px-6 py-4">Credit</th>
                                <th className="px-6 py-4">Comm.</th>
                                <th className="px-6 py-4">Handover</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading settlements...
                                    </td>
                                </tr>
                            ) : paginatedData.map((s) => (
                                <tr key={s.SETTLE_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
                                        #{s.SETTLE_ID}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                                        {s.SR_NAME || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400">
                                        {new Date(s.SETTLE_DATE).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">
                                        Rs. {parseFloat(s.TOTAL_NET_CASH).toFixed(2)}
                                    </td>

                                    <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                                        Rs. {parseFloat(s.TOTAL_PAID_CASH || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-red-600 dark:text-red-400">
                                        Rs. {parseFloat(s.TOTAL_CREDIT || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-amber-600 dark:text-amber-400">
                                        Rs. {parseFloat(s.SR_COMMISSION).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg">
                                        Rs. {parseFloat(s.HANDOVER_AMOUNT).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(s.STATUS)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openSettlementModal(s.SETTLE_ID)}
                                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors ml-auto flex items-center"
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {!isLoading && filteredData.length > itemsPerPage && (
                <div className="mt-6 flex justify-between items-center bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] shadow-sm">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
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
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredData.length / itemsPerPage)))}
                            disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)}
                            className="px-4 py-2 border border-slate-300 dark:border-[#334155] rounded-xl text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[#0f172a] font-bold transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            <AnimatePresence>
                {isModalOpen && activeSettlement && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-6xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-200 dark:border-[#334155] flex justify-between items-center bg-slate-50/50 dark:bg-[#0f172a]/50 rounded-t-3xl">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                        <ClipboardCheck className="w-5 h-5 mr-2 text-indigo-500" />
                                        Settlement Review #{activeSettlement.SETTLE_ID}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1 font-bold">{activeSettlement.SR_NAME} | Date: {new Date(activeSettlement.SETTLE_DATE).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {/* <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 flex items-start">
                                    <AlertCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                                    <div className="text-sm text-blue-800 dark:text-blue-300">
                                        <span className="font-bold">Missing Stock Adjustments:</span> If a Sales Rep has missing stock that they cannot account for, simply decrease their <b>Unsold Qty</b> and increase their <b>Sold Qty</b>. The system will treat it as a sale and charge them for it in the final handover amount.
                                    </div>
                                </div> */}

                                <div className="border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-[#0f172a]">
                                            <tr className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                                <th className="px-4 py-3">Product</th>
                                                <th className="px-4 py-3 text-center text-indigo-500">Loaded</th>
                                                <th className="px-4 py-3 text-center text-blue-600">Sold</th>
                                                <th className="px-4 py-3 text-center">Free</th>
                                                <th className="px-4 py-3 text-center text-red-600">Expired</th>
                                                <th className="px-4 py-3 text-center text-orange-500">Old</th>
                                                <th className="px-4 py-3 text-center text-teal-600">Unsold</th>
                                                <th className="px-4 py-3 text-right">Net Cash (Rs.)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                                            {settlementDetails.map(item => (
                                                <tr key={item.P_ID} className="hover:bg-slate-50 dark:hover:bg-[#0f172a]/50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-800 dark:text-white">{item.P_NAME}</div>
                                                        <div className="text-xs text-slate-500">{item.P_CODE}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono font-bold text-indigo-500 dark:text-indigo-400">
                                                        {item.LOADED_QTY}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {isAdmin && activeSettlement.STATUS !== 1 ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.SOLD_QTY}
                                                                onChange={(e) => updateQty(item.P_ID, 'SOLD_QTY', e.target.value)}
                                                                onBlur={() => handleQtyBlur(item)}
                                                                className="w-20 bg-white dark:bg-[#1e293b] border border-blue-300 dark:border-blue-500/50 rounded-lg py-1 px-2 text-center font-bold focus:ring-2 focus:ring-blue-500 text-blue-700 dark:text-blue-400"
                                                            />
                                                        ) : (
                                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{item.SOLD_QTY}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-500">
                                                        {item.FREE_QTY}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono font-bold text-red-600 dark:text-red-400">
                                                        {item.EXPIRED_QTY}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono font-bold text-orange-500 dark:text-orange-400">
                                                        {item.OLD_QTY}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                                                        {item.UNSOLD_QTY}
                                                    </td>

                                                    <td className="px-6 py-4 text-right">
                                                        {isAdmin && activeSettlement.STATUS !== 1 ? (
                                                            <input
                                                                type="number"
                                                                disabled
                                                                min="0"
                                                                step="0.01"
                                                                value={Number(item.LINE_NET_CASH).toFixed(2)}
                                                                onChange={(e) => updateQty(item.P_ID, 'LINE_NET_CASH', e.target.value)}
                                                                className="w-32 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-500/50 rounded-lg py-1 px-2 text-right font-bold focus:ring-2 focus:ring-slate-500 text-slate-700 dark:text-slate-300"
                                                            />
                                                        ) : (
                                                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{Number(item.LINE_NET_CASH).toFixed(2)}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {(() => {
                                    const totalLoaded = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LOADED_QTY) || 0), 0);
                                    const totalUnsold = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.UNSOLD_QTY) || 0), 0);
                                    const grossCash = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LINE_NET_CASH) || 0), 0);
                                    const dayDiscount = parseFloat(activeSettlement.TOTAL_DISCOUNT) || 0;
                                    const currentTotalNetCash = grossCash - dayDiscount;

                                    const originalNetCash = parseFloat(activeSettlement.TOTAL_NET_CASH) || 0;
                                    const penalty = Math.max(0, currentTotalNetCash - originalNetCash);
                                    const actualPaidCash = activeSettlement.STATUS === 1
                                        ? parseFloat(activeSettlement.TOTAL_PAID_CASH) || 0
                                        : (parseFloat(activeSettlement.TOTAL_PAID_CASH) || 0) + penalty;

                                    const commissionPercent = parseFloat(activeSettlement.SR_COMMISSION_PERCENT) || 10;
                                    const currentCommission = actualPaidCash * (commissionPercent / 100);
                                    const currentHandover = actualPaidCash - currentCommission;

                                    return (
                                        <div className="flex flex-col gap-4 pt-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
                                                    <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Total Loaded Qty</div>
                                                    <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono">{totalLoaded}</div>
                                                </div>
                                                <div className="bg-teal-50 dark:bg-teal-500/10 p-4 rounded-2xl border border-teal-200 dark:border-teal-500/20">
                                                    <div className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Total Unsold Qty (Leftover)</div>
                                                    <div className="text-xl font-black text-teal-700 dark:text-teal-300 font-mono">{totalUnsold}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                                                <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-200 dark:border-blue-500/20">
                                                    <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Gross Value</div>
                                                    <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">Rs. {grossCash.toFixed(2)}</div>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-[#334155]">
                                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Actual Cash</div>
                                                    <div className="text-xl font-black text-slate-800 dark:text-white font-mono">Rs. {actualPaidCash.toFixed(2)}</div>
                                                </div>
                                                <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-2xl border border-purple-200 dark:border-purple-500/20">
                                                    <div className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Debt Collected</div>
                                                    <div className="text-xl font-black text-purple-700 dark:text-purple-300 font-mono">Rs. {(parseFloat(activeSettlement.DEBT_COLLECTION) || 0).toFixed(2)}</div>
                                                </div>
                                                <div className="bg-rose-50 dark:bg-rose-500/10 p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20">
                                                    <div className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Global Discounts</div>
                                                    <div className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono">- Rs. {dayDiscount.toFixed(2)}</div>
                                                </div>
                                                <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-200 dark:border-red-500/20">
                                                    <div className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Total Credit Given</div>
                                                    <div className="text-xl font-black text-red-700 dark:text-red-300 font-mono">Rs. {(parseFloat(activeSettlement.TOTAL_CREDIT) || 0).toFixed(2)}</div>
                                                </div>
                                                <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20">
                                                    <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Commission ({commissionPercent}%)</div>
                                                    <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">- Rs. {currentCommission.toFixed(2)}</div>
                                                </div>
                                                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 shadow-inner">
                                                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Final Handover</div>
                                                    <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">Rs. {currentHandover.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {isAdmin && activeSettlement.STATUS !== 1 ? (
                                <div className="p-6 border-t border-slate-200 dark:border-[#334155] flex justify-between gap-3 bg-slate-50/50 dark:bg-[#0f172a]/50 rounded-b-3xl">
                                    <div className="flex gap-3 ml-auto">
                                        <button type="button" onClick={() => handleSave(0)} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 dark:bg-[#1e293b] dark:border-[#334155] dark:text-slate-300 dark:hover:bg-[#0f172a] transition-colors shadow-sm flex items-center">
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            Save Adjustments
                                        </button>
                                        <button type="button" onClick={() => handleSave(1)} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all flex items-center">
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                            Mark as Settled
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 border-t border-slate-200 dark:border-[#334155] flex justify-end gap-3 bg-slate-50/50 dark:bg-[#0f172a]/50 rounded-b-3xl">
                                    <button type="button" onClick={handlePrint} className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 transition-colors shadow-sm flex items-center">
                                        <Printer className="w-4 h-4 mr-2" />
                                        Print Summary
                                    </button>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">Close</button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SalesRepSettlements;
