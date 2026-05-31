import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    BarChart,
    Calendar,
    Edit2,
    Eye,
    Image as ImageIcon,
    Info,
    Layers,
    Loader2,
    Plus,
    Ruler,
    Save,
    Search,
    ShoppingCart,
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const ProductManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const API_URL = api.defaults.baseURL.replace('/api', ''); // Base URL for static files

    // Helper to block negative signs and other non-numeric characters
    const handleNumericKeyDown = (e) => {
        if (['-', '+', 'e', 'E'].includes(e.key)) {
            e.preventDefault();
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        P_NAME: '',
        P_NAME_SINAHAL: '',
        P_DETAILS: '',
        P_CODE: '',
        P_UNIT: '',
        P_BARCODE_NO: '',
        P_IMAGE: '',
        P_REORDER_LEVEL: '',
        P_MINIMUM_LEVEL: '',
        P_MAXIMUM_LEVEL: '',
        P_SUB_CAT_ID: '',
        P_CAT_ID: '',
        P_ITEM_STORED_DAYS: 0,
        P_INSIDE_ITEM_COUNT: 0,
        P_PACK_OR_SINGLE: 'Single',
        P_ISSUE_BAG_status: 0,
        actual_barcode: '',
        P_UNIT_MEASURE_SIZE: 1
    });

    const PACK_TYPES = ['Single', 'Pack'];

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [prodRes, catRes, subRes, unitRes] = await Promise.all([
                api.get('/product/items'),
                api.get('/product/categories'),
                api.get('/product/sub-categories'),
                api.get('/product/units')
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
            setSubCategories(subRes.data);
            // Ensure Bag/Non Bag are NOT selectable in the dropdown
            setUnits((unitRes.data || []).filter(u => u.value !== 'BAG' && u.value !== 'NOT BAG'));
        } catch (error) {
            showNotification('Failed to load product data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = async (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                ...product,
                P_REORDER_LEVEL: product.P_REORDER_LEVEL === 0 || product.P_REORDER_LEVEL === '0' ? '' : product.P_REORDER_LEVEL ?? '',
                P_MINIMUM_LEVEL: product.P_MINIMUM_LEVEL === 0 || product.P_MINIMUM_LEVEL === '0' ? '' : product.P_MINIMUM_LEVEL ?? '',
                P_MAXIMUM_LEVEL: product.P_MAXIMUM_LEVEL === 0 || product.P_MAXIMUM_LEVEL === '0' ? '' : product.P_MAXIMUM_LEVEL ?? '',
                P_UNIT_MEASURE_SIZE: product.P_UNIT_MEASURE_SIZE ?? 1
            });
            setSelectedFile(null);
        } else {
            setEditingProduct(null);
            setSelectedFile(null);
            setFormData({
                P_NAME: '',
                P_NAME_SINAHAL: '',
                P_DETAILS: '',
                P_CODE: 'P-AUTO',
                P_UNIT: 'Unit',
                P_BARCODE_NO: '',
                P_IMAGE: '',
                P_REORDER_LEVEL: '',
                P_MINIMUM_LEVEL: '',
                P_MAXIMUM_LEVEL: '',
                P_SUB_CAT_ID: '',
                P_CAT_ID: '',
                P_ITEM_STORED_DAYS: 0,
                P_INSIDE_ITEM_COUNT: 0,
                P_PACK_OR_SINGLE: 'Single',
                P_ISSUE_BAG_status: 0,
                actual_barcode: '',
                P_UNIT_MEASURE_SIZE: 1
            });
            try {
                const [codeRes, barcodeRes] = await Promise.all([
                    api.get('/product/get-next-code'),
                    api.get('/product/get-next-barcode')
                ]);
                setFormData(prev => ({
                    ...prev,
                    P_CODE: codeRes.data.code,
                    P_BARCODE_NO: barcodeRes.data.barcode
                }));
            } catch (err) {
                console.error('Error fetching auto-generated data');
            }
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Basic Field Requirement Check
        const requiredFields = [
            { key: 'P_NAME', label: 'Product Name' },
            { key: 'P_CAT_ID', label: 'Category' },
            { key: 'P_SUB_CAT_ID', label: 'Sub Category' },
            { key: 'P_UNIT', label: 'Unit of Measure' },
            { key: 'P_PACK_OR_SINGLE', label: 'Packaging Type' },
            { key: 'actual_barcode', label: 'Universal Barcode' }
        ];

        for (const field of requiredFields) {
            if (!formData[field.key]) {
                showNotification(`${field.label} is required`, 'warning');
                return;
            }
        }

        // Handle numeric fields - default to 0 if empty
        const numericFields = [
            'P_REORDER_LEVEL',
            'P_MINIMUM_LEVEL',
            'P_MAXIMUM_LEVEL',
            'P_ITEM_STORED_DAYS',
            'P_INSIDE_ITEM_COUNT',
            'P_ISSUE_BAG_status',
            'P_UNIT_MEASURE_SIZE'
        ];

        // Packaging & Shelf-life validation
        if (Number(formData.P_ITEM_STORED_DAYS) <= 0) {
            showNotification('Storage days must be greater than 0', 'warning');
            return;
        }

        if (formData.P_PACK_OR_SINGLE === 'Pack' && Number(formData.P_INSIDE_ITEM_COUNT) <= 0) {
            showNotification('Inside count must be greater than 0 for packets', 'warning');
            return;
        }

        // Duplicate Barcode Check (Local Validation)
        if (formData.actual_barcode) {
            const isDuplicate = products.some(p => 
                String(p.actual_barcode) === String(formData.actual_barcode) && 
                p.P_ID !== editingProduct?.P_ID
            );
            if (isDuplicate) {
                showNotification('This barcode is already assigned to another product', 'error');
                return;
            }
        }


        setIsSaving(true);

        const data = new FormData();
        // Append all regular fields
        Object.keys(formData).forEach(key => {
            if (key !== 'P_IMAGE') {
                let value = formData[key];
                // If it's a numeric field and empty/null/NaN, default to 0 or 1
                if (numericFields.includes(key)) {
                    if (value === '' || value === null || isNaN(Number(value))) {
                        value = key === 'P_UNIT_MEASURE_SIZE' ? 1 : 0;
                    }
                }

                // If 'Single' is selected, force inside count to 0
                if (key === 'P_INSIDE_ITEM_COUNT' && formData.P_PACK_OR_SINGLE === 'Single') {
                    value = 0;
                }

                // Force minimum 1 for unit measure size
                if (key === 'P_UNIT_MEASURE_SIZE' && Number(value) <= 0) {
                    value = 1;
                }

                data.append(key, value);
            }
        });

        // Append image if selected
        if (selectedFile) {
            data.append('image', selectedFile);
        } else if (editingProduct && formData.P_IMAGE) {
            data.append('P_IMAGE', formData.P_IMAGE);
        }

        try {
            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };

            if (editingProduct) {
                await api.put(`/product/items/${editingProduct.P_ID}`, data, config);
                showNotification('Product updated successfully', 'success');
            } else {
                await api.post('/product/items', data, config);
                showNotification('Product created successfully', 'success');
            }
            setIsModalOpen(false);
            fetchInitialData();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Error saving product', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this product?')) {
            setDeletingId(id);
            try {
                await api.delete(`/product/items/${id}`);
                showNotification('Product deactivated', 'success');
                fetchInitialData();
            } catch (error) {
                showNotification('Error deleting product', 'error');
            } finally {
                setDeletingId(null);
            }
        }
    };
    const handleView = (product) => {
        setViewingProduct(product);
        setIsViewModalOpen(true);
    };

    const filteredProducts = products
        .filter(p =>
            p.P_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.P_CODE.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => (b.P_ID || 0) - (a.P_ID || 0));


    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('categorey');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB Limit
                showNotification('Image size should be less than 2MB', 'warning');
                return;
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, P_IMAGE: reader.result })); // Preview only
            };
            reader.readAsDataURL(file);
        }
    };

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-rose-500/5">
                    <AlertTriangle className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">You don't have the required permissions to manage Finished Goods.</p>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-700">
            <style>
                {`
                    @keyframes red-blink {
                        0%, 100% { background-color: rgba(239, 68, 68, 0.1); color: rgb(239, 68, 68); }
                        50% { background-color: rgba(239, 68, 68, 0.4); color: white; transform: scale(1.02); }
                    }
                    .low-stock-blink {
                        animation: red-blink 1s infinite;
                        font-weight: 900;
                    }
                `}
            </style>

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Product Master</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center text-sm">
                                Manage finished goods and production inventory
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-6 py-3.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl w-full md:w-80 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-8 py-5">Code & ID</th>
                               
                                <th className="px-8 py-5">Classification</th>
                                <th className="px-8 py-5">UoM</th>
                                <th className="px-8 py-5">Packaging</th>
                                 <th className="px-8 py-5 text-left">Stock Level</th>
                                <th className="px-8 py-5">Created By</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="px-8 py-24 text-center">
                                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Records...</p>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-8 py-24 text-center">
                                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <ShoppingCart className="w-10 h-10" />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No products found</p>
                                    </td>
                                </tr>
                            ) : filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
                                <tr key={p.P_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{p.P_ID}</span>
                                            <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{p.P_CODE}</div>
                                            <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[150px]" title={p.P_NAME}>{p.P_NAME}</div>
                                        </div>
                                    </td>
                                   
                                    <td className="px-8 py-6">
                                        <div className="space-y-2">
                                            <span className="inline-flex px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">{p.category_name}</span>
                                            <div className="text-[10px] text-slate-500 dark:text-white font-black uppercase tracking-widest flex items-center">
                                                <Layers className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                                                {p.sub_category_name || 'General'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-[10px] font-black text-slate-700 dark:text-white uppercase tracking-widest">
                                        <div className="space-y-1">
                                            <span className="flex items-center italic">
                                                <Ruler className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                                                {p.P_UNIT}
                                            </span>
                                            {Number(p.P_UNIT_MEASURE_SIZE || 1) > 1 && (
                                                <div className="mt-1">
                                                    <span className="inline-flex px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 lowercase tracking-normal">Size: {p.P_UNIT_MEASURE_SIZE}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${p.P_PACK_OR_SINGLE === 'Pack' ? 'bg-purple-500/10 text-purple-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                {p.P_PACK_OR_SINGLE}
                                            </span>
                                            {p.P_PACK_OR_SINGLE === 'Pack' && (
                                                <div className="text-[10px] text-slate-500 dark:text-white font-black uppercase">Qty: {p.P_INSIDE_ITEM_COUNT}</div>
                                            )}
                                        </div>
                                    </td>

                                    <td className={`px-8 py-6 ${parseFloat(p.stock_balance) <= parseFloat(p.P_REORDER_LEVEL) ? '' : ''}`}>
                                        <div className="flex flex-col">
                                            <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all ${parseFloat(p.stock_balance) <= parseFloat(p.P_REORDER_LEVEL) ? 'low-stock-blink' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                                {parseFloat(p.stock_balance) <= parseFloat(p.P_REORDER_LEVEL) && <span className="mr-1.5">⚠️</span>}
                                                {parseFloat(p.stock_balance).toLocaleString()}
                                            </div>
                                            <div className="flex items-center space-x-1 mt-1 ml-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${parseFloat(p.stock_balance) <= parseFloat(p.P_REORDER_LEVEL) ? 'text-red-700' : 'text-slate-500'}`}>Limit: {p.P_REORDER_LEVEL}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight">{p.P_CREATED_BY || 'Admin'}</span>
                                            <span className="text-[10px] font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">{new Date(p.P_CREATED_DATE).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => handleView(p)}
                                                className="p-3 text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all shadow-sm"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(p)}
                                                className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"
                                                title="Edit Product"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.P_ID)}
                                                disabled={deletingId === p.P_ID}
                                                className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                title="Deactivate"
                                            >
                                                {deletingId === p.P_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredProducts.length > itemsPerPage && (
                    <div className="px-10 py-6 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredProducts.length, currentPage * itemsPerPage)} of {filteredProducts.length} products
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
                                {[...Array(Math.ceil(filteredProducts.length / itemsPerPage))].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                disabled={currentPage === Math.ceil(filteredProducts.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredProducts.length / itemsPerPage), prev + 1))}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
                        >
                            {/* Modal Header */}
                            <div className="px-10 py-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <div className="flex items-center space-x-5">
                                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-600/30">
                                        {editingProduct ? <Edit2 className="w-7 h-7" /> : <Plus className="w-7 h-7" />}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{editingProduct ? 'Edit Product' : 'Register New Finished Good'}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight">Configure master data for retail and production items.</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="text-right mr-4 px-4 py-2 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Code</div>
                                        <div className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{formData.P_CODE}</div>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-sm transition-all"><X className="w-6 h-6" /></button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <form onSubmit={handleSave} className="space-y-10">
                                    {/* Primary Info Section */}
                                    <section className="space-y-6">
                                        <div className="flex items-center space-x-2 text-blue-600 font-black uppercase text-[10px] tracking-[0.2em]">
                                            <Info className="w-4 h-4" />
                                            <span>Identification & Brand</span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Product Name (English)</label>
                                                <input
                                                    required type="text" value={formData.P_NAME}
                                                    maxLength={50}
                                                    onChange={(e) => setFormData({ ...formData, P_NAME: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold"
                                                    placeholder="e.g. Chocolate Cake"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-blue-500 uppercase tracking-wider ml-1 font-black">Product Name (Sinhala)</label>
                                                <input
                                                    type="text"
                                                    value={formData.P_NAME_SINAHAL || ''}
                                                    maxLength={100}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        // Allow Sinhala characters, spaces, and joiners (ZWJ/ZWNJ)
                                                        const sinhalaRegex = /^[\u0D80-\u0DFF\s\u200C\u200D]*$/;
                                                        if (sinhalaRegex.test(val)) {
                                                            setFormData({ ...formData, P_NAME_SINAHAL: val });
                                                        }
                                                    }}
                                                    className="w-full bg-blue-50/30 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold"
                                                    placeholder="සිංහල නම..."
                                                />
                                            </div>

                                        </div>


                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Details</label>
                                                <span className={`text-[10px] font-bold ${formData.P_DETAILS?.length >= 100 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                    {formData.P_DETAILS?.length || 0}/100
                                                </span>
                                            </div>
                                            <input
                                                type="text" value={formData.P_DETAILS || ''}
                                                maxLength={50}
                                                onChange={(e) => setFormData({ ...formData, P_DETAILS: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold"
                                                placeholder="Short description..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Product Barcode</label>
                                            <input
                                                type="text" value={formData.actual_barcode || ''}
                                                onChange={(e) => setFormData({ ...formData, actual_barcode: e.target.value })}
                                                className="w-full bg-white dark:bg-[#0f172a] border border-blue-500/30 dark:border-blue-500/20 rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                                placeholder="Type barcode..."
                                            />

                                        </div>


                                        <div className="space-y-4">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Product Display Image</label>
                                            <div className="flex items-center space-x-6">
                                                <div className="relative group">
                                                    <div className="w-32 h-32 bg-slate-100 dark:bg-[#0f172a] rounded-3xl border-2 border-dashed border-slate-300 dark:border-[#334155] flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500/50">
                                                        {formData.P_IMAGE ? (
                                                            <img
                                                                src={formData.P_IMAGE.startsWith('data:') ? formData.P_IMAGE : `${API_URL}${formData.P_IMAGE}`}
                                                                alt="Preview"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                                                        )}
                                                    </div>
                                                    {formData.P_IMAGE && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({ ...formData, P_IMAGE: '' });
                                                                setSelectedFile(null);
                                                            }}
                                                            className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-xl shadow-lg hover:bg-rose-600 transition-all"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                        id="product-image-upload"
                                                        className="hidden"
                                                    />
                                                    <label
                                                        htmlFor="product-image-upload"
                                                        className="inline-flex items-center px-6 py-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-white font-bold rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0f172a] transition-all shadow-sm"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2 text-blue-500" />
                                                        Choose File
                                                    </label>
                                                    <p className="text-[10px] text-slate-500 font-medium">JPG, PNG or WEBP. Max size 2MB.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Category</label>
                                                <SearchableSelect
                                                    options={categories.map(c => ({ value: c.C_ID, label: c.C_NAME }))}
                                                    value={formData.P_CAT_ID}
                                                    onChange={(val) => setFormData({ ...formData, P_CAT_ID: val })}
                                                    placeholder="Select Classification"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Sub Category</label>
                                                <SearchableSelect
                                                    options={subCategories.filter(sc => String(sc.SC_CATEGORY_ID) === String(formData.P_CAT_ID)).map(sc => ({ value: sc.SC_ID, label: sc.SC_NAME }))}
                                                    value={formData.P_SUB_CAT_ID}
                                                    onChange={(val) => setFormData({ ...formData, P_SUB_CAT_ID: val })}
                                                    placeholder="Select Sub-Type"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Inventory Control Section */}
                                    <section className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center space-x-2 text-emerald-600 font-black uppercase text-[10px] tracking-[0.2em]">
                                            <BarChart className="w-4 h-4" />
                                            <span>Inventory & Thresholds</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Unit of Measure</label>
                                                <SearchableSelect
                                                    options={units}
                                                    value={formData.P_UNIT}
                                                    onChange={(val) => setFormData({ ...formData, P_UNIT: val })}
                                                    placeholder="Select Unit"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 text-indigo-500">Unit Measure Size</label>
                                                <input
                                                    type="number" min="1" value={formData.P_UNIT_MEASURE_SIZE}
                                                    onChange={(e) => setFormData({ ...formData, P_UNIT_MEASURE_SIZE: e.target.value })}
                                                    onKeyDown={handleNumericKeyDown}
                                                    placeholder="1"
                                                    className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 text-amber-500">Reorder Level</label>
                                                <input
                                                    type="number" min="0" value={formData.P_REORDER_LEVEL}
                                                    onChange={(e) => setFormData({ ...formData, P_REORDER_LEVEL: e.target.value })}
                                                    onKeyDown={handleNumericKeyDown}
                                                    placeholder="0.00"
                                                    className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 text-rose-500">Min Level</label>
                                                <input
                                                    type="number" min="0" value={formData.P_MINIMUM_LEVEL}
                                                    onChange={(e) => setFormData({ ...formData, P_MINIMUM_LEVEL: e.target.value })}
                                                    onKeyDown={handleNumericKeyDown}
                                                    placeholder="0.00"
                                                    className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 text-blue-500">Max Level</label>
                                                <input
                                                    type="number" min="0" value={formData.P_MAXIMUM_LEVEL}
                                                    onChange={(e) => setFormData({ ...formData, P_MAXIMUM_LEVEL: e.target.value })}
                                                    onKeyDown={handleNumericKeyDown}
                                                    placeholder="0.00"
                                                    className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Advanced Configuration Section */}
                                    <section className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center space-x-2 text-purple-600 font-black uppercase text-[10px] tracking-[0.2em]">
                                            <Layers className="w-4 h-4" />
                                            <span>Packaging & Shelf-Life</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Type</label>
                                                <select value={formData.P_PACK_OR_SINGLE} onChange={(e) => setFormData({ ...formData, P_PACK_OR_SINGLE: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none">
                                                    {PACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>

                                            {formData.P_PACK_OR_SINGLE !== 'Single' && (
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Inside Count</label>
                                                    <input
                                                        type="number" min="0"
                                                        value={formData.P_INSIDE_ITEM_COUNT}
                                                        onChange={(e) => setFormData({ ...formData, P_INSIDE_ITEM_COUNT: e.target.value })}
                                                        onKeyDown={handleNumericKeyDown}
                                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                                                        placeholder="e.g. 12"
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Storage Days</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="number" min="0" value={formData.P_ITEM_STORED_DAYS}
                                                        onChange={(e) => setFormData({ ...formData, P_ITEM_STORED_DAYS: e.target.value })}
                                                        onKeyDown={handleNumericKeyDown}
                                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 pl-12 pr-6 text-slate-800 dark:text-white outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Issue Bag</label>
                                                <select
                                                    value={formData.P_ISSUE_BAG_status}
                                                    onChange={(e) => setFormData({ ...formData, P_ISSUE_BAG_status: Number(e.target.value) })}
                                                    className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                                                >
                                                    <option value={1}>Yes</option>
                                                    <option value={0}>No</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="flex gap-6 pt-6 sticky bottom-0 bg-white dark:bg-[#1e293b] py-6 border-t border-slate-100 dark:border-slate-800">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-widest rounded-3xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Close</button>
                                        <button
                                            type="submit" disabled={isSaving}
                                            className="flex-[2] py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-[0.2em] rounded-3xl shadow-2xl shadow-blue-600/30 flex items-center justify-center space-x-3 transition-all active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            <span>{isSaving ? 'Processing...' : (editingProduct ? 'Commit Updates' : 'Authorize & Save')}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* View Details Modal */}
            <AnimatePresence>
                {isViewModalOpen && viewingProduct && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsViewModalOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="px-10 py-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between bg-blue-50/50 dark:bg-[#0f172a]/50">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                                        <ShoppingCart className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Product Master Details</h3>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{viewingProduct.P_CODE} • ID #{viewingProduct.P_ID}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsViewModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="flex space-x-8">
                                    <div className="w-40 h-40 bg-slate-100 dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-[#334155] flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {viewingProduct.P_IMAGE ? (
                                            <img src={`${API_URL}${viewingProduct.P_IMAGE}`} alt={viewingProduct.P_NAME} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-12 h-12 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Identity</p>
                                            <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-none">{viewingProduct.P_NAME}</h4>
                                            <p className="text-slate-500 dark:text-[#94a3b8] mt-2 font-medium">{viewingProduct.P_DETAILS || 'No additional details provided.'}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20">{viewingProduct.category_name}</span>
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">{viewingProduct.sub_category_name || 'General'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Unit</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-white uppercase tracking-tight">{viewingProduct.P_UNIT}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Measure Size</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-white tracking-tight">{viewingProduct.P_UNIT_MEASURE_SIZE || 1}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Barcode</p>
                                        <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{viewingProduct.P_BARCODE_NO || '---'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Packaging</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-white">{viewingProduct.P_PACK_OR_SINGLE} {viewingProduct.P_PACK_OR_SINGLE === 'Pack' ? `(${viewingProduct.P_INSIDE_ITEM_COUNT})` : ''}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Reorder Point</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tighter">{viewingProduct.P_REORDER_LEVEL}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Minimum Stock</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tighter">{viewingProduct.P_MINIMUM_LEVEL}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Maximum Stock</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tighter">{viewingProduct.P_MAXIMUM_LEVEL}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shelf Life</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-white">{viewingProduct.P_ITEM_STORED_DAYS} Days</p>
                                    </div>
                                    <div className="space-y-1 text-right col-span-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trail</p>
                                        <p className="text-[11px] font-bold text-slate-500">Created by {viewingProduct.P_CREATED_BY || 'Admin'} on {new Date(viewingProduct.P_CREATED_DATE).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-transparent">
                                <button onClick={() => setIsViewModalOpen(false)} className="w-full py-4 bg-slate-800 dark:bg-slate-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-700 transition-all">Close Entry</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductManagement;
