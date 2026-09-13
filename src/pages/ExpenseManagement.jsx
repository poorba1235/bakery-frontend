import { AnimatePresence, motion } from 'framer-motion';
import {
    DollarSign,
    Edit2,
    Filter,
    FolderPlus,
    Layers,
    Loader2,
    Plus,
    Receipt,
    Save,
    Search,
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const CATEGORIES = [
    'General',
    'Fuel & Transport',
    'Packaging',
    'Other'
];

const ExpenseManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();

    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [newExpense, setNewExpense] = useState({
        EXP_CODE: '',
        EXP_NAME: '',
        EXP_CATEGORY: 'General',
        EXP_AMOUNT: '',
        EXP_DESCRIPTION: ''
    });

    // Permission Check
    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('table-maintain');

    useEffect(() => {
        if (hasPermission) {
            fetchExpenses();
        }
    }, [hasPermission]);

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/maintain/expenses');
            setExpenses(response.data);
        } catch (error) {
            console.error('Failed to fetch expenses', error);
            showNotification('Failed to load expenses', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNextCode = async () => {
        try {
            const response = await api.get('/maintain/expenses/next-code');
            return response.data.code;
        } catch (error) {
            console.error('Failed to fetch next expense code', error);
            return 'EXP-0001';
        }
    };

    const handleOpenAddModal = async () => {
        const nextCode = await fetchNextCode();
        setNewExpense({
            EXP_CODE: nextCode,
            EXP_NAME: '',
            EXP_CATEGORY: 'General',
            EXP_AMOUNT: '',
            EXP_DESCRIPTION: ''
        });
        setIsAddModalOpen(true);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newExpense.EXP_NAME.trim()) {
            showNotification('Expense name is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/maintain/expenses', newExpense);
            showNotification('Expense created successfully', 'success');
            setIsAddModalOpen(false);
            fetchExpenses();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to add expense', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingExpense.EXP_NAME.trim()) {
            showNotification('Expense name is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await api.put(`/maintain/expenses/${editingExpense.EXP_ID}`, editingExpense);
            showNotification('Expense updated successfully', 'success');
            setEditingExpense(null);
            fetchExpenses();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to update expense', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this expense?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/maintain/expenses/${id}`);
            showNotification('Expense deactivated successfully', 'success');
            fetchExpenses();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to deactivate expense', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    // Filter and Search logic
    const filteredExpenses = expenses.filter(exp => {
        const matchesSearch =
            (exp.EXP_NAME && exp.EXP_NAME.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (exp.EXP_CODE && exp.EXP_CODE.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (exp.EXP_CATEGORY && exp.EXP_CATEGORY.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (exp.EXP_DESCRIPTION && exp.EXP_DESCRIPTION.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = categoryFilter === 'ALL' || exp.EXP_CATEGORY === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, categoryFilter]);

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Receipt className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">You do not have the required permissions to maintain expenses.</p>
            </div>
        );
    }

    const totalActiveCount = expenses.length;
    const uniqueCategoriesCount = new Set(expenses.map(e => e.EXP_CATEGORY)).size;
    const maxExpenseAmount = expenses.reduce((max, e) => Math.max(max, parseFloat(e.EXP_AMOUNT || 0)), 0);

    return (
        <div className="p-4 md:p-8">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-3">
                        <Receipt className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        Expense Management
                    </h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Maintain expense categories, codes, and standard rates.</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Expense</span>
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-300 dark:border-[#334155] shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Active Expenses</p>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">{totalActiveCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <Receipt className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-300 dark:border-[#334155] shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Categories</p>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">{uniqueCategoriesCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                        <Layers className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-300 dark:border-[#334155] shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Highest Default Cost</p>
                        <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            Rs. {maxExpenseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search by expense code, name, category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                    >
                        <option value="ALL">All Categories</option>
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-6 py-4">Code & ID</th>
                                <th className="px-6 py-4">Expense Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Default Amount</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Created By</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading expenses...
                                    </td>
                                </tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">No expenses found.</td>
                                </tr>
                            ) : (
                                filteredExpenses
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((exp) => (
                                        <tr key={exp.EXP_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold font-mono">
                                                        #{exp.EXP_ID}
                                                    </span>
                                                    <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">
                                                        {exp.EXP_CODE}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">
                                                {exp.EXP_NAME}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                                    {exp.EXP_CATEGORY || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-white text-sm">
                                                Rs. {parseFloat(exp.EXP_AMOUNT || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-600 dark:text-[#94a3b8] max-w-xs truncate">
                                                {exp.EXP_DESCRIPTION || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-white">
                                                        {exp.EXP_CREATED_BY || 'System'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-bold">
                                                        {exp.EXP_CREATED_DATE ? new Date(exp.EXP_CREATED_DATE).toLocaleDateString() : '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${parseInt(exp.EXP_STATUS) === 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    {parseInt(exp.EXP_STATUS) === 0 ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => setEditingExpense(exp)}
                                                        className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"
                                                        title="Edit Expense"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(exp.EXP_ID)}
                                                        disabled={deletingId === exp.EXP_ID}
                                                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                        title="Deactivate Expense"
                                                    >
                                                        {deletingId === exp.EXP_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredExpenses.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredExpenses.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredExpenses.length, currentPage * itemsPerPage)} of {filteredExpenses.length} items
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
                                {[...Array(Math.ceil(filteredExpenses.length / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil(filteredExpenses.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredExpenses.length / itemsPerPage), prev + 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <FolderPlus className="text-blue-500" /> Add New Expense
                                </h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 dark:text-[#64748b] hover:text-slate-800 dark:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleAdd} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Expense Code</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={newExpense.EXP_CODE}
                                            className="w-full bg-slate-100 dark:bg-[#0f172a]/50 border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-500 dark:text-[#64748b] font-mono cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Category</label>
                                        <select
                                            value={newExpense.EXP_CATEGORY}
                                            onChange={(e) => setNewExpense({ ...newExpense, EXP_CATEGORY: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Expense Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newExpense.EXP_NAME}
                                        onChange={(e) => setNewExpense({ ...newExpense, EXP_NAME: e.target.value })}
                                        placeholder="e.g. Electricity Bill, Diesel Fuel, Machinery Maintenance"
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Default Cost / Amount (Rs.)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newExpense.EXP_AMOUNT}
                                        onChange={(e) => setNewExpense({ ...newExpense, EXP_AMOUNT: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Description / Notes</label>
                                    <textarea
                                        rows={3}
                                        value={newExpense.EXP_DESCRIPTION}
                                        onChange={(e) => setNewExpense({ ...newExpense, EXP_DESCRIPTION: e.target.value })}
                                        placeholder="Add any additional details or notes regarding this expense..."
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 px-6 py-3 bg-slate-200 dark:bg-[#334155] text-slate-800 dark:text-white font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-[#404e63]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{isSaving ? 'Saving...' : 'Save Expense'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Expense Modal */}
            <AnimatePresence>
                {editingExpense && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingExpense(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Edit2 className="text-amber-500" /> Edit Expense
                                </h3>
                                <button onClick={() => setEditingExpense(null)} className="text-slate-500 dark:text-[#64748b] hover:text-slate-800 dark:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Expense Code</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={editingExpense.EXP_CODE}
                                            className="w-full bg-slate-100 dark:bg-[#0f172a]/50 border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-500 dark:text-[#64748b] font-mono cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Category</label>
                                        <select
                                            value={editingExpense.EXP_CATEGORY || 'General'}
                                            onChange={(e) => setEditingExpense({ ...editingExpense, EXP_CATEGORY: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Expense Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingExpense.EXP_NAME}
                                        onChange={(e) => setEditingExpense({ ...editingExpense, EXP_NAME: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Default Cost / Amount (Rs.)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editingExpense.EXP_AMOUNT}
                                        onChange={(e) => setEditingExpense({ ...editingExpense, EXP_AMOUNT: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Description / Notes</label>
                                    <textarea
                                        rows={3}
                                        value={editingExpense.EXP_DESCRIPTION || ''}
                                        onChange={(e) => setEditingExpense({ ...editingExpense, EXP_DESCRIPTION: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingExpense(null)}
                                        className="flex-1 px-6 py-3 bg-slate-200 dark:bg-[#334155] text-slate-800 dark:text-white font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-[#404e63]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{isSaving ? 'Updating...' : 'Update Expense'}</span>
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

export default ExpenseManagement;
