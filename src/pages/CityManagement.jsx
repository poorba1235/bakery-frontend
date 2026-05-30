import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Edit2, Loader2, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const CityManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [cities, setCities] = useState([]);
    const [countries, setCountries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCity, setEditingCity] = useState(null);
    const [newCity, setNewCity] = useState({ CC_NAME: '', CC_COUNTRY_ID: '', CC_CODE: '', CC_SEQ: 0 });
    const [deletingId, setDeletingId] = useState(null);

    // Auth Check
    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('table-maintain');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [countriesRes, citiesRes] = await Promise.all([
                api.get('/maintain/countries'),
                api.get('/maintain/cities')
            ]);
            
            setCountries(countriesRes.data);
            setCities(citiesRes.data);
            if (countriesRes.data.length > 0) {
                setNewCity(prev => ({ ...prev, CC_COUNTRY_ID: countriesRes.data[0].C_ID }));
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
            showNotification('Failed to load data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post('/maintain/cities', newCity);
            await fetchData();
            setIsAddModalOpen(false);
            setNewCity({ CC_NAME: '', CC_COUNTRY_ID: countries[0]?.C_ID || '', CC_CODE: '', CC_SEQ: 0 });
            showNotification('City added successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to add city', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.put(`/maintain/cities/${editingCity.CC_ID}`, {
                CC_NAME: editingCity.CC_NAME,
                CC_COUNTRY_ID: editingCity.CC_COUNTRY_ID,
                CC_CODE: editingCity.CC_CODE,
                CC_SEQ: editingCity.CC_SEQ
            });
            await fetchData();
            setEditingCity(null);
            showNotification('City updated successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to update city', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this city?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/maintain/cities/${id}`);
            await fetchData();
            showNotification('City deactivated successfully', 'success');
        } catch (error) {
            showNotification('Failed to deactivate city', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredCities = cities
        .filter(c => 
            c.CC_NAME.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.country_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.CC_ID - a.CC_ID);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Building2 className="w-10 h-10 text-red-500" />
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
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">City Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Maintain the list of cities and their associated countries.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add City</span>
                </button>
            </div>

               <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search cities or countries..."
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
                                <th className="px-6 py-4">City Name</th>
                                <th className="px-6 py-4">Country</th>
                                <th className="px-6 py-4">Created By</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading cities...
                                    </td>
                                </tr>
                            ) : filteredCities.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No cities found.</td>
                                </tr>
                            ) : filteredCities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((city) => (
                                <tr key={city.CC_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold font-mono">#{city.CC_ID}</span>
                                            <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{city.CC_CODE}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">{city.CC_NAME}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">
                                            {city.country_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-white">{city.CC_ENTERED_BY || 'System'}</span>
                                            <span className="text-[10px] text-slate-500 font-bold">{city.CC_ENTERED_DATE ? new Date(city.CC_ENTERED_DATE).toLocaleDateString() : '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${parseInt(city.CC_STATUS) === 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            {parseInt(city.CC_STATUS) === 0 ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => setEditingCity(city)}
                                                className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(city.CC_ID)} 
                                                disabled={deletingId === city.CC_ID}
                                                className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {deletingId === city.CC_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredCities.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredCities.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredCities.length, currentPage * itemsPerPage)} of {filteredCities.length} items
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
                                {[...Array(Math.ceil(filteredCities.length / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil(filteredCities.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredCities.length / itemsPerPage), prev + 1))}
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
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center"><Building2 className="mr-2 text-blue-500" /> Add New City</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 dark:text-[#64748b] hover:text-slate-800 dark:text-white"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleAdd} className="p-6 space-y-4">
                              
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Country</label>
                                    <select required value={newCity.CC_COUNTRY_ID} onChange={(e) => setNewCity({ ...newCity, CC_COUNTRY_ID: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                        {countries.map(country => (
                                            <option key={country.C_ID} value={country.C_ID}>{country.C_NAME}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">City Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        maxLength={50} 
                                        value={newCity.CC_NAME} 
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            const code = name.slice(0, 3).toUpperCase();
                                            setNewCity({ ...newCity, CC_NAME: name, CC_CODE: code });
                                        }} 
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                                        placeholder="e.g. Colombo" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">City Code (Auto)</label>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        maxLength={50} 
                                        value={newCity.CC_CODE} 
                                        className="w-full bg-slate-100 dark:bg-[#0f172a]/50 border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-500 dark:text-[#64748b] focus:outline-none cursor-not-allowed font-mono" 
                                        placeholder="Generated Code" 
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-200 dark:bg-[#334155] text-slate-800 dark:text-white font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-[#404e63]">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{isSaving ? 'Saving...' : 'Save City'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingCity && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingCity(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center"><Edit2 className="mr-2 text-blue-500" /> Edit City</h3>
                                <button onClick={() => setEditingCity(null)} className="text-slate-500 dark:text-[#64748b] hover:text-slate-800 dark:text-white"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Country</label>
                                    <select 
                                        required 
                                        value={editingCity.CC_COUNTRY_ID} 
                                        onChange={(e) => setEditingCity({ ...editingCity, CC_COUNTRY_ID: e.target.value })} 
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    >
                                        {countries.map(country => (
                                            <option key={country.C_ID} value={country.C_ID}>{country.C_NAME}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">City Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        maxLength={50} 
                                        value={editingCity.CC_NAME} 
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            const code = name.slice(0, 3).toUpperCase();
                                            setEditingCity({ ...editingCity, CC_NAME: name, CC_CODE: code });
                                        }} 
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">City Code (Auto)</label>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        maxLength={50} 
                                        value={editingCity.CC_CODE} 
                                        className="w-full bg-slate-100 dark:bg-[#0f172a]/50 border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-500 dark:text-[#64748b] focus:outline-none cursor-not-allowed font-mono" 
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setEditingCity(null)} className="flex-1 px-6 py-3 bg-slate-200 dark:bg-[#334155] text-slate-800 dark:text-white font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-[#404e63]">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{isSaving ? 'Updating...' : 'Update City'}</span>
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

export default CityManagement;
