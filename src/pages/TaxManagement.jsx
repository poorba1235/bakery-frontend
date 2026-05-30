import { AnimatePresence, motion } from 'framer-motion';
import { Edit2, Loader2, Plus, Save, Search, Trash2, X, Receipt, Calendar, Percent, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const TaxManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [taxes, setTaxes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTax, setEditingTax] = useState(null);
    const [formData, setFormData] = useState({
        TX_CODE: '',
        TX_NAME: '',
        TX_TYPE: 0,
        TX_EFFECTIVE_DATE: new Date().toISOString().split('T')[0],
        TX_APPLICABLE_AMOUNT: 0,
        TX_APPLY_SVAT: 0,
        TR_TAX_PERCENTAGE: 0
    });

    // Auth Check
    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('tax');

    useEffect(() => {
        fetchTaxes();
    }, []);

    const fetchTaxes = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/tax');
            setTaxes(response.data);
        } catch (error) {
            console.error('Failed to fetch taxes', error);
            showNotification('Failed to load taxes', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingTax) {
                await api.put(`/tax/${editingTax.TX_ID}`, formData);
                showNotification('Tax updated successfully', 'success');
            } else {
                await api.post('/tax', formData);
                showNotification('Tax added successfully', 'success');
            }
            await fetchTaxes();
            setIsModalOpen(false);
            setEditingTax(null);
            resetForm();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to save tax';
            showNotification(errorMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this tax?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/tax/${id}`);
            await fetchTaxes();
            showNotification('Tax deactivated', 'success');
        } catch (error) {
            showNotification('Failed to deactivate tax', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            TX_CODE: '',
            TX_NAME: '',
            TX_TYPE: 0,
            TX_EFFECTIVE_DATE: new Date().toISOString().split('T')[0],
            TX_APPLICABLE_AMOUNT: 0,
            TX_APPLY_SVAT: 0,
            TR_TAX_PERCENTAGE: 0
        });
    };

    const handleAddClick = () => {
        resetForm();
        setEditingTax(null);
        setIsModalOpen(true);
    };

    const openEdit = (tax) => {
        setEditingTax(tax);
        setFormData({
            TX_CODE: tax.TX_CODE,
            TX_NAME: tax.TX_NAME,
            TX_TYPE: tax.TX_TYPE,
            TX_EFFECTIVE_DATE: tax.TX_EFFECTIVE_DATE ? tax.TX_EFFECTIVE_DATE.split('T')[0] : '',
            TX_APPLICABLE_AMOUNT: tax.TX_APPLICABLE_AMOUNT,
            TX_APPLY_SVAT: tax.TX_APPLY_SVAT,
            TR_TAX_PERCENTAGE: tax.TR_TAX_PERCENTAGE
        });
        setIsModalOpen(true);
    };

    const filteredTaxes = taxes
        .filter(t => 
            (t.TX_NAME && t.TX_NAME.toLowerCase().includes(searchTerm.toLowerCase())) || 
            (t.TX_CODE && t.TX_CODE.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => b.TX_ID - a.TX_ID);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Receipt className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Access Denied</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">You do not have the required permissions to manage taxes.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Tax Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Maintain tax rates and configurations.</p>
                </div>
                <button
                    onClick={handleAddClick}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add New Tax</span>
                </button>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search taxes by name or code..."
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
                                <th className="px-6 py-4">Tax Details</th>
                                <th className="px-6 py-4">Tax Type</th>
                                <th className="px-6 py-4">Effective Date</th>
                                <th className="px-6 py-4">SVAT</th>
                                <th className="px-6 py-4">Created By</th>
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
                            ) : filteredTaxes.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">No taxes found.</td>
                                </tr>
                            ) : filteredTaxes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((tax) => (
                                <tr key={tax.TX_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{tax.TX_ID}</span>
                                            <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{tax.TX_CODE}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">{tax.TX_NAME}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${tax.TX_TYPE === 0 ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'}`}>
                                            {tax.TX_TYPE === 0 ? 'Sales' : 'Purchase'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-white text-[11px] font-bold tracking-tight">
                                        {tax.TX_EFFECTIVE_DATE ? new Date(tax.TX_EFFECTIVE_DATE).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {tax.TX_APPLY_SVAT === 1 ? (
                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">SVAT Applied</span>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Standard</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-white">{tax.TX_CREATED_BY || 'System'}</span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{tax.TX_CREATED_DATE ? new Date(tax.TX_CREATED_DATE).toLocaleDateString() : '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button onClick={() => openEdit(tax)} className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(tax.TX_ID)} 
                                                disabled={deletingId === tax.TX_ID}
                                                className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {deletingId === tax.TX_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredTaxes.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredTaxes.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredTaxes.length, currentPage * itemsPerPage)} of {filteredTaxes.length} taxes
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
                                {[...Array(Math.ceil(filteredTaxes.length / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil(filteredTaxes.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTaxes.length / itemsPerPage), prev + 1))}
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
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-xl bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    <Receipt className="mr-2 text-blue-500" />
                                    {editingTax ? 'Edit Tax Configuration' : 'Add New Tax'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax Name</label>
                                        <input type="text" required maxLength={50} value={formData.TX_NAME} onChange={(e) => setFormData({ ...formData, TX_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" placeholder="e.g. VAT 15%" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax Type</label>
                                        <select value={formData.TX_TYPE} onChange={(e) => setFormData({ ...formData, TX_TYPE: parseInt(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
                                            <option value={0}>Sales Tax</option>
                                            <option value={1}>Purchase Tax</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center"><Calendar className="w-4 h-4 mr-1" /> Effective Date</label>
                                        <input type="date" required value={formData.TX_EFFECTIVE_DATE} onChange={(e) => setFormData({ ...formData, TX_EFFECTIVE_DATE: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 pt-2 bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-[#334155]">
                                    <input type="checkbox" id="svat" checked={formData.TX_APPLY_SVAT === 1} onChange={(e) => setFormData({ ...formData, TX_APPLY_SVAT: e.target.checked ? 1 : 0 })} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all" />
                                    <label htmlFor="svat" className="text-sm font-bold text-slate-700 dark:text-[#94a3b8] uppercase tracking-wider">Apply SVAT Exception</label>
                                </div>
                                <div className="flex gap-4 pt-6 sticky bottom-0 bg-white dark:bg-[#1e293b]">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 bg-slate-100 dark:bg-[#334155] text-slate-700 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-[#404e63] transition-all">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        <span>{isSaving ? 'Processing...' : (editingTax ? 'Update Tax Configuration' : 'Save Tax Profile')}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TaxManagement;
