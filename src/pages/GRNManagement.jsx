import { AnimatePresence, motion } from 'framer-motion';
import JsBarcode from 'jsbarcode';
import {
    ArrowRight,
    Calendar,
    CheckCircle, Clock,
    DollarSign,
    FileText,
    Loader2,
    Package,
    Plus,
    Printer,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const GRNManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();

    const formatPrice = (val) => {
        return parseFloat(val || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Helper to format date for input[type="date"]
    const formatDateForInput = (dateValue) => {
        if (!dateValue) return '';
        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return '';

        // Use local date components to avoid timezone shift
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper to block negative signs and other non-numeric characters
    const handleNumericKeyDown = (e) => {
        if (['-', '+'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const [grns, setGrns] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewingGRN, setViewingGRN] = useState(null);
    const [grnDetails, setGrnDetails] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [batchesToPrint, setBatchesToPrint] = useState([]);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isReprint, setIsReprint] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [printFormat] = useState('34x25');
    const printRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Barcodes-GRN-${viewingGRN?.TH_SEQ_NO || 'New'}`,
        onAfterPrint: () => setShowPrintModal(false)
    });

    // Auth & Permissions
    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('raw-material');
    const roles = currentUser?.roles?.toLowerCase() || '';
    const isAdmin = roles.includes('admin') || roles.includes('super admin');

    // New GRN State
    const [newGRN, setNewGRN] = useState({
        TH_SEQ_NO: '',
        TH_REFERENCE: '',
        TH_DATE: formatDateForInput(new Date()),
        TH_SUPPLIER_ID: '',
        TH_TOTAL_COST_AMOUNT_LCY: 0,
        items: []
    });

    // New Item State (for line items)
    const [newItem, setNewItem] = useState({
        TD_MATERIAL_ID: '',
        TD_QTY: '',
        TD_COST_PRICE_LCY: '',
        TD_EXP_DATE: '',
        TD_MANUFACTURE_DATE: '',
        L_ID: ''
    });
    const [editingItemId, setEditingItemId] = useState(null);
    const [enterAsPackets, setEnterAsPackets] = useState(false);
    const [packetCount, setPacketCount] = useState('');
    const [packetSize, setPacketSize] = useState('');
    const selectedMaterial = (rawMaterials || []).find(m => String(m.RM_ID) === String(newItem?.TD_MATERIAL_ID)) || null;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [grnRes, supRes, rmRes, locRes] = await Promise.all([
                api.get('/inventory/grn'),
                api.get('/suppliers'),
                api.get('/raw-material'),
                api.get('/warehouse/locations')
            ]);
            setGrns(grnRes.data);
            setSuppliers(supRes.data);
            setRawMaterials(rmRes.data);
            setLocations(locRes.data);

            // Set default location if available
            if (locRes.data.length > 0) {
                setNewItem(prev => ({ ...prev, L_ID: locRes.data[0].L_ID }));
            }

        } catch (error) {
            showNotification('Failed to load inventory data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItem = () => {
        const { TD_MATERIAL_ID, TD_QTY, TD_COST_PRICE_LCY, L_ID, TD_EXP_DATE, TD_MANUFACTURE_DATE } = newItem;

        const isPackaging = selectedMaterial?.RM_MATERIAL_TYPE === 'Packaging';

        // 1. Check Supplier is selected first
        if (!newGRN.TH_SUPPLIER_ID) {
            showNotification('Please select a Supplier first', 'error');
            return;
        }

        // 2. Check Raw Material selection
        if (!TD_MATERIAL_ID) {
            showNotification('Please select a Raw Material', 'error');
            return;
        }

        // 3. Check Quantity
        if (!TD_QTY) {
            showNotification('Quantity is required', 'error');
            return;
        }
        if (parseFloat(TD_QTY) <= 0) {
            showNotification('Quantity must be greater than zero', 'error');
            return;
        }

        // 4. Check Unit Cost
        if (!TD_COST_PRICE_LCY) {
            showNotification('Unit Cost is required', 'error');
            return;
        }
        if (parseFloat(TD_COST_PRICE_LCY) <= 0) {
            showNotification('Unit Cost must be greater than zero', 'error');
            return;
        }

        // 5. Check Location selection
        if (!L_ID) {
            showNotification('Please select a Warehouse Location', 'error');
            return;
        }

        // 6. Check Dates for non-packaging items
        if (!isPackaging) {
            if (!TD_MANUFACTURE_DATE) {
                showNotification('Manufacture Date is required', 'error');
                return;
            }
            if (!TD_EXP_DATE) {
                showNotification('Expiry Date is required', 'error');
                return;
            }
        }

        if (!isPackaging) {
            const todayStr = formatDateForInput(new Date());
            const mfgDateStr = TD_MANUFACTURE_DATE;
            const expDateStr = TD_EXP_DATE;

            // 3. Manufacture Date Check (Must be today or past)
            if (mfgDateStr > todayStr) {
                showNotification('Manufacture date cannot be in the future', 'error');
                return;
            }

            // 4. Expiry Date Check (Must be after today)
            if (expDateStr <= todayStr) {
                showNotification('Expiry date must be in the future', 'error');
                return;
            }

            // 5. Logical Sequence Check
            if (expDateStr <= mfgDateStr) {
                showNotification('Expiry date must be after Manufacture date', 'error');
                return;
            }
        }

        const material = rawMaterials.find(m => m.RM_ID === parseInt(TD_MATERIAL_ID));
        const location = locations.find(l => l.L_ID === parseInt(L_ID));

        const itemData = {
            ...newItem,
            TD_EXP_DATE: isPackaging ? (TD_EXP_DATE || '') : TD_EXP_DATE,
            TD_MANUFACTURE_DATE: isPackaging ? (TD_MANUFACTURE_DATE || '') : TD_MANUFACTURE_DATE,
            TD_UNIT: material?.RM_UNIT || 'Unit',
            material_name: material?.RM_NAME,
            material_name_sinhala: material?.RM_NAME_SINHALA,
            material_code: material?.RM_CODE,
            location_name: location?.L_NAME,
            total: parseFloat(TD_QTY) * parseFloat(TD_COST_PRICE_LCY)
        };

        let updatedItems;
        if (editingItemId !== null) {
            updatedItems = newGRN.items.map(item =>
                item.id === editingItemId ? { ...itemData, id: editingItemId } : item
            );
            setEditingItemId(null);
            showNotification('Item updated in list', 'success');
        } else {
            if (enterAsPackets) {
                const count = parseInt(packetCount) || 1;
                const size = parseFloat(packetSize) || 0;
                const packetItems = Array.from({ length: count }).map((_, i) => ({
                    ...itemData,
                    id: Date.now() + i,
                    TD_QTY: size.toString(),
                    total: size * parseFloat(TD_COST_PRICE_LCY)
                }));
                updatedItems = [...newGRN.items, ...packetItems];
            } else {
                updatedItems = [...newGRN.items, { ...itemData, id: Date.now() }];
            }
        }

        const totalCost = updatedItems.reduce((sum, item) => sum + item.total, 0);
        setNewGRN({ ...newGRN, items: updatedItems, TH_TOTAL_COST_AMOUNT_LCY: totalCost });

        setNewItem({
            TD_MATERIAL_ID: '',
            TD_QTY: '',
            TD_COST_PRICE_LCY: '',
            TD_EXP_DATE: '',
            TD_MANUFACTURE_DATE: '',
            L_ID: locations[0]?.L_ID || ''
        });
        setEnterAsPackets(false);
        setPacketCount('');
        setPacketSize('');
    };

    const handleEditItemInList = (item) => {
        setNewItem({
            TD_MATERIAL_ID: item.TD_MATERIAL_ID?.toString() || '',
            TD_QTY: item.TD_QTY || '',
            TD_COST_PRICE_LCY: item.TD_COST_PRICE_LCY || '',
            TD_EXP_DATE: formatDateForInput(item.TD_EXP_DATE),
            TD_MANUFACTURE_DATE: formatDateForInput(item.TD_MANUFACTURE_DATE),
            L_ID: item.L_ID?.toString() || ''
        });
        setEditingItemId(item.id);
        setEnterAsPackets(false);
        setPacketCount('');
        setPacketSize('');
    };

    const removeItem = (id) => {
        const updatedItems = newGRN.items.filter(item => item.id !== id);
        const totalCost = updatedItems.reduce((sum, item) => sum + item.total, 0);
        setNewGRN({ ...newGRN, items: updatedItems, TH_TOTAL_COST_AMOUNT_LCY: totalCost });
        if (editingItemId === id) {
            setEditingItemId(null);
            setEnterAsPackets(false);
            setPacketCount('');
            setPacketSize('');
            setNewItem({
                TD_MATERIAL_ID: '',
                TD_QTY: '',
                TD_COST_PRICE_LCY: '',
                TD_EXP_DATE: '',
                TD_MANUFACTURE_DATE: '',
                L_ID: locations[0]?.L_ID || ''
            });
        }
    };

    const [editingGRNId, setEditingGRNId] = useState(null);

    const handleSaveGRN = async (e) => {
        e.preventDefault();

        if (!newGRN.TH_SUPPLIER_ID) {
            showNotification('Please select a supplier', 'error');
            return;
        }

        if (newGRN.items.length === 0) {
            showNotification('Please add at least one item', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Determine if any item is of Packaging type
            const hasPackaging = newGRN.items.some(item => {
                const material = rawMaterials.find(m => m.RM_ID === parseInt(item.TD_MATERIAL_ID));
                return material?.RM_MATERIAL_TYPE === 'Packaging';
            });

            const grnPayload = {
                ...newGRN,
                TH_TYPE: hasPackaging ? 'Packaging' : 'Standard'
            };

            if (editingGRNId) {
                await api.put(`/inventory/grn/${editingGRNId}`, grnPayload);
                showNotification('GRN updated successfully', 'success');
            } else {
                await api.post('/inventory/grn', grnPayload);
                showNotification('GRN created successfully', 'success');
            }
            setIsAddModalOpen(false);
            setEditingGRNId(null);
            setNewGRN({
                TH_SEQ_NO: '',
                TH_REFERENCE: '',
                TH_DATE: formatDateForInput(new Date()),
                TH_SUPPLIER_ID: '',
                TH_TOTAL_COST_AMOUNT_LCY: 0,
                items: []
            });
            fetchInitialData();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to save GRN', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditGRN = async (grn) => {
        try {
            const res = await api.get(`/inventory/grn/${grn.TH_ID}`);
            const details = res.data.map(d => ({
                ...d,
                id: d.TD_SEQ_NO,
                material_name: d.RM_NAME,
                material_name_sinhala: d.RM_NAME_SINHALA,
                material_code: d.RM_CODE,
                location_name: d.location_name,
                TD_EXP_DATE: formatDateForInput(d.TD_EXP_DATE),
                TD_MANUFACTURE_DATE: formatDateForInput(d.TD_MANUFACTURE_DATE),
                total: parseFloat(d.TD_QTY) * parseFloat(d.TD_COST_PRICE_LCY)
            }));

            setNewGRN({
                TH_SEQ_NO: grn.TH_SEQ_NO || '',
                TH_REFERENCE: grn.TH_REFERENCE || '',
                TH_DATE: formatDateForInput(grn.TH_DATE),
                TH_SUPPLIER_ID: grn.TH_SUPPLIER_ID?.toString() || '',
                TH_TOTAL_COST_AMOUNT_LCY: grn.TH_TOTAL_COST_AMOUNT_LCY || 0,
                items: details
            });
            setNewItem({
                TD_MATERIAL_ID: '',
                TD_QTY: '',
                TD_COST_PRICE_LCY: '',
                TD_EXP_DATE: '',
                TD_MANUFACTURE_DATE: '',
                L_ID: locations[0]?.L_ID || ''
            });
            setEditingGRNId(grn.TH_ID);
            setEditingItemId(null);
            setIsAddModalOpen(true);
        } catch (error) {
            console.error('Edit error:', error);
            showNotification('Failed to load GRN details for editing', 'error');
        }
    };

    const handleDeleteGRN = async (id) => {
        if (!window.confirm('Are you sure you want to delete this GRN?')) return;
        try {
            await api.delete(`/inventory/grn/${id}`);
            showNotification('GRN deleted successfully', 'success');
            fetchInitialData();
        } catch (error) {
            showNotification('Failed to delete GRN', 'error');
        }
    };

    const handleRejectGRN = async (id) => {
        if (!window.confirm('Are you sure you want to reject this GRN?')) return;
        setIsProcessing(true);
        try {
            await api.post(`/inventory/grn/${id}/reject`);
            showNotification('GRN rejected', 'success');
            setViewingGRN(null);
            fetchInitialData();
        } catch (error) {
            showNotification('Failed to reject GRN', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProcessGRN = async (grnId) => {
        if (!window.confirm('Are you sure you want to approve this GRN? This will update inventory levels.')) return;

        setIsProcessing(true);
        try {
            const res = await api.post(`/inventory/grn/${grnId}/process`);
            showNotification('GRN approved and inventory updated!', 'success');

            // Show barcode print modal if batches are returned
            /*
            if (res.data.batches && res.data.batches.length > 0) {
                setIsReprint(false); // First time print after approval
                setShowPreview(true); // Show barcodes immediately for approval
                setBatchesToPrint(res.data.batches.map(b => ({ ...b, original_quantity: b.quantity, print_quantity: b.quantity })));
                setShowPrintModal(true);
            }
            */

            setViewingGRN(null);
            fetchInitialData();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to approve GRN', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleViewDetails = async (grn) => {
        setViewingGRN(grn);
        try {
            const res = await api.get(`/inventory/grn/${grn.TH_ID}`);
            setGrnDetails(res.data);
        } catch (error) {
            showNotification('Failed to load GRN details', 'error');
        }
    };

    const handleReprint = async (grn) => {
        // Only open the Print modal (reverting previous dual-modal logic)
        try {
            const res = await api.get(`/inventory/grn/${grn.TH_ID}/batches`);
            if (res.data && res.data.length > 0) {
                setIsReprint(true); // Re-printing from history
                setBatchesToPrint(res.data.map(b => ({ ...b, original_quantity: b.quantity, print_quantity: b.quantity })));
                setShowPrintModal(true);
            } else {
                showNotification('No barcodes found for this record', 'info');
            }
        } catch (error) {
            showNotification('Failed to load barcodes', 'error');
        }
    };

    const filteredGRNs = grns
        .filter(g => {
            const matchesSearch =
                g.TH_SEQ_NO?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.TH_REFERENCE?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (activeTab === 'history') {
                return parseInt(g.TH_STATUS) === 2;
            } else {
                return parseInt(g.TH_STATUS) !== 2;
            }
        })
        .sort((a, b) => b.TH_ID - a.TH_ID);

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">You don't have permission to manage inventory GRNs.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Goods Received Notes</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Manage incoming raw materials and update inventory batches.</p>
                </div>
                <button
                    onClick={() => {
                        setNewGRN({
                            TH_SEQ_NO: '',
                            TH_REFERENCE: '',
                            TH_DATE: formatDateForInput(new Date()),
                            TH_SUPPLIER_ID: '',
                            TH_TOTAL_COST_AMOUNT_LCY: 0,
                            items: []
                        });
                        setNewItem({
                            TD_MATERIAL_ID: '',
                            TD_QTY: '',
                            TD_COST_PRICE_LCY: '',
                            TD_EXP_DATE: '',
                            TD_MANUFACTURE_DATE: '',
                            L_ID: locations[0]?.L_ID || ''
                        });
                        setEditingGRNId(null);
                        setEditingItemId(null);
                        setIsAddModalOpen(true);
                    }}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-xs"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add GRN</span>
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                    title="Total GRNs"
                    value={grns.length}
                    icon={<FileText className="text-blue-500" />}
                    color="blue"
                />
                <StatCard
                    title="Pending Approval"
                    value={grns.filter(g => parseInt(g.TH_STATUS) !== 2).length}
                    icon={<Clock className="text-amber-500" />}
                    color="amber"
                />
                <StatCard
                    title="Approved"
                    value={grns.filter(g => parseInt(g.TH_STATUS) === 2).length}
                    icon={<CheckCircle className="text-emerald-500" />}
                    color="emerald"
                />
            </div>

            {/* Search & Table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-xl overflow-hidden">
                {/* Tabs & Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#1e293b] p-3 rounded-[2.5rem] border border-slate-200 dark:border-[#334155] shadow-sm mb-6">
                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'active' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xl' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                            Active GRNs ({grns.filter(g => parseInt(g.TH_STATUS) !== 2).length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'history' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xl' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                            Processed History ({grns.filter(g => parseInt(g.TH_STATUS) === 2).length})
                        </button>
                    </div>

                    <div className="relative group flex-1 md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab === 'active' ? 'active' : 'historical'} records...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-6 py-4 bg-transparent outline-none text-sm font-bold placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-6 py-4">GRN & ID</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4">Transaction Info</th>
                                <th className="px-6 py-4">Financials</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading GRN records...
                                    </td>
                                </tr>
                            ) : filteredGRNs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No GRN records found.</td>
                                </tr>
                            ) : filteredGRNs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((grn) => (
                                <tr key={grn.TH_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold font-mono">#{grn.TH_ID}</span>
                                            <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">GRN-{grn.TH_SEQ_NO}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-800 dark:text-white font-bold text-sm tracking-tight">{grn.supplier_name}</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">SUP-ID: {grn.TH_SUPPLIER_ID}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-white">{new Date(grn.TH_DATE).toLocaleDateString()}</span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{grn.TH_REFERENCE || 'No Reference'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Amount</span>
                                            <span className="font-bold text-slate-800 dark:text-white text-sm">LKR {parseFloat(grn.TH_TOTAL_COST_AMOUNT_LCY).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={grn.TH_STATUS} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => handleViewDetails(grn)}
                                                className="p-3 text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all shadow-sm"
                                                title="View Full Details"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>

                                            {/* {activeTab === 'history' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReprint(grn);
                                                    }}
                                                    className="p-3 text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all shadow-sm"
                                                    title="Re-print All Barcodes"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            )} */}
                                            {(grn.TH_STATUS == 0 || grn.TH_STATUS == 3) && (
                                                <>
                                                    <button
                                                        onClick={() => handleEditGRN(grn)}
                                                        className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"
                                                        title="Edit GRN"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteGRN(grn.TH_ID)}
                                                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm"
                                                        title="Delete GRN"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredGRNs.length > itemsPerPage && (
                    <div className="px-8 py-6 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredGRNs.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredGRNs.length, currentPage * itemsPerPage)} of {filteredGRNs.length} records
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex items-center space-x-1">
                                {[...Array(Math.ceil(filteredGRNs.length / itemsPerPage))].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                disabled={currentPage === Math.ceil(filteredGRNs.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredGRNs.length / itemsPerPage), prev + 1))}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add GRN Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-5xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" >
                            <div className="p-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{editingGRNId ? 'Edit GRN' : 'New Goods Received Note'}</h3>
                                        <p className="text-sm text-slate-500">Record incoming stock and document the transaction.</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <form onSubmit={handleSaveGRN} className="space-y-10">
                                    {/* Header Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-[#0f172a]/30 p-8 rounded-3xl border border-slate-200 dark:border-[#334155]">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Supplier</label>
                                            <SearchableSelect
                                                options={suppliers.map(s => ({ value: s.CS_ID, label: s.CS_FULL_NAME }))}
                                                value={newGRN.TH_SUPPLIER_ID}
                                                onChange={(val) => setNewGRN({ ...newGRN, TH_SUPPLIER_ID: val })}
                                                placeholder="Search Supplier..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Date</label>
                                            <input
                                                type="date"
                                                required
                                                max={formatDateForInput(new Date())}
                                                value={newGRN.TH_DATE}
                                                onChange={(e) => setNewGRN({ ...newGRN, TH_DATE: e.target.value })}
                                                className="w-full bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Ref / Invoice #</label>
                                            <input type="text" value={newGRN.TH_REFERENCE} onChange={(e) => setNewGRN({ ...newGRN, TH_REFERENCE: e.target.value })} placeholder="Reference (Optional)" className="w-full bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                                        </div>
                                    </div>

                                    {/* Line Item Adder */}
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center"><ArrowRight className="w-4 h-4 mr-2 text-blue-500" /> Add Items to Shipment</h4>
                                        <div className="bg-blue-500/5 p-8 rounded-3xl border border-blue-500/10 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                                <div className="md:col-span-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Raw Material</label>
                                                    <SearchableSelect
                                                        options={rawMaterials.map(m => ({
                                                            value: m.RM_ID,
                                                            label: `${m.RM_NAME} ${m.RM_NAME_SINHALA ? '(' + m.RM_NAME_SINHALA + ')' : ''} (${m.RM_CODE})`,
                                                            search: `${m.RM_NAME} ${m.RM_NAME_SINHALA || ''} ${m.RM_CODE}`
                                                        }))}
                                                        value={newItem.TD_MATERIAL_ID}
                                                        onChange={(val) => {
                                                            const m = rawMaterials.find(item => String(item.RM_ID) === String(val));
                                                            setNewItem({
                                                                ...newItem,
                                                                TD_MATERIAL_ID: val,
                                                                TD_COST_PRICE_LCY: m?.latest_cost || newItem.TD_COST_PRICE_LCY
                                                            });
                                                        }}
                                                        placeholder="Search Material..."
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                                                        {enterAsPackets ? 'Total Quantity' : 'Quantity'} {selectedMaterial ? `(${selectedMaterial.RM_UNIT})` : ''}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        disabled={enterAsPackets}
                                                        placeholder="0.00"
                                                        value={newItem.TD_QTY}
                                                        onChange={(e) => setNewItem({ ...newItem, TD_QTY: e.target.value })}
                                                        onKeyDown={handleNumericKeyDown}
                                                        className={`w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${enterAsPackets ? 'opacity-70 bg-slate-50 dark:bg-slate-850 font-bold cursor-not-allowed text-blue-600 dark:text-blue-400' : ''}`}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Unit Cost (LKR)</label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        placeholder="0.00"
                                                        value={newItem.TD_COST_PRICE_LCY}
                                                        onChange={(e) => setNewItem({ ...newItem, TD_COST_PRICE_LCY: e.target.value })}
                                                        onKeyDown={handleNumericKeyDown}
                                                        className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Location</label>
                                                    <select value={newItem.L_ID} onChange={(e) => setNewItem({ ...newItem, L_ID: e.target.value })} className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50">
                                                        {locations.map(l => <option key={l.L_ID} value={l.L_ID}>{l.L_NAME}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Packet-wise Raw Material Mode */}
                                            {editingItemId === null && (
                                                <div className="flex items-center space-x-3 px-1 py-1">
                                                    <input
                                                        type="checkbox"
                                                        id="enterAsPackets"
                                                        checked={enterAsPackets}
                                                        onChange={(e) => {
                                                            setEnterAsPackets(e.target.checked);
                                                            if (!e.target.checked) {
                                                                setPacketCount('');
                                                                setPacketSize('');
                                                                setNewItem(prev => ({ ...prev, TD_QTY: '' }));
                                                            }
                                                        }}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                                    />
                                                    <label htmlFor="enterAsPackets" className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest cursor-pointer select-none">
                                                        Receive as Packets / Bags / Boxes (e.g., 5 bags of 25kg each)
                                                    </label>
                                                </div>
                                            )}

                                            {editingItemId === null && enterAsPackets && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Number of Packets / Bags</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            placeholder="e.g. 5"
                                                            value={packetCount}
                                                            onChange={(e) => {
                                                                setPacketCount(e.target.value);
                                                                const count = parseInt(e.target.value) || 0;
                                                                const size = parseFloat(packetSize) || 0;
                                                                setNewItem(prev => ({ ...prev, TD_QTY: (count * size > 0) ? (count * size).toString() : '' }));
                                                            }}
                                                            className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Quantity per Packet / Bag {selectedMaterial ? `(${selectedMaterial.RM_UNIT})` : ''}</label>
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="any"
                                                            placeholder="e.g. 25"
                                                            value={packetSize}
                                                            onChange={(e) => {
                                                                setPacketSize(e.target.value);
                                                                const size = parseFloat(e.target.value) || 0;
                                                                const count = parseInt(packetCount) || 0;
                                                                setNewItem(prev => ({ ...prev, TD_QTY: (count * size > 0) ? (count * size).toString() : '' }));
                                                            }}
                                                            className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Manufacture Date</label>
                                                    <input
                                                        type="date"
                                                        max={formatDateForInput(new Date())}
                                                        value={newItem.TD_MANUFACTURE_DATE}
                                                        onChange={(e) => setNewItem({ ...newItem, TD_MANUFACTURE_DATE: e.target.value })}
                                                        className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Expiry Date</label>
                                                    <input type="date" value={newItem.TD_EXP_DATE} onChange={(e) => setNewItem({ ...newItem, TD_EXP_DATE: e.target.value })} className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50" />
                                                </div>
                                                <div className="md:col-span-2 flex gap-3">
                                                    <button type="button" onClick={handleAddItem} className={`flex-1 ${editingItemId !== null ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'} py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg`}>
                                                        {editingItemId !== null ? 'Update Item' : 'Add Item to List'}
                                                    </button>
                                                    {editingItemId !== null && (
                                                        <button type="button" onClick={() => {
                                                            setEditingItemId(null);
                                                            setNewItem({
                                                                TD_MATERIAL_ID: '',
                                                                TD_QTY: '',
                                                                TD_COST_PRICE_LCY: '',
                                                                TD_EXP_DATE: '',
                                                                TD_MANUFACTURE_DATE: '',
                                                                L_ID: locations[0]?.L_ID || ''
                                                            });
                                                        }} className="px-6 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all">Cancel</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="border border-slate-200 dark:border-[#334155] rounded-3xl overflow-hidden shadow-inner">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                <tr>
                                                    <th className="px-6 py-4">Item Detail</th>
                                                    <th className="px-6 py-4">Quantity</th>
                                                    <th className="px-6 py-4">Dates (MFG/EXP)</th>
                                                    <th className="px-6 py-4">Unit Price</th>
                                                    <th className="px-6 py-4">Location</th>
                                                    <th className="px-6 py-4">Total</th>
                                                    <th className="px-6 py-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                                                {newGRN.items.length === 0 ? (
                                                    <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400 italic text-sm">No items added to this shipment yet.</td></tr>
                                                ) : newGRN.items.map(item => (
                                                    <tr key={item.id} className="text-sm">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800 dark:text-white">{item.material_name}</div>
                                                            <div className="text-blue-500 font-bold text-[11px] mb-1">{item.material_name_sinhala}</div>
                                                            <div className="text-[10px] font-mono text-slate-400">{item.material_code}</div>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                                                            {item.TD_QTY} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">{item.TD_UNIT}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase">MFG: {formatDateForInput(item.TD_MANUFACTURE_DATE) || 'N/A'}</div>
                                                            <div className="text-[10px] font-bold text-red-400 uppercase">EXP: {formatDateForInput(item.TD_EXP_DATE) || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">LKR {formatPrice(item.TD_COST_PRICE_LCY)}</td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.location_name}</td>
                                                        <td className="px-6 py-4 font-black text-slate-900 dark:text-white">LKR {formatPrice(item.total)}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                <button type="button" onClick={() => handleEditItemInList(item)} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors">
                                                                    <FileText className="w-4 h-4" />
                                                                </button>
                                                                <button type="button" onClick={() => removeItem(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            {newGRN.items.length > 0 && (
                                                <tfoot className="bg-slate-50/50 dark:bg-[#0f172a]/30">
                                                    <tr className="font-black text-slate-800 dark:text-white border-t border-slate-200 dark:border-[#334155]">
                                                        <td colSpan="5" className="px-6 py-6 text-right uppercase tracking-[0.2em] text-xs">Gross Total Amount</td>
                                                        <td className="px-6 py-6 text-xl">LKR {newGRN.TH_TOTAL_COST_AMOUNT_LCY.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>

                                    <div className="flex gap-4 pt-6 sticky bottom-0 bg-white dark:bg-[#1e293b] mt-8 pb-4">
                                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 dark:bg-[#334155] text-slate-700 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-[#404e63] transition-all">Close</button>
                                        <button type="submit" disabled={isSaving} className="flex-[2] px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                            <span>{isSaving ? 'Saving Record...' : 'Complete & Save GRN'}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View/Details Modal */}
            <AnimatePresence>
                {viewingGRN && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingGRN(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[3rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" >
                            <div className="p-10 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg font-mono font-bold text-sm tracking-widest">{viewingGRN.TH_SEQ_NO}</span>
                                        <StatusBadge status={viewingGRN.TH_STATUS} />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{viewingGRN.supplier_name}</h3>
                                </div>
                                <button onClick={() => setViewingGRN(null)} className="w-14 h-14 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-500 rounded-2xl shadow-xl active:scale-90 transition-all"><X className="w-8 h-8" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
                                    <DetailField label="Reference No" value={viewingGRN.TH_REFERENCE} icon={<FileText className="w-4 h-4" />} />
                                    <DetailField label="Received Date" value={new Date(viewingGRN.TH_DATE).toLocaleDateString()} icon={<Calendar className="w-4 h-4" />} />
                                    <DetailField label="Total Value" value={`LKR ${parseFloat(viewingGRN.TH_TOTAL_COST_AMOUNT_LCY).toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} color="emerald" />
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Items Breakdown</h4>
                                    <div className="space-y-4">
                                        {grnDetails.map((detail, idx) => (
                                            <div key={idx} className="bg-slate-50 dark:bg-[#0f172a]/50 p-6 rounded-[2rem] border border-slate-200 dark:border-[#334155] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 font-black text-slate-400 text-xs">#{idx + 1}</div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-white text-lg">{detail.RM_NAME}</div>
                                                        <div className="text-xs text-slate-500 font-medium tracking-wide">{detail.RM_CODE} • {detail.RM_UNIT}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 items-center">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</div>
                                                        <div className="text-lg font-black text-slate-800 dark:text-white">{detail.TD_QTY}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Unit Price</div>
                                                        <div className="text-lg font-bold text-slate-800 dark:text-white">LKR {formatPrice(detail.TD_COST_PRICE_LCY)}</div>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200 dark:border-[#334155] md:pl-8 pt-4 md:pt-0">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total</div>
                                                        <div className="text-xl font-black text-blue-500">LKR {formatPrice(detail.TD_QTY * detail.TD_COST_PRICE_LCY)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-end gap-4">
                                <button onClick={() => setViewingGRN(null)} className="px-10 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">Close</button>
                                <div className="flex space-x-3">
                                    {/* {viewingGRN.TH_STATUS == 2 && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await api.get(`/inventory/grn/${viewingGRN.TH_ID}/batches`);
                                                    if (res.data && res.data.length > 0) {
                                                        // Close the View popup when Print popup opens
                                                        const currentGRN = viewingGRN;
                                                        setViewingGRN(null);

                                                        setBatchesToPrint(res.data.map(b => ({ ...b, original_quantity: b.quantity, print_quantity: b.quantity })));
                                                        setIsReprint(true); // Re-print mode
                                                        setShowPreview(false); // Show adjustments first
                                                        setShowPrintModal(true);
                                                    } else {
                                                        showNotification('No batches found for this GRN', 'info');
                                                    }
                                                } catch (error) {
                                                    showNotification('Failed to load batches', 'error');
                                                }
                                            }}
                                            className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white py-4 px-10 rounded-2xl font-black transition-all uppercase tracking-widest text-xs"
                                        >
                                            <FileText className="w-4 h-4" />
                                            <span>Print Barcodes</span>
                                        </button>
                                    )} */}
                                    {isAdmin && viewingGRN.TH_STATUS != 2 && (
                                        <>
                                            <button
                                                onClick={() => handleRejectGRN(viewingGRN.TH_ID)}
                                                disabled={isProcessing}
                                                className="flex-1 flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white py-4 px-6 rounded-2xl font-black transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                                            >
                                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                                <span>Reject</span>
                                            </button>
                                            <button
                                                onClick={() => handleProcessGRN(viewingGRN.TH_ID)}
                                                disabled={isProcessing}
                                                className="flex-1 flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-black transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                                            >
                                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                <span>Approve</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Barcode Print Modal */}
            <AnimatePresence>
                {showPrintModal && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Print Raw Material Barcodes</h3>
                                    <div className="flex items-center mt-2">
                                        <span className="text-[10px] font-black text-blue-600 bg-blue-500/10 px-3 py-1.5 rounded-xl uppercase tracking-[0.15em] border border-blue-500/20 shadow-sm">
                                            Size: 34mm x 25mm (Standard Raw Material)
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setShowPrintModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 bg-slate-50 dark:bg-[#0f172a]/50">
                                {/* Print Configuration Area - Only show for re-prints */}
                                {isReprint && (
                                    <div className="mb-10 space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 mb-4">Adjust Print Quantities</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {batchesToPrint.map((batch, idx) => {
                                                const isBulk = ['KG', 'L', 'G', 'ML', 'LTR', 'GRAMS', 'METER', 'CM', 'KGMS', 'LITRE'].includes(batch.RM_UNIT?.toUpperCase());
                                                return (
                                                    <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xs">{idx + 1}</div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[150px]" title={batch.RM_NAME}>{batch.RM_NAME}</div>
                                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Original: {batch.original_quantity} {batch.RM_UNIT}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <div className="flex items-center bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase mr-2">{isBulk ? 'Print (0/1):' : 'Labels:'}</span>
                                                                <input
                                                                    type="number"
                                                                    step={isBulk ? "1" : "any"}
                                                                    max={isBulk ? "1" : batch.original_quantity}
                                                                    min="0"
                                                                    className="w-16 bg-transparent text-sm font-black text-blue-600 dark:text-blue-400 outline-none text-right"
                                                                    value={isBulk ? (batch.print_quantity > 0 ? 1 : 0) : batch.print_quantity}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const newBatches = [...batchesToPrint];
                                                                        if (isBulk) {
                                                                            newBatches[idx].print_quantity = val > 0 ? batch.original_quantity : 0;
                                                                        } else {
                                                                            const max = batch.original_quantity;
                                                                            if (val >= 0 && val <= max) {
                                                                                newBatches[idx].print_quantity = val;
                                                                            } else if (val > max) {
                                                                                showNotification(`Cannot exceed original quantity of ${max}`, 'warning');
                                                                                return;
                                                                            }
                                                                        }
                                                                        setBatchesToPrint(newBatches);
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setShowPreview(true)}
                                            className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2rem] uppercase text-xs tracking-[0.3em] shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center space-x-3"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            <span>Confirm & Generate Preview</span>
                                        </button>
                                    </div>
                                )}

                                {/* Step 2: Production Preview */}
                                {showPreview && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Step 2: Production Preview</h4>
                                            {isReprint && (
                                                <button
                                                    onClick={() => setShowPreview(false)}
                                                    className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                                                >
                                                    Back to Adjust
                                                </button>
                                            )}
                                        </div>
                                        <div className="p-10 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-inner">
                                            <div className="flex flex-col gap-4 justify-center grn-print-container" ref={printRef}>
                                                {/* Print Styles for GRN Dynamic Label Paper Sizes */}
                                                <style>{`
                                                 @media print {
                                                     @page {
                                                         margin: 0 !important;
                                                         size: 109mm 100mm !important;
                                                     }
                                                     html, body {
                                                         display: block !important;
                                                         place-items: start !important;
                                                         min-width: auto !important;
                                                         min-height: auto !important;
                                                         margin: 0 !important;
                                                         padding: 0 !important;
                                                         background: white !important;
                                                         width: 109mm !important;
                                                         height: auto !important;
                                                         overflow: visible !important;
                                                     }
                                                     .grn-print-container {
                                                         display: flex !important;
                                                         flex-wrap: wrap !important;
                                                         align-content: flex-start !important;
                                                         width: 109mm !important;
                                                         margin: 0 !important;
                                                         padding: 0 !important;
                                                         background: white !important;
                                                     }
                                                     .label-item {
                                                         margin-top: 0 !important;
                                                         margin-left: 0 !important;
                                                         margin-right: 2mm !important;
                                                         margin-bottom: 2mm !important;
                                                         padding: 0 !important;
                                                         display: block !important;
                                                         width: 34mm !important;
                                                         break-inside: avoid !important;
                                                         page-break-inside: avoid !important;
                                                     }
                                                     .label-item > div {
                                                         width: 100% !important;
                                                         height: 100% !important;
                                                         border: none !important;
                                                     }
                                                 }
                                                 `}
                                                </style>
                                                {(() => {
                                                    // First generate all the individual barcode elements
                                                    const allLabels = batchesToPrint.flatMap((batch, bIdx) => {
                                                        const unit = batch.RM_UNIT?.toUpperCase() || '';
                                                        const isBulkUnit = ['KG', 'L', 'G', 'ML', 'LTR', 'GRAMS', 'METER', 'CM', 'KGMS', 'LITRE'].includes(unit);
                                                        const currentPrintQty = batch.print_quantity || 0;

                                                        // For countable units, print 'qty' number of labels
                                                        if (!isBulkUnit) {
                                                            const labelsCount = Math.floor(parseFloat(currentPrintQty));
                                                            if (labelsCount <= 0) return [];

                                                            // Safety cap for preview/print
                                                            const finalCount = Math.min(labelsCount, 100);

                                                            return Array.from({ length: finalCount }).map((_, i) => (
                                                                <BarcodeItem
                                                                    key={`${batch.RB_ID || bIdx}-${i}`}
                                                                    value={batch.RB_BARCODE_NO}
                                                                    name={batch.RM_NAME}
                                                                    batchNo={batch.RB_BATCH_NO}
                                                                    date={batch.RB_ENTERED_DATE}
                                                                    mfgDate={batch.R_D_MANUFACTURE_DATE}
                                                                    expDate={batch.R_D_EXP_DATE}
                                                                    qty={1}
                                                                    unit={batch.RM_UNIT}
                                                                    format="34x25"
                                                                />
                                                            ));
                                                        }

                                                        // For bulk units, print one label with the specified quantity
                                                        if (currentPrintQty > 0) {
                                                            return [
                                                                <BarcodeItem
                                                                    key={batch.RB_ID || bIdx}
                                                                    value={batch.RB_BARCODE_NO}
                                                                    name={batch.RM_NAME}
                                                                    batchNo={batch.RB_BATCH_NO}
                                                                    date={batch.RB_ENTERED_DATE}
                                                                    mfgDate={batch.R_D_MANUFACTURE_DATE}
                                                                    expDate={batch.R_D_EXP_DATE}
                                                                    qty={currentPrintQty}
                                                                    unit={batch.RM_UNIT}
                                                                    format="34x25"
                                                                />
                                                            ];
                                                        }
                                                        return [];
                                                    });

                                                    // Render individual labels in a grid flow (flex-wrap)
                                                    return allLabels.map((item, itemIdx) => (
                                                        <div
                                                            key={`item-${itemIdx}`}
                                                            className="label-item"
                                                        >
                                                            {item}
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-8 border-t border-slate-200 dark:border-[#334155] flex justify-end gap-4">
                                <button onClick={() => setShowPrintModal(false)} className="px-8 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs uppercase tracking-widest">Cancel</button>
                                {/* <button onClick={() => handlePrint()} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30">Print Now</button> */}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Barcode Item Component
const BarcodeItem = ({ value, name, batchNo, date, mfgDate, expDate, qty, unit, format = '34x25' }) => {
    const canvasRef = useRef();

    useEffect(() => {
        if (canvasRef.current && value) {
            let bWidth = 1;
            let bHeight = 18;

            JsBarcode(canvasRef.current, value, {
                format: "CODE128",
                width: bWidth,
                height: bHeight,
                displayValue: false,
                margin: 0
            });
        }
    }, [value, format]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };

    const dims = {
        '34x25': { width: '34mm', height: '25mm', padding: '0.5mm' }
    };

    const currDim = dims[format] || dims['34x25'];

    return (
        <div style={{
            width: currDim.width,
            height: currDim.height,
            backgroundColor: 'white',
            color: '#000',
            padding: currDim.padding,
            boxSizing: 'border-box',
            pageBreakInside: 'avoid',
            border: '0.1mm dashed #ccc',
            fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden'
        }}>
            {/* Header: Logo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.1mm solid #000', paddingBottom: '0.5mm' }}>
                <div style={{ fontSize: '6px', fontWeight: '900', letterSpacing: '0.05em' }}>INDIKA BAKERS</div>
                <div style={{ fontSize: '5px', fontWeight: 'bold', color: '#050505ff' }}>REG: 21-2643</div>
            </div>

            {/* Item Name */}
            <div style={{ textAlign: 'center', marginBottom: '0.1mm', marginTop: '0.2mm', paddingTop: "0.1mm" }}>
                <div style={{ fontSize: '8px', fontWeight: '900', lineHeight: '1.1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            </div>

            {/* Metadata Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.1mm' }}>
                <div style={{ fontSize: '4.5px', fontWeight: 'bold', lineHeight: '1.2', textAlign: 'left' }}>
                    <div>MFG (නිෂ්පාදිත): {formatDate(mfgDate)}</div>
                    <div>EXP (කල්ඉකුත්): {formatDate(expDate)}</div>
                    <div>REC (ලැබුණු): {formatDate(date)}</div>
                </div>
                <div style={{ fontSize: '5px', fontWeight: 'bold', lineHeight: '1.2', textAlign: 'right' }}>
                    <div style={{ fontSize: '5px', color: '#555' }}>BAT NO: {batchNo}</div>
                    <div style={{ marginTop: '0.3mm' }}>QTY: <span style={{ fontSize: '9px', fontWeight: '900', color: '#2563eb' }}>{qty} {unit}</span></div>
                </div>
            </div>

            {/* Barcode Area */}
            <div style={{ textAlign: 'center', marginTop: '0.2mm', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                <canvas ref={canvasRef} style={{ width: '80%', height: 'auto', maxHeight: '10mm' }} />
                <div style={{ fontSize: '5px', fontWeight: 'bold', letterSpacing: '1px', marginTop: '0.1mm' }}>{value}</div>
            </div>

            {/* Footer Address */}
            <div style={{ width: '100%', textAlign: 'center', borderTop: '0.001mm solid #000', paddingTop: '0.01mm', marginTop: '0.01mm', fontSize: '4px', fontWeight: 'bold', color: '#090909ff', marginTop: "0.1mm" }}>
                Indika Bakery, No. 124, Main Road, Kadawatha
            </div>
        </div>
    );
};

// Sub-components
const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-300 dark:border-[#334155] shadow-sm flex items-center justify-between">
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
            <p className="text-3xl font-black text-slate-800 dark:text-white">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center`}>
            {icon}
        </div>
    </div>
);

const StatusBadge = ({ status }) => {
    const isApproved = parseInt(status) === 2;
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            {isApproved ? <CheckCircle className="w-3 h-3 mr-1.5" /> : <Clock className="w-3 h-3 mr-1.5" />}
            {isApproved ? 'Approved' : 'Pending'}
        </span>
    );
};

const DetailField = ({ label, value, icon, color = 'blue' }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
            <span className={`mr-1 text-${color}-500`}>{icon}</span>
            {label}
        </label>
        <div className={`text-lg font-black text-slate-800 dark:text-white ${color === 'emerald' ? 'text-emerald-500 dark:text-emerald-400' : ''}`}>
            {value || '-'}
        </div>
    </div>
);

export default GRNManagement;
