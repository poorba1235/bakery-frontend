import { AnimatePresence, motion } from 'framer-motion';
import { Edit2, Globe, Loader2, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const CountryManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [countries, setCountries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCountry, setEditingCountry] = useState(null);
    const [newCountry, setNewCountry] = useState({ C_NAME: '', C_CODE: '' });
    const [deletingId, setDeletingId] = useState(null);

    // Auth Check
    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('table-maintain');

    useEffect(() => {
        fetchCountries();
    }, []);

    const fetchCountries = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/maintain/countries');
            setCountries(response.data);
        } catch (error) {
            console.error('Failed to fetch countries', error);
            showNotification('Failed to load countries', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post('/maintain/countries', newCountry);
            await fetchCountries();
            setIsAddModalOpen(false);
            setNewCountry({ C_NAME: '', C_CODE: '' });
            showNotification('Country added successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to add country', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.put(`/maintain/countries/${editingCountry.C_ID}`, {
                C_NAME: editingCountry.C_NAME,
                C_CODE: editingCountry.C_CODE
            });
            await fetchCountries();
            setEditingCountry(null);
            showNotification('Country updated successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to update country', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this country?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/maintain/countries/${id}`);
            await fetchCountries();
            showNotification('Country deactivated', 'success');
        } catch (error) {
            showNotification('Failed to deactivate country', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredCountries = countries
        .filter(c => 
            c.C_NAME.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.C_CODE.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.C_ID - a.C_ID);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Globe className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">You do not have the required permissions to maintain tables.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Country Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Maintain the list of countries for the system.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Country</span>
                </button>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search countries..."
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
                                <th className="px-6 py-4">Country Name</th>
                                <th className="px-6 py-4">Created By</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading countries...
                                    </td>
                                </tr>
                            ) : filteredCountries.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No countries found.</td>
                                </tr>
                            ) : filteredCountries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((country) => (
                                <tr key={country.C_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold font-mono">#{country.C_ID}</span>
                                            <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{country.C_CODE}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">{country.C_NAME}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-white">{country.C_CREARED_BY || 'System'}</span>
                                            <span className="text-[10px] text-slate-500 font-bold">{country.C_CREATED_DATE ? new Date(country.C_CREATED_DATE).toLocaleDateString() : '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${parseInt(country.C_STATUS) === 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            {parseInt(country.C_STATUS) === 0 ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => setEditingCountry(country)}
                                                className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(country.C_ID)} 
                                                disabled={deletingId === country.C_ID}
                                                className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {deletingId === country.C_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredCountries.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredCountries.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredCountries.length, currentPage * itemsPerPage)} of {filteredCountries.length} items
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
                                {[...Array(Math.ceil(filteredCountries.length / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil(filteredCountries.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredCountries.length / itemsPerPage), prev + 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center"><Globe className="mr-2 text-blue-500" /> Add New Country</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 dark:text-[#64748b] hover:text-slate-800 dark:text-white"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleAdd} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Country Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        maxLength={50} 
                                        value={newCountry.C_NAME} 
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            let code = '';
                                            if (name.trim()) {
                                                const words = name.trim().split(/\s+/).filter(w => w.length > 0);
                                                if (words.length > 1) {
                                                    code = words.map(word => word[0]).join('').toUpperCase();
                                                } else if (words[0].length >= 2) {
                                                    code = words[0].slice(0, 2).toUpperCase();
                                                } else {
                                                    code = words[0].toUpperCase();
                                                }
                                            }
                                            setNewCountry({ ...newCountry, C_NAME: name, C_CODE: code });
                                        }} 
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                                        placeholder="e.g. Sri Lanka" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Country Code (Auto)</label>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        maxLength={50} 
                                        value={newCountry.C_CODE} 
                                        className="w-full bg-slate-100 dark:bg-[#0f172a]/50 border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-500 dark:text-[#64748b] focus:outline-none cursor-not-allowed font-mono" 
                                        placeholder="Generated Code" 
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-200 dark:bg-[#334155] text-slate-800 dark:text-white font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-[#404e63]">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{isSaving ? 'Saving...' : 'Save Country'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingCountry && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingCountry(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center"><Edit2 className="mr-2 text-blue-500" /> Edit Country</h3>
                                <button onClick={() => setEditingCountry(null)} className="text-slate-500 dark:text-[#64748b] hover:text-slate-800 dark:text-white"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Country Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        maxLength={50} 
                                        value={editingCountry.C_NAME} 
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            let code = '';
                                            if (name.trim()) {
                                                const words = name.trim().split(/\s+/).filter(w => w.length > 0);
                                                if (words.length > 1) {
                                                    code = words.map(word => word[0]).join('').toUpperCase();
                                                } else if (words[0].length >= 2) {
                                                    code = words[0].slice(0, 2).toUpperCase();
                                                } else {
                                                    code = words[0].toUpperCase();
                                                }
                                            }
                                            setEditingCountry({ ...editingCountry, C_NAME: name, C_CODE: code });
                                        }} 
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Country Code (Auto)</label>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        maxLength={50} 
                                        value={editingCountry.C_CODE} 
                                        className="w-full bg-slate-100 dark:bg-[#0f172a]/50 border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-500 dark:text-[#64748b] focus:outline-none cursor-not-allowed font-mono" 
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setEditingCountry(null)} className="flex-1 px-6 py-3 bg-slate-200 dark:bg-[#334155] text-slate-800 dark:text-white font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-[#404e63]">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{isSaving ? 'Updating...' : 'Update Country'}</span>
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

export default CountryManagement;
