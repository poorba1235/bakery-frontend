import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Edit2,
    Loader2,
    Package,
    Plus,
    Scale,
    Search,
    Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const RawMaterials = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();

    const [activeTab, setActiveTab] = useState('materials');
    const [materials, setMaterials] = useState([]);
    const [packaging, setPackaging] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [matRes] = await Promise.all([
                api.get('/raw-material')
            ]);
            // For now, packaging is also part of raw materials but with a different category or property
            // Filter based on RM_MATERIAL_TYPE if available, otherwise just use materials
            setMaterials(matRes.data.filter(m => m.RM_MATERIAL_TYPE !== 'Packaging'));
            setPackaging(matRes.data.filter(m => m.RM_MATERIAL_TYPE === 'Packaging'));
        } catch (error) {
            showNotification('Failed to load raw materials', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredData = (activeTab === 'materials' ? materials : packaging)
        .filter(item =>
            item.RM_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.RM_CODE.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.RM_ID - a.RM_ID);

    return (
        <div className="p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-[#0f172a] animate-in fade-in duration-700">
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

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Raw Materials</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Manage ingredients and packaging stock levels</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search materials..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-6 py-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl w-full md:w-64 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Item</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-sm">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4"><Scale size={24} /></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Raw Materials</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{materials.length} Items</h3>
                </div>
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-sm">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 mb-4"><Package size={24} /></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Packaging</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{packaging.length} Types</h3>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-200 dark:bg-[#0f172a] rounded-2xl w-fit mb-6">
                <button onClick={() => setActiveTab('materials')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'materials' ? 'bg-white dark:bg-[#1e293b] text-blue-500 shadow-sm' : 'text-slate-500'}`}>Raw Materials</button>
                <button onClick={() => setActiveTab('packaging')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'packaging' ? 'bg-white dark:bg-[#1e293b] text-blue-500 shadow-sm' : 'text-slate-500'}`}>Packaging & Bags</button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5">Code & ID</th>
                                <th className="px-8 py-5">Material Details</th>
                                <th className="px-8 py-5">Stock Levels</th>
                                <th className="px-8 py-5">Pricing</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-blue-600" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Stock Data...</p>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-slate-400 italic font-bold">No materials found matching your search.</td>
                                </tr>
                            ) : filteredData.map((item) => {
                                const isLowStock = (item.total_stock || 0) <= (item.RM_REORDER_LEVEL || 0);
                                return (
                                    <tr key={item.RM_ID} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="space-y-1">
                                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold font-mono">#{item.RM_ID}</span>
                                                <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{item.RM_CODE}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-slate-800 dark:text-white font-black text-sm tracking-tight mb-1">{item.RM_NAME}</div>
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                                {item.category_name}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col space-y-2">
                                                <div className={`inline-flex items-center px-4 py-1.5 rounded-xl text-sm font-black w-fit transition-all ${isLowStock ? 'low-stock-blink shadow-lg shadow-red-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                                                    {isLowStock && <AlertTriangle className="w-3.5 h-3.5 mr-2" />}
                                                    {parseFloat(item.total_stock || 0).toFixed(2)} {item.RM_UNIT}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                                    Reorder: {parseFloat(item.RM_REORDER_LEVEL || 0).toFixed(2)} {item.RM_UNIT}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Unit Price</span>
                                                <span className="font-black text-slate-800 dark:text-white text-sm">Rs. {parseFloat(item.latest_cost || 0).toFixed(2)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"><Edit2 size={16} /></button>
                                                <button className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Demo */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-10 shadow-2xl text-center border border-slate-200 dark:border-slate-700"
                        >
                            <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                                <Plus size={40} />
                            </div>
                            <h3 className="text-3xl font-black mb-4 tracking-tight text-slate-800 dark:text-white">Register Item</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
                                Please use the dedicated "Raw Material Category" and "Purchase" modules to manage inventory records.
                                Manual registration is coming soon in the next update.
                            </p>
                            <button onClick={() => setShowModal(false)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-black py-4 rounded-2xl hover:bg-slate-200 transition-all">Understood</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RawMaterials;
