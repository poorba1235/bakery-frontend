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
    CreditCard
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const POSCustomerManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [customers, setCustomers] = useState([]);
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
        PC_NAME: '',
        PC_ADDRESS: '',
        PC_MOBILE: '',
        PC_CREDIT_LIMIT: 0,
        PC_STATUS: 1
    });

    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('table-maintain');

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/pos/customers');
            setCustomers(res.data);
        } catch (error) {
            console.error('Fetch POS Customers Error:', error);
            showNotification(`Failed to load POS customers: ${error.message}`, 'error');
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

        if (!formData.PC_NAME) {
            showNotification('Customer Name is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (editingCustomer) {
                await api.put(`/pos/customers/${editingCustomer.PC_ID}`, formData);
                showNotification('POS Customer updated successfully', 'success');
            } else {
                await api.post('/pos/customers', formData);
                showNotification('POS Customer added successfully', 'success');
            }
            await fetchCustomers();
            setIsModalOpen(false);
            setEditingCustomer(null);
            resetForm();
        } catch (error) {
            console.error('Save POS Customer Error:', error);
            showNotification(error.response?.data?.message || 'Failed to save customer', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCustomer = async (id) => {
        if (!window.confirm('Are you sure you want to delete this customer? This action will set their status to inactive.')) {
            return;
        }

        setDeletingId(id);
        try {
            await api.delete(`/pos/customers/${id}`);
            showNotification('POS Customer deleted successfully', 'success');
            await fetchCustomers();
        } catch (error) {
            console.error('Delete POS Customer Error:', error);
            showNotification(error.response?.data?.message || 'Failed to delete customer', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            PC_NAME: '',
            PC_ADDRESS: '',
            PC_MOBILE: '',
            PC_CREDIT_LIMIT: 0,
            PC_STATUS: 1
        });
    };

    // Filtering
    const filteredCustomers = customers.filter(c => 
        (c.PC_NAME && c.PC_NAME.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.PC_MOBILE && c.PC_MOBILE.includes(searchTerm)) ||
        (c.PC_ADDRESS && c.PC_ADDRESS.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/30 text-white">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        Storefront POS Customers
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage walk-in and credit accounts for the Storefront POS counter.</p>
                </div>
                {hasPermission && (
                    <button
                        onClick={handleAddCustomer}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 text-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add POS Customer
                    </button>
                )}
            </div>

            {/* Filter and Search */}
            <div className="bg-white dark:bg-[#1e293b] p-4 border border-slate-200 dark:border-[#334155] rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by customer name, mobile, or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl pl-10 pr-4 py-2 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold transition-all"
                    />
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-6 py-4 w-24">ID</th>
                                <th className="px-6 py-4">Customer Name</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Credit Limit</th>
                                <th className="px-6 py-4">Outstanding Bal.</th>
                                <th className="px-6 py-4 text-right w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading customer data...
                                    </td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-bold">No customers found.</td>
                                </tr>
                            ) : paginatedCustomers.map((item) => (
                                <tr key={item.PC_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors font-semibold text-slate-800 dark:text-slate-200">
                                    <td className="px-6 py-4 font-mono text-sm">
                                        #{item.PC_ID}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-800 dark:text-white font-black text-sm">{item.PC_NAME}</div>
                                    </td>
                                    <td className="px-6 py-4 space-y-1">
                                        <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                                            <Phone className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                                            {item.PC_MOBILE || 'N/A'}
                                        </div>
                                        <div className="flex items-center text-xs text-slate-500">
                                            <MapPin className="w-3 h-3 mr-1.5" />
                                            <span className="truncate max-w-[200px]">{item.PC_ADDRESS || 'No Address'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-black">
                                        Rs. {parseFloat(item.PC_CREDIT_LIMIT || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-black ${parseFloat(item.PC_CREDIT_BALANCE || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            Rs. {parseFloat(item.PC_CREDIT_BALANCE || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button 
                                                onClick={() => { setEditingCustomer(item); setFormData(item); setIsModalOpen(true); }}
                                                className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all shadow-sm"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCustomer(item.PC_ID)} 
                                                disabled={deletingId === item.PC_ID}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {deletingId === item.PC_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex justify-between items-center">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-all"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-all"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Dialog */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-300 dark:border-[#334155] shadow-2xl p-6 overflow-hidden"
                        >
                            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 dark:border-[#334155]">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    {editingCustomer ? 'Edit POS Customer' : 'Add POS Customer'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Name *</label>
                                    <input required type="text" value={formData.PC_NAME} onChange={e => setFormData({...formData, PC_NAME: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Phone</label>
                                    <input type="text" value={formData.PC_MOBILE} onChange={e => setFormData({...formData, PC_MOBILE: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                                    <textarea rows={2} value={formData.PC_ADDRESS} onChange={e => setFormData({...formData, PC_ADDRESS: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Credit Limit (LKR)</label>
                                    <input type="number" min="0" step="0.01" value={formData.PC_CREDIT_LIMIT} onChange={e => setFormData({...formData, PC_CREDIT_LIMIT: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
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

export default POSCustomerManagement;
