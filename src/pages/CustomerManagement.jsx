import { AnimatePresence, motion } from 'framer-motion';
import {
    Edit2,
    Loader2,
    Plus,
    Search,
    ShieldAlert,
    Trash2,
    UserPlus,
    X,
    Phone,
    MapPin,
    FileText
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const CustomerManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [customers, setCustomers] = useState([]);
    const [salesReps, setSalesReps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        C_NAME: '',
        C_DETAILS: '',
        C_ADDRESS: '',
        C_MOBILE: '',
        SR_ID: '',
        C_STATUS: 1
    });

    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('table-maintain');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [custRes, repsRes] = await Promise.all([
                api.get('/customers'),
                api.get('/sales-rep')
            ]);
            setCustomers(custRes.data);
            setSalesReps(repsRes.data);
        } catch (error) {
            console.error('Fetch Data Error:', error);
            showNotification(`Failed to load data: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCustomer = () => {
        resetForm();
        setEditingCustomer(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.C_NAME || !formData.SR_ID) {
            showNotification('Name and Sales Rep are required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.C_ID}`, formData);
                showNotification('Customer updated successfully', 'success');
            } else {
                await api.post('/customers', formData);
                showNotification('Customer added successfully', 'success');
            }
            await fetchData();
            setIsModalOpen(false);
            setEditingCustomer(null);
            resetForm();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to save Customer', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCustomer = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Customer?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/customers/${id}`);
            showNotification('Customer deleted', 'success');
            await fetchData();
        } catch (error) {
            showNotification('Failed to delete', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            C_NAME: '',
            C_DETAILS: '',
            C_ADDRESS: '',
            C_MOBILE: '',
            SR_ID: '',
            C_STATUS: 1
        });
    };

    // Filtering & Pagination
    const getFilteredData = () => {
        let filtered = customers;
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = customers.filter(item =>
                (item.C_NAME || '').toLowerCase().includes(search) ||
                (item.C_MOBILE || '').toLowerCase().includes(search) ||
                (item.SR_NAME || '').toLowerCase().includes(search)
            );
        }
        return filtered;
    };

    const filteredData = getFilteredData();
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">Insufficient permissions to manage Customers.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Customer Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Manage shops and assign them to sales representatives.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAddCustomer}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span>Add Customer</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search by name, mobile, or sales rep..."
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
                                <th className="px-6 py-4 w-32">ID</th>
                                <th className="px-6 py-4">Customer Details</th>
                                <th className="px-6 py-4">Contact & Location</th>
                                <th className="px-6 py-4">Sales Rep</th>
                                <th className="px-6 py-4 text-right w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading data...
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No data found.</td>
                                </tr>
                            ) : paginatedData.map((item) => (
                                <tr key={item.C_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-sm font-bold text-slate-600 dark:text-slate-400">
                                        #{item.C_ID}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-800 dark:text-white font-black text-sm">{item.C_NAME}</div>
                                        {item.C_DETAILS && (
                                            <div className="text-xs text-slate-500 flex items-center mt-1">
                                                <FileText className="w-3 h-3 mr-1" />
                                                {item.C_DETAILS}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 space-y-1">
                                        <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                                            <Phone className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                                            {item.C_MOBILE || 'N/A'}
                                        </div>
                                        <div className="flex items-center text-xs text-slate-500">
                                            <MapPin className="w-3 h-3 mr-1.5" />
                                            <span className="truncate max-w-[200px]">{item.C_ADDRESS || 'No Address'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                            {item.SR_NAME || 'Unassigned'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button onClick={() => { setEditingCustomer(item); setFormData(item); setIsModalOpen(true); }} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all shadow-sm">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCustomer(item.C_ID)}
                                                disabled={deletingId === item.C_ID}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {deletingId === item.C_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredData.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex justify-between items-center">
                        <div className="text-xs text-slate-500 font-medium">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
                        </div>
                        <div className="flex space-x-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 rounded-md text-xs font-bold bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] text-slate-700 dark:text-slate-300 disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-3 py-1 rounded-md text-xs font-bold bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] text-slate-700 dark:text-slate-300 disabled:opacity-50"
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
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl flex flex-col">
                            <div className="p-6 border-b border-slate-200 dark:border-[#334155] flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                    {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Customer / Shop Name *</label>
                                    <input type="text" required value={formData.C_NAME} onChange={e => setFormData({ ...formData, C_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Assigned Sales Rep *</label>
                                    <select required value={formData.SR_ID} onChange={e => setFormData({ ...formData, SR_ID: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Select Sales Rep...</option>
                                        {salesReps.map(sr => (
                                            <option key={sr.SR_ID} value={sr.SR_ID}>{sr.SR_NAME} ({sr.SR_CODE})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile</label>
                                    <input type="text" value={formData.C_MOBILE} onChange={e => setFormData({ ...formData, C_MOBILE: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                                    <textarea rows={2} value={formData.C_ADDRESS} onChange={e => setFormData({ ...formData, C_ADDRESS: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Details (Optional)</label>
                                    <textarea rows={2} value={formData.C_DETAILS} onChange={e => setFormData({ ...formData, C_DETAILS: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar" />
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-[#334155]">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center">
                                        {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        Save Customer
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

export default CustomerManagement;