import { AnimatePresence, motion } from 'framer-motion';
import { Edit2, FlaskConical, Loader2, Package, Plus, Ruler, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const RawMaterialItem = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [materials, setMaterials] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [viewingStock, setViewingStock] = useState(null);
    const [stockDetails, setStockDetails] = useState([]);
    const [isStockLoading, setIsStockLoading] = useState(false);
    const [newMaterial, setNewMaterial] = useState({
        RM_NAME: '',
        RM_NAME_SINHALA: '',
        RM_CATEGORY_ID: '',
        RM_UNIT: '',
        RM_REORDER_LEVEL: 0,
        RM_MIN_QTY: 0,
        RM_MAX_QTY: 0,
        RM_REMARKS: '',
        RM_MATERIAL_TYPE: 'Standard'
    });

    // Auth Check
    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('raw-material');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [matRes, catRes, unitRes] = await Promise.all([
                api.get('/raw-material'),
                api.get('/raw-material/categories'),
                api.get('/product/units')
            ]);
            setMaterials(matRes.data);
            setCategories(catRes.data);
            // Ensure Bag/Non Bag are NOT selectable in the dropdown
            setUnits((unitRes.data || []).filter(u => u.value !== 'BAG' && u.value !== 'NOT BAG'));

            if (catRes.data.length > 0 && !newMaterial.RM_CATEGORY_ID) {
                setNewMaterial(prev => ({ ...prev, RM_CATEGORY_ID: catRes.data[0].CAT_ID }));
            }
            if (unitRes.data.length > 0 && !newMaterial.RM_UNIT) {
                setNewMaterial(prev => ({ ...prev, RM_UNIT: unitRes.data[0].value }));
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
            showNotification('Failed to load data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddClick = () => {
        setEditingMaterial(null);
        setNewMaterial({
            RM_NAME: '',
            RM_NAME_SINHALA: '',
            RM_CATEGORY_ID: categories[0]?.CAT_ID || '',
            RM_UNIT: 'KG',
            RM_REORDER_LEVEL: 0,
            RM_MIN_QTY: 0,
            RM_MAX_QTY: 0,
            RM_REMARKS: '',
            RM_MATERIAL_TYPE: 'Standard'
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingMaterial) {
                await api.put(`/raw-material/${editingMaterial.RM_ID}`, editingMaterial);
                showNotification('Raw material updated successfully', 'success');
            } else {
                await api.post('/raw-material', newMaterial);
                showNotification('Raw material added successfully', 'success');
            }
            await fetchData();
            setIsModalOpen(false);
            setEditingMaterial(null);
            setNewMaterial({
                RM_NAME: '',
                RM_NAME_SINHALA: '',
                RM_CATEGORY_ID: categories[0]?.CAT_ID || '',
                RM_UNIT: units[0]?.value || '',
                RM_REORDER_LEVEL: 0,
                RM_MIN_QTY: 0,
                RM_MAX_QTY: 0,
                RM_REMARKS: '',
                RM_MATERIAL_TYPE: 'Standard'
            });
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to save raw material';
            showNotification(errorMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const fetchStock = async (id) => {
        setIsStockLoading(true);
        try {
            const response = await api.get(`/raw-material/stock/${id}`);
            setStockDetails(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            showNotification('Failed to load stock details', 'error');
        } finally {
            setIsStockLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this raw material?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/raw-material/${id}`);
            await fetchData();
            showNotification('Raw material deactivated', 'success');
        } catch (error) {
            showNotification('Failed to deactivate raw material', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredMaterials = materials
        .filter(m =>
            m.RM_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.RM_CODE.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.RM_ID - a.RM_ID);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <FlaskConical className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">You do not have the required permissions to manage raw materials.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 animate-in fade-in duration-700">
            <style>
                {`
                    @keyframes red-blink {
                        0%, 100% { background-color: rgba(239, 68, 68, 0.1); color: rgb(239, 68, 68); }
                        50% { background-color: rgba(239, 68, 68, 0.4); color: white; transform: scale(1.05); }
                    }
                    .low-stock-blink {
                        animation: red-blink 1s infinite;
                        font-weight: 900;
                    }
                `}
            </style>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Raw Materials</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Manage the list of raw materials and ingredients.</p>
                </div>
                <button
                    onClick={handleAddClick}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Raw Material</span>
                </button>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search materials by name, code or category..."
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
                                <th className="px-6 py-4">Code & ID</th>
                                <th className="px-6 py-4">Material Details</th>
                                <th className="px-6 py-4">Classification</th>
                                <th className="px-6 py-4">UoM</th>
                                <th className="px-6 py-4">Created Details</th>
                                <th className="px-6 py-4 text-xs font-black">Stock Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading data...
                                    </td>
                                </tr>
                            ) : filteredMaterials.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">No results found.</td>
                                </tr>
                            ) : filteredMaterials.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                                <tr key={item.RM_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold font-mono">#{item.RM_ID}</span>
                                            <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{item.RM_CODE}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-800 dark:text-white font-bold text-sm tracking-tight">{item.RM_NAME}</div>
                                        <div className="text-blue-500 font-bold text-[11px] mb-1">{item.RM_NAME_SINHALA || '---'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20">
                                            {item.category_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 dark:text-white font-bold text-sm italic">{item.RM_UNIT}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-white">{item.RM_ENTERED_BY || 'System'}</span>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{item.RM_ENTERED_DATE ? new Date(item.RM_ENTERED_DATE).toLocaleDateString() : '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all ${parseFloat(item.total_stock || 0) <= parseFloat(item.RM_MIN_QTY || 0) ? 'low-stock-blink' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                            {parseFloat(item.total_stock || 0) <= parseFloat(item.RM_MIN_QTY || 0) && <span className="mr-1.5">⚠️</span>}
                                            {parseFloat(item.total_stock || 0).toFixed(2)} <span className="text-sm ml-1 opacity-60 uppercase">{item.RM_UNIT}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => { setViewingStock(item); fetchStock(item.RM_ID); }}
                                                className="p-3 text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all shadow-sm"
                                                title="View Stock Details"
                                            >
                                                <Package className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setEditingMaterial(item); setIsModalOpen(true); }}
                                                className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.RM_ID)}
                                                disabled={deletingId === item.RM_ID}
                                                className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {deletingId === item.RM_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredMaterials.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredMaterials.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredMaterials.length, currentPage * itemsPerPage)} of {filteredMaterials.length} items
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex items-center space-x-1">
                                {[...Array(Math.ceil(filteredMaterials.length / itemsPerPage))].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                disabled={currentPage === Math.ceil(filteredMaterials.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredMaterials.length / itemsPerPage), prev + 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    {editingMaterial ? <Package className="mr-2 text-blue-500" /> : <Plus className="mr-2 text-blue-500" />}
                                    {editingMaterial ? 'Edit Raw Material' : 'Add New Raw Material'}
                                </h3>
                                <button onClick={() => { setIsModalOpen(false); setEditingMaterial(null); }} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center"><Package className="w-4 h-4 mr-1 text-blue-500" /> Material Name (EN)</label>
                                        <input type="text" required maxLength={50} value={editingMaterial ? editingMaterial.RM_NAME : newMaterial.RM_NAME} onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, RM_NAME: e.target.value }) : setNewMaterial({ ...newMaterial, RM_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" placeholder="e.g. Wheat Flour" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center"><Package className="w-4 h-4 mr-1 text-blue-500" /> Material Name (SI)</label>
                                        <input
                                            type="text"
                                            maxLength={100}
                                            value={editingMaterial ? (editingMaterial.RM_NAME_SINHALA || '') : newMaterial.RM_NAME_SINHALA}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                editingMaterial 
                                                    ? setEditingMaterial({ ...editingMaterial, RM_NAME_SINHALA: val }) 
                                                    : setNewMaterial({ ...newMaterial, RM_NAME_SINHALA: val });
                                            }}
                                            className="w-full bg-blue-50/30 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                            placeholder="සිංහල නම..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                                        <SearchableSelect
                                            options={categories.map(cat => ({ value: cat.CAT_ID, label: cat.CAT_NAME }))}
                                            value={editingMaterial ? editingMaterial.RM_CATEGORY_ID : newMaterial.RM_CATEGORY_ID}
                                            onChange={(val) => editingMaterial ? setEditingMaterial({ ...editingMaterial, RM_CATEGORY_ID: val }) : setNewMaterial({ ...newMaterial, RM_CATEGORY_ID: val })}
                                            placeholder="Search Category..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center"><Ruler className="w-4 h-4 mr-1 text-emerald-500" /> Unit of Measure</label>
                                        <select required value={editingMaterial ? editingMaterial.RM_UNIT : newMaterial.RM_UNIT} onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, RM_UNIT: e.target.value }) : setNewMaterial({ ...newMaterial, RM_UNIT: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                            {units.map(unit => (
                                                <option key={unit.value} value={unit.value}>{unit.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reorder Level</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                                            value={editingMaterial ? editingMaterial.RM_REORDER_LEVEL : newMaterial.RM_REORDER_LEVEL}
                                            onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, RM_REORDER_LEVEL: e.target.value }) : setNewMaterial({ ...newMaterial, RM_REORDER_LEVEL: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min Qty</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                                            value={editingMaterial ? editingMaterial.RM_MIN_QTY : newMaterial.RM_MIN_QTY}
                                            onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, RM_MIN_QTY: e.target.value }) : setNewMaterial({ ...newMaterial, RM_MIN_QTY: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Qty</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                                            value={editingMaterial ? editingMaterial.RM_MAX_QTY : newMaterial.RM_MAX_QTY}
                                            onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, RM_MAX_QTY: e.target.value }) : setNewMaterial({ ...newMaterial, RM_MAX_QTY: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Material Type</label>
                                    <select value={editingMaterial ? editingMaterial.RM_MATERIAL_TYPE : newMaterial.RM_MATERIAL_TYPE} onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, RM_MATERIAL_TYPE: e.target.value }) : setNewMaterial({ ...newMaterial, RM_MATERIAL_TYPE: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                                        <option value="Standard">Standard Item</option>
                                        <option value="Perishable">Perishable / Fresh</option>
                                        <option value="Packaging">Packaging Material</option>
                                        <option value="Chemical">Chemical / Cleaning</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks / Storage Notes</label>
                                        <span className={`text-[10px] font-bold ${(editingMaterial ? editingMaterial.RM_REMARKS : newMaterial.RM_REMARKS).length >= 100 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {(editingMaterial ? editingMaterial.RM_REMARKS : newMaterial.RM_REMARKS).length}/100
                                        </span>
                                    </div>
                                    <textarea
                                        maxLength={100}
                                        value={editingMaterial ? editingMaterial.RM_REMARKS : newMaterial.RM_REMARKS}
                                        onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, RM_REMARKS: e.target.value }) : setNewMaterial({ ...newMaterial, RM_REMARKS: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all h-24 resize-none"
                                        placeholder="Enter any special handling or storage instructions..."
                                    />
                                </div>

                                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-[#1e293b]">
                                    <button type="button" onClick={() => { setIsModalOpen(false); setEditingMaterial(null); }} className="flex-1 px-6 py-4 bg-slate-100 dark:bg-[#0f172a] text-slate-600 dark:text-[#94a3b8] font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-[#334155] transition-all">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        <span>{isSaving ? 'Processing...' : (editingMaterial ? 'Update Material' : 'Save Material')}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Stock Details Modal */}
            <AnimatePresence>
                {viewingStock && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingStock(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" >
                            <div className="p-8 border-b border-slate-200 dark:border-[#334155] flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50 gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-1">
                                        <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg font-mono font-bold text-sm tracking-widest">{viewingStock.RM_CODE}</span>
                                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{viewingStock.RM_NAME}</h3>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium italic">Current Stock Availability & Batch Tracking</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl shadow-sm">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Stock Availability</span>
                                        <span className={`text-lg font-black ${stockDetails.reduce((sum, s) => sum + parseFloat(s.R_D_CURRENT_QTY || 0), 0) <= parseFloat(viewingStock?.RM_MIN_QTY || 0) ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
                                            {stockDetails.reduce((sum, s) => sum + parseFloat(s.R_D_CURRENT_QTY || 0), 0).toFixed(2)} <span className="text-xs uppercase text-slate-400">{viewingStock?.RM_UNIT}</span>
                                        </span>
                                    </div>
                                    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl shadow-sm">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Latest Cost</span>
                                        <span className="text-lg font-black text-emerald-500">
                                            Rs. {stockDetails.length > 0 ? parseFloat(stockDetails[0].R_D_PURCHASE_PRICE || 0).toFixed(2) : '0.00'}
                                        </span>
                                    </div>
                                    <button onClick={() => setViewingStock(null)} className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-white rounded-2xl transition-all shadow-sm ml-2"><X className="w-6 h-6" /></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {isStockLoading ? (
                                    <div className="py-20 text-center">
                                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 mb-4" />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Scanning Inventory...</p>
                                    </div>
                                ) : stockDetails.length === 0 ? (
                                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                        <Package className="w-16 h-16 mx-auto text-slate-300 mb-4 opacity-20" />
                                        <h4 className="text-xl font-bold text-slate-400">No active stock batches found</h4>
                                        <p className="text-slate-500">Please process a GRN to add stock for this material.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="grid grid-cols-6 px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <div className="col-span-1 text-center">Batch No</div>
                                            <div className="col-span-1 text-center">Location</div>
                                            <div className="col-span-1 text-center">Qty</div>
                                            <div className="col-span-1 text-center">Unit Price</div>
                                            <div className="col-span-1 text-center">Expiry Date</div>
                                            <div className="col-span-1 text-right">Ageing</div>
                                        </div>
                                        {stockDetails.map((stock, idx) => {
                                            const daysToExpiry = stock.R_D_EXP_DATE ? Math.ceil((new Date(stock.R_D_EXP_DATE) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                                            return (
                                                <div key={idx} className="grid grid-cols-6 items-center px-6 py-5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-500/50 transition-all group shadow-sm">
                                                    <div className="col-span-1 text-center font-mono font-bold text-indigo-500">{stock.RB_BATCH_NO}</div>
                                                    <div className="col-span-1 text-center font-semibold text-slate-700 dark:text-slate-300">{stock.location_name || 'Main'}</div>
                                                    <div className="col-span-1 text-center">
                                                        <span className="text-lg font-black text-slate-800 dark:text-white">{stock.R_D_CURRENT_QTY}</span>
                                                        <span className="ml-1 text-[10px] font-bold text-slate-400">{viewingStock.RM_UNIT}</span>
                                                    </div>
                                                    <div className="col-span-1 text-center font-mono font-bold text-emerald-500">Rs. {parseFloat(stock.R_D_PURCHASE_PRICE || 0).toFixed(2)}</div>
                                                    <div className="col-span-1 text-center text-xs font-bold text-slate-500">{stock.R_D_EXP_DATE ? new Date(stock.R_D_EXP_DATE).toLocaleDateString() : '-'}</div>
                                                    <div className="col-span-1 text-right">
                                                        {daysToExpiry !== null ? (
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${daysToExpiry < 7 ? 'bg-red-500 text-white' : daysToExpiry < 30 ? 'bg-amber-500 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                                {daysToExpiry < 0 ? 'Expired' : `${daysToExpiry} Days`}
                                                            </span>
                                                        ) : '-'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="p-8 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-between items-center">
                                <div className="flex space-x-12">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Stock</span>
                                        <div className="flex items-baseline space-x-2">
                                            <span className="text-2xl font-black text-indigo-500">{stockDetails.reduce((sum, s) => sum + parseFloat(s.R_D_CURRENT_QTY || 0), 0).toFixed(2)}</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase">{viewingStock.RM_UNIT}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-12">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Value (LKR)</span>
                                        <span className="text-2xl font-black text-emerald-500">
                                            Rs. {stockDetails.reduce((sum, s) => sum + (parseFloat(s.R_D_CURRENT_QTY || 0) * parseFloat(s.R_D_PURCHASE_PRICE || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-12">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Batches</span>
                                        <span className="text-2xl font-black text-slate-800 dark:text-white">{stockDetails.length}</span>
                                    </div>
                                </div>
                                <button onClick={() => setViewingStock(null)} className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl tracking-widest uppercase text-xs">Close Ledger</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RawMaterialItem;
