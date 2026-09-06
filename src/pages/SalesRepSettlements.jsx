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
    const [appCashAmount, setAppCashAmount] = useState(0);

    const roles = currentUser?.roles?.split(',') || [];
    const isAdmin = roles.some(role => role.toLowerCase() === 'admin');
    const isStaff = roles.some(role => role.toLowerCase() === 'staff');
    const canSettle = isAdmin || isStaff;

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
            setAppCashAmount(0);
            const res = await api.get(`/sales-rep-settlements/${id}`);
            const header = res.data.header;
            setActiveSettlement(header);
 
            // Fetch Actual Hand Cash synced from mobile app
            const srId = header?.SR_ID;
            const rawDate = header?.SETTLE_DATE;
            if (srId && rawDate) {
                try {
                    const cleanDate = typeof rawDate === 'string' ? rawDate.substring(0, 10) : new Date(rawDate).toISOString().substring(0, 10);
                    const cashRes = await api.get(`/sales-rep-settlements/cash-hand?ref_id=${srId}&date=${cleanDate}`);
                    setAppCashAmount(parseFloat(cashRes.data.amount) || 0);
                } catch (e) {
                    console.error('Error fetching app cash hand:', e);
                }
            }

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

        const getItemPrice = (d) => {
            const unitPrice = parseFloat(d.UNIT_PRICE) || 0;
            if (unitPrice > 0) return unitPrice;
            const soldQty = parseFloat(d.SOLD_QTY) || 0;
            const lineNet = parseFloat(d.LINE_NET_CASH) || 0;
            if (soldQty > 0 && lineNet > 0) return lineNet / soldQty;
            return 0;
        };

        const totalLoaded = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LOADED_QTY) || 0), 0);
        const totalSold = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.SOLD_QTY) || 0), 0);
        const totalFree = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.FREE_QTY) || 0), 0);
        const totalExpired = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.EXPIRED_QTY) || 0), 0);
        const totalOld = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.OLD_QTY) || 0), 0);
        const totalUnsold = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.UNSOLD_QTY) || 0), 0);

        const totalLoadedPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LOADED_QTY) || 0) * getItemPrice(d), 0);
        const totalSoldPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LINE_NET_CASH) || (parseFloat(d.SOLD_QTY) || 0) * getItemPrice(d)), 0);
        const totalFreePrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.FREE_QTY) || 0) * getItemPrice(d), 0);
        const totalExpiredPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.EXPIRED_QTY) || 0) * getItemPrice(d), 0);
        const totalOldPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.OLD_QTY) || 0) * getItemPrice(d), 0);
        const totalUnsoldPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.UNSOLD_QTY) || 0) * getItemPrice(d), 0);

        const grossCash = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LINE_NET_CASH) || 0), 0);
        const dayDiscount = parseFloat(activeSettlement.TOTAL_DISCOUNT) || 0;
        const currentTotalNetCash = grossCash - dayDiscount;
        const totalExpiredValue = parseFloat(activeSettlement.TOTAL_EXPIRED_VALUE) || 0;
        const totalDisplayDiscount = parseFloat(activeSettlement.TOTAL_DISPLAY_DISCOUNT) || 0;
        const displayNetValue = currentTotalNetCash - totalExpiredValue - totalDisplayDiscount;

        const totalCredit = parseFloat(activeSettlement.TOTAL_CREDIT) || 0;
        const totalPaidCash = parseFloat(activeSettlement.TOTAL_PAID_CASH) || 0;

        // Calculate penalty cash and final paid cash like the backend
        const originalTotalNet = settlementDetails.reduce((sum, d) => sum + (parseFloat(d._originalCash) || 0), 0);
        const penaltyCash = Math.max(0, currentTotalNetCash - originalTotalNet);
        const finalPaidCash = totalPaidCash + penaltyCash;

        const commissionPercent = parseFloat(activeSettlement.SR_COMMISSION_PERCENT) || 10;
        const currentCommission = finalPaidCash * (commissionPercent / 100);
        const currentHandover = finalPaidCash - currentCommission;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Settlement A4 Report - #${activeSettlement.SETTLE_ID}</title>
                <style>
                    @media print {
                        @page {
                            size: auto;
                            margin-top: 8mm;
                            margin-left: 10mm;
                            margin-right: 10mm;
                            margin-bottom: 5mm;
                        }
                        body { zoom: 0.76; }
                    }
                    body { font-family: 'Arial', sans-serif; margin: 0 auto; padding: 10px; font-size: 14px; color: #333; }
                    .header-section { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 8px; }
                    .logo-area { text-align: left; }
                    .logo-area img { height: 40px; }
                    .logo-area h1 { margin: 3px 0 0 0; font-size: 20px; color: #000; }
                    .logo-area p { margin: 1px 0; color: #555; font-size: 11px; }
                    .info-area { text-align: right; }
                    .info-area h2 { margin: 0 0 3px 0; font-size: 18px; color: #000; }
                    .info-area p { margin: 1px 0; font-weight: bold; font-size: 11px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                    th, td { border: 1px solid #ccc; padding: 7px 8px; text-align: center; font-size: 18px; }
                    th { background-color: #f4f4f4; color: #000; font-weight: bold; text-transform: uppercase; font-size: 18px; }
                    td.left { text-align: left; }
                    td.right { text-align: right; }
                    .summary-section { margin-top: 20px; }
                    .summary-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .summary-table th, .summary-table td { border: 1px solid #ccc; padding: 10px 8px; text-align: center; font-size: 14px; }
                    .summary-table th { background-color: #f4f4f4; color: #000; font-weight: bold; text-transform: uppercase; font-size: 13px; }
                    .summary-table td.deduction { color: #d32f2f; font-weight: bold; }
                    .footer { text-align: center; margin-top: 12px; font-size: 10px; color: #777; border-top: 1px solid #ccc; padding-top: 8px; }
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
                                <td class="left"><b>${item.P_NAME}</b></td>
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
                    <tfoot>
                        <tr style="font-weight: bold; background-color: #f4f4f4;">
                            <td class="left">TOTAL VALUE</td>
                            <td>Rs. ${totalLoadedPrice.toFixed(2)}<br/><span style="font-size:11px; font-weight:normal; color:#555;">(${totalLoaded} pcs)</span></td>
                            <td>Rs. ${totalSoldPrice.toFixed(2)}<br/><span style="font-size:11px; font-weight:normal; color:#555;">(${totalSold} pcs)</span></td>
                            <td>Rs. ${totalFreePrice.toFixed(2)}<br/><span style="font-size:11px; font-weight:normal; color:#555;">(${totalFree} pcs)</span></td>
                            <td>Rs. ${totalExpiredPrice.toFixed(2)}<br/><span style="font-size:11px; font-weight:normal; color:#555;">(${totalExpired} pcs)</span></td>
                            <td>Rs. ${totalOldPrice.toFixed(2)}<br/><span style="font-size:11px; font-weight:normal; color:#555;">(${totalOld} pcs)</span></td>
                            <td>Rs. ${totalUnsoldPrice.toFixed(2)}<br/><span style="font-size:11px; font-weight:normal; color:#555;">(${totalUnsold} pcs)</span></td>
                            <td class="right">Rs. ${grossCash.toFixed(2)}</td>
                        </tr>
                        <tr style="font-weight: bold; background-color: #f3e8ff;">
                            <td colSpan="7" class="right" style="text-align: right; font-size: 12px; color: #5b21b6; text-transform: uppercase;">Total Loaded Price - Full Net Cash</td>
                            <td class="right" style="font-size: 14px; color: #6b21a8; font-weight: bold;">Rs. ${(totalLoadedPrice - grossCash).toFixed(2)}</td>
                        </tr>
                        <tr style="font-weight: bold; background-color: #e0e7ff;">
                            <td colSpan="7" class="right" style="text-align: right; font-size: 12px; color: #3730a3; text-transform: uppercase;">(Old Price + Loaded Price) - (Return Price + Bill Disc. + Display Disc.)</td>
                            <td class="right" style="font-size: 14px; color: #312e81; font-weight: bold;">Rs. ${((totalOldPrice + totalLoadedPrice) - (totalExpiredPrice + dayDiscount + totalDisplayDiscount)).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div class="summary-section">
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th>Total Sold Qty</th>
                                <th>Gross Value</th>
                                <th>Total Paid Amount (All Invoices)</th>
                                <th>Total Given Credit</th>
                                <th>Global Discount</th>
                                <th>Total Return/Expire Amount</th>
                                <th>Total Display Discount</th>
                                <th>Commission (${commissionPercent}%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><b>${totalSold}</b></td>
                                <td>Rs. ${grossCash.toFixed(2)}</td>
                                <td><b>Rs. ${finalPaidCash.toFixed(2)}</b></td>
                                <td>Rs. ${totalCredit.toFixed(2)}</td>
                                <td class="deduction">Rs. ${dayDiscount.toFixed(2)}</td>
                                <td class="deduction">Rs. ${totalExpiredValue.toFixed(2)}</td>
                                <td class="deduction">Rs. ${totalDisplayDiscount.toFixed(2)}</td>
                                <td class="deduction">Rs. ${currentCommission.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="margin-top: 15px; display: flex; justify-content: space-between; gap: 15px; align-items: flex-start;">
                        <div style="flex: 1; border: 1.5px solid #6b21a8; padding: 10px; border-radius: 6px; background-color: #f3e8ff;">
                            <h3 style="margin: 0 0 8px 0; border-bottom: 1.5px solid #6b21a8; padding-bottom: 3px; font-size: 12px; text-transform: uppercase; font-weight: bold; color: #5b21b6; text-align: left;">Calculated Stock Differences</h3>
                            <table style="width: 100%; border: none; margin: 0;">
                                <tr style="background: none;">
                                    <td style="text-align: left; border: none; padding: 3px 0; font-size: 11px; font-weight: bold; color: #5b21b6;">Total Loaded Price - Full Net Cash:</td>
                                    <td style="text-align: right; border: none; padding: 3px 0; font-size: 12px; font-weight: bold; color: #6b21a8;">Rs. ${(totalLoadedPrice - grossCash).toFixed(2)}</td>
                                </tr>
                                <tr style="background: none;">
                                    <td style="text-align: left; border: none; padding: 3px 0; font-size: 11px; font-weight: bold; color: #3730a3;">(Old + Loaded Price) - (Returns + Discounts):</td>
                                    <td style="text-align: right; border: none; padding: 3px 0; font-size: 12px; font-weight: bold; color: #312e81;">Rs. ${((totalOldPrice + totalLoadedPrice) - (totalExpiredPrice + dayDiscount + totalDisplayDiscount)).toFixed(2)}</td>
                                </tr>
                            </table>
                        </div>
                        <div style="width: 300px; border: 1.5px solid #000; padding: 10px; border-radius: 6px; background-color: #fafafa;">
                            <h3 style="margin: 0 0 8px 0; border-bottom: 2px solid #000; padding-bottom: 3px; font-size: 13px; text-transform: uppercase; font-weight: bold; color: #000; text-align: left;">Final Handover Summary</h3>
                            <table style="width: 100%; border: none; margin: 0;">
                                <tr style="background: none;"><td style="text-align: left; border: none; padding: 3px 0; font-size: 12px; font-weight: bold;">Total Paid Amount:</td><td style="text-align: right; border: none; padding: 3px 0; font-size: 12px; font-weight: bold;">Rs. ${finalPaidCash.toFixed(2)}</td></tr>
                                <tr style="background: none;"><td style="text-align: left; border: none; padding: 3px 0; font-size: 12px; font-weight: bold;">Commission:</td><td style="text-align: right; border: none; padding: 3px 0; font-size: 12px; font-weight: bold; color: #d32f2f;">- Rs. ${currentCommission.toFixed(2)}</td></tr>
                                <tr style="background: none;"><td colspan="2" style="border: none; padding: 0; border-bottom: 1.5px solid #000; height: 1px;"></td></tr>
                                <tr style="background: none;"><td style="text-align: left; border: none; padding: 5px 0 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Handover Amount:</td><td style="text-align: right; border: none; padding: 5px 0 0 0; font-size: 13px; font-weight: bold; color: #2e7d32;">Rs. ${currentHandover.toFixed(2)}</td></tr>
                            </table>
                        </div>
                    </div>
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
    const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' or 'TODAY'

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

        let matchesDate = true;
        if (dateFilter === 'TODAY') {
            const itemDate = new Date(item.SETTLE_DATE).setHours(0, 0, 0, 0);
            const today = new Date().setHours(0, 0, 0, 0);
            matchesDate = itemDate === today;
        }

        return matchesSearch && matchesStatus && matchesDate;
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
                    <option value="ALL">Show All Status</option>
                </select>
                <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold">
                    <option value="ALL">All Time</option>
                    <option value="TODAY">Today Only</option>
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
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-[95vw] 2xl:max-w-[92vw] bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
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
                                                <th className="px-4 py-3 text-center text-red-600">Returned</th>
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
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono font-bold text-indigo-500 dark:text-indigo-400">
                                                        {item.LOADED_QTY}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {canSettle && activeSettlement.STATUS !== 1 ? (
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
                                                        {canSettle && activeSettlement.STATUS !== 1 ? (
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
                                        {(() => {
                                            const getItemPrice = (d) => {
                                                const unitPrice = parseFloat(d.UNIT_PRICE) || 0;
                                                if (unitPrice > 0) return unitPrice;
                                                const soldQty = parseFloat(d.SOLD_QTY) || 0;
                                                const lineNet = parseFloat(d.LINE_NET_CASH) || 0;
                                                if (soldQty > 0 && lineNet > 0) return lineNet / soldQty;
                                                return 0;
                                            };

                                            const totalLoadedQty = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LOADED_QTY) || 0), 0);
                                            const totalSoldQty = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.SOLD_QTY) || 0), 0);
                                            const totalFreeQty = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.FREE_QTY) || 0), 0);
                                            const totalReturnedQty = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.EXPIRED_QTY) || 0), 0);
                                            const totalOldQty = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.OLD_QTY) || 0), 0);
                                            const totalUnsoldQty = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.UNSOLD_QTY) || 0), 0);

                                            const totalLoadedPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LOADED_QTY) || 0) * getItemPrice(d), 0);
                                            const totalSoldPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LINE_NET_CASH) || (parseFloat(d.SOLD_QTY) || 0) * getItemPrice(d)), 0);
                                            const totalFreePrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.FREE_QTY) || 0) * getItemPrice(d), 0);
                                            const totalReturnedPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.EXPIRED_QTY) || 0) * getItemPrice(d), 0);
                                            const totalOldPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.OLD_QTY) || 0) * getItemPrice(d), 0);
                                            const totalUnsoldPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.UNSOLD_QTY) || 0) * getItemPrice(d), 0);
                                            const totalNetCash = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LINE_NET_CASH) || 0), 0);
                                            const dayDiscount = parseFloat(activeSettlement.TOTAL_DISCOUNT) || 0;
                                            const totalDisplayDiscount = parseFloat(activeSettlement.TOTAL_DISPLAY_DISCOUNT) || 0;
                                            const customFormulaValue = (totalOldPrice + totalLoadedPrice) - (totalReturnedPrice + dayDiscount + totalDisplayDiscount);

                                            return (
                                                <tfoot className="bg-slate-100 dark:bg-[#0f172a] font-bold border-t-2 border-slate-300 dark:border-[#334155]">
                                                    <tr>
                                                        <td className="px-4 py-3 font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs">Total Price</td>
                                                        <td className="px-4 py-3 text-center font-mono">
                                                            <div className="text-indigo-600 dark:text-indigo-400 font-bold">Rs. {totalLoadedPrice.toFixed(2)}</div>
                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({totalLoadedQty} pcs)</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono">
                                                            <div className="text-blue-600 dark:text-blue-400 font-bold">Rs. {totalSoldPrice.toFixed(2)}</div>
                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({totalSoldQty} pcs)</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono">
                                                            <div className="text-slate-600 dark:text-slate-400 font-bold">Rs. {totalFreePrice.toFixed(2)}</div>
                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({totalFreeQty} pcs)</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono">
                                                            <div className="text-red-600 dark:text-red-400 font-bold">Rs. {totalReturnedPrice.toFixed(2)}</div>
                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({totalReturnedQty} pcs)</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono">
                                                            <div className="text-orange-600 dark:text-orange-400 font-bold">Rs. {totalOldPrice.toFixed(2)}</div>
                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({totalOldQty} pcs)</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono">
                                                            <div className="text-teal-600 dark:text-teal-400 font-bold">Rs. {totalUnsoldPrice.toFixed(2)}</div>
                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({totalUnsoldQty} pcs)</div>
                                                        </td>
                                                        <td className="px-6 py-3 text-right font-mono">
                                                            <div className="text-slate-800 dark:text-white font-bold">Rs. {totalNetCash.toFixed(2)}</div>
                                                        </td>
                                                    </tr>
                                                    <tr className="bg-purple-50/80 dark:bg-purple-950/40 border-t border-purple-200 dark:border-purple-800/40">
                                                        <td colSpan="7" className="px-4 py-2.5 font-black text-purple-900 dark:text-purple-300 uppercase tracking-wider text-xs text-right">
                                                            Total Loaded Price - Full Net Cash
                                                        </td>
                                                        <td className="px-6 py-2.5 text-right font-mono font-black text-purple-700 dark:text-purple-300 text-sm">
                                                            Rs. {(totalLoadedPrice - totalNetCash).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                    <tr className="bg-indigo-50/80 dark:bg-indigo-950/40 border-t border-indigo-200 dark:border-indigo-800/40">
                                                        <td colSpan="7" className="px-4 py-2.5 font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider text-xs text-right">
                                                            (Old Price + Loaded Price) - (Return Price + Bill Disc. + Display Disc.)
                                                        </td>
                                                        <td className="px-6 py-2.5 text-right font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm">
                                                            Rs. {customFormulaValue.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            );
                                        })()}
                                    </table>
                                </div>

                                {(() => {
                                    const getItemPrice = (d) => {
                                        const unitPrice = parseFloat(d.UNIT_PRICE) || 0;
                                        if (unitPrice > 0) return unitPrice;
                                        const soldQty = parseFloat(d.SOLD_QTY) || 0;
                                        const lineNet = parseFloat(d.LINE_NET_CASH) || 0;
                                        if (soldQty > 0 && lineNet > 0) return lineNet / soldQty;
                                        return 0;
                                    };
                                    const totalLoadedPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LOADED_QTY) || 0) * getItemPrice(d), 0);
                                    const totalLoaded = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LOADED_QTY) || 0), 0);
                                    const totalUnsold = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.UNSOLD_QTY) || 0), 0);
                                    const totalSold = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.SOLD_QTY) || 0), 0);
                                    const totalExpired = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.EXPIRED_QTY) || 0), 0);
                                    const netSold = totalSold - totalExpired;
                                    const grossCash = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.LINE_NET_CASH) || 0), 0);
                                    const dayDiscount = parseFloat(activeSettlement.TOTAL_DISCOUNT) || 0;
                                    const currentTotalNetCash = grossCash - dayDiscount;
                                    const totalExpiredValue = parseFloat(activeSettlement.TOTAL_EXPIRED_VALUE) || 0;
                                    const totalDisplayDiscount = parseFloat(activeSettlement.TOTAL_DISPLAY_DISCOUNT) || 0;
                                    const displayNetValue = currentTotalNetCash - totalExpiredValue - totalDisplayDiscount;

                                    const totalCredit = parseFloat(activeSettlement.TOTAL_CREDIT) || 0;
                                    const totalPaidCash = parseFloat(activeSettlement.TOTAL_PAID_CASH) || 0;

                                    // Calculate penalty cash and final paid cash like the backend
                                    const originalTotalNet = settlementDetails.reduce((sum, d) => sum + (parseFloat(d._originalCash) || 0), 0);
                                    const penaltyCash = Math.max(0, currentTotalNetCash - originalTotalNet);
                                    const finalPaidCash = totalPaidCash + penaltyCash;

                                    const commissionPercent = parseFloat(activeSettlement.SR_COMMISSION_PERCENT) || 10;
                                    const currentCommission = finalPaidCash * (commissionPercent / 100);
                                    const currentHandover = finalPaidCash - currentCommission;
                                    const loadedMinusNetCash = totalLoadedPrice - grossCash;

                                    const totalOldPrice = settlementDetails.reduce((sum, d) => sum + (parseFloat(d.OLD_QTY) || 0) * getItemPrice(d), 0);
                                    const adjustedFormulaVal = (totalOldPrice + totalLoadedPrice) - (totalExpiredValue + dayDiscount + totalDisplayDiscount);

                                    return (
                                        <div className="flex flex-col gap-6 pt-4">
                                            {/* Stock Summary Row */}
                                            <div>
                                                <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Stock Summary</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
                                                        <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Total Loaded Qty</div>
                                                        <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono">{totalLoaded}</div>
                                                    </div>

                                                    <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-200 dark:border-blue-500/20">
                                                        <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Total Sold Qty</div>
                                                        <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">{totalSold}</div>
                                                    </div>

                                                    <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-200 dark:border-red-500/20">
                                                        <div className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Total Returned Qty (Expired)</div>
                                                        <div className="text-xl font-black text-red-700 dark:text-red-300 font-mono">{totalExpired}</div>
                                                    </div>

                                                    <div className="bg-teal-50 dark:bg-teal-500/10 p-4 rounded-2xl border border-teal-200 dark:border-teal-500/20">
                                                        <div className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Total Unsold Qty (Leftover)</div>
                                                        <div className="text-xl font-black text-teal-700 dark:text-teal-300 font-mono">{totalUnsold}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Financial Summary Row */}
                                            <div>
                                                <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Financial Summary</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-11 gap-4">
                                                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
                                                        <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">(Old+Load) - (Ret+Disc)</div>
                                                        <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono">Rs. {adjustedFormulaVal.toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-2xl border border-purple-200 dark:border-purple-500/20">
                                                        <div className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Loaded - Net Cash</div>
                                                        <div className="text-xl font-black text-purple-700 dark:text-purple-300 font-mono">Rs. {loadedMinusNetCash.toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-200 dark:border-blue-500/20">
                                                        <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Gross Value</div>
                                                        <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">Rs. {grossCash.toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-rose-50 dark:bg-rose-500/10 p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20">
                                                        <div className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Global Discounts</div>
                                                        <div className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono">- Rs. {dayDiscount.toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-2xl border border-orange-200 dark:border-orange-500/20">
                                                        <div className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Total Return/Expire</div>
                                                        <div className="text-xl font-black text-orange-700 dark:text-orange-300 font-mono">- Rs. {totalExpiredValue.toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-pink-50 dark:bg-pink-500/10 p-4 rounded-2xl border border-pink-200 dark:border-pink-500/20">
                                                        <div className="text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest mb-1">Display Discount</div>
                                                        <div className="text-xl font-black text-pink-700 dark:text-pink-300 font-mono">- Rs. {totalDisplayDiscount.toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-200 dark:border-red-500/20">
                                                        <div className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Total Credit Given</div>
                                                        <div className="text-xl font-black text-red-700 dark:text-red-300 font-mono">Rs. {totalCredit.toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/20">
                                                        <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Paid (Invoices)</div>
                                                        <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">Rs. {finalPaidCash.toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-200 dark:border-blue-500/20">
                                                        <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">App Actual Cash</div>
                                                        <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">Rs. {parseFloat(appCashAmount || 0).toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20">
                                                        <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Commission ({commissionPercent}%)</div>
                                                        <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">- Rs. {currentCommission.toFixed(2)}</div>
                                                    </div>

                                                    <div className="bg-emerald-100/50 dark:bg-emerald-500/20 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-500/40">
                                                        <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Final Handover</div>
                                                        <div className="text-xl font-black text-emerald-800 dark:text-emerald-300 font-mono">Rs. {currentHandover.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {canSettle && activeSettlement.STATUS !== 1 ? (
                                <div className="p-6 border-t border-slate-200 dark:border-[#334155] flex justify-between gap-3 bg-slate-50/50 dark:bg-[#0f172a]/50 rounded-b-3xl">
                                    <button type="button" onClick={handlePrint} className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 transition-colors shadow-sm flex items-center">
                                        <Printer className="w-4 h-4 mr-2" />
                                        Print Summary
                                    </button>
                                    <div className="flex gap-3 ml-auto">
                                        {/* <button type="button" onClick={() => handleSave(0)} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 dark:bg-[#1e293b] dark:border-[#334155] dark:text-slate-300 dark:hover:bg-[#0f172a] transition-colors shadow-sm flex items-center">
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            Save Adjustments
                                        </button> */}
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
