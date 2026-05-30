import { AnimatePresence, motion } from 'framer-motion';
import { Edit2, LayoutGrid, Layers, Loader2, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const ProductCategory = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [activeTab, setActiveTab] = useState('category'); // 'category' or 'sub'
    
    // Category State
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [newCat, setNewCat] = useState({ C_NAME: '' });
    
    // Sub Category State
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [editingSub, setEditingSub] = useState(null);
    const [newSub, setNewSub] = useState({ SC_NAME: '', SC_CATEGORY_ID: '' });

    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Auth Check
    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('categorey');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [catRes, subRes] = await Promise.all([
                api.get('/product/categories'),
                api.get('/product/sub-categories')
            ]);
            setCategories(catRes.data);
            setSubCategories(subRes.data);
            if (catRes.data.length > 0) {
                setNewSub(prev => ({ ...prev, SC_CATEGORY_ID: catRes.data[0].C_ID }));
            }
        } catch (error) {
            showNotification('Failed to load data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Category Handlers
    const handleAddCat = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post('/product/categories', newCat);
            await fetchData();
            setIsCatModalOpen(false);
            setNewCat({ C_NAME: '' });
            showNotification('Category added successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to add category', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateCat = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.put(`/product/categories/${editingCat.C_ID}`, {
                C_NAME: editingCat.C_NAME
            });
            await fetchData();
            setEditingCat(null);
            showNotification('Category updated successfully', 'success');
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to update category';
            showNotification(errorMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCat = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this category?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/product/categories/${id}`);
            await fetchData();
            showNotification('Category deactivated', 'success');
        } catch (error) {
            showNotification('Failed to deactivate category', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    // Sub Category Handlers
    const handleAddSub = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post('/product/sub-categories', newSub);
            await fetchData();
            setIsSubModalOpen(false);
            setNewSub({ SC_NAME: '', SC_CATEGORY_ID: categories[0]?.C_ID || '' });
            showNotification('Sub Category added successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to add sub-category', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateSub = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.put(`/product/sub-categories/${editingSub.SC_ID}`, {
                SC_NAME: editingSub.SC_NAME,
                SC_CATEGORY_ID: editingSub.SC_CATEGORY_ID
            });
            await fetchData();
            setEditingSub(null);
            showNotification('Sub Category updated successfully', 'success');
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to update sub-category';
            showNotification(errorMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSub = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this sub-category?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/product/sub-categories/${id}`);
            await fetchData();
            showNotification('Sub Category deactivated', 'success');
        } catch (error) {
            showNotification('Failed to deactivate sub-category', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredCategories = categories
        .filter(c => c.C_NAME.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b.C_ID - a.C_ID);

    const filteredSubCategories = subCategories
        .filter(sc => 
            sc.SC_NAME.toLowerCase().includes(searchTerm.toLowerCase()) || 
            sc.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.SC_ID - a.SC_ID);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <LayoutGrid className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-600 dark:text-[#94a3b8]">Insufficient permissions to manage product categories.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Product Categories</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Manage your product hierarchy and sub-categories.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => activeTab === 'category' ? setIsCatModalOpen(true) : setIsSubModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add {activeTab === 'category' ? 'Category' : 'Sub Category'}</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center space-x-1 p-1 bg-slate-200 dark:bg-[#0f172a] rounded-xl w-fit mb-8 border border-slate-300 dark:border-[#334155]">
                <button
                    onClick={() => setActiveTab('category')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'category' ? 'bg-white dark:bg-[#1e293b] text-blue-600 shadow-md' : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white'}`}
                >
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Categories
                </button>
                <button
                    onClick={() => setActiveTab('sub')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'sub' ? 'bg-white dark:bg-[#1e293b] text-blue-600 shadow-md' : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white'}`}
                >
                    <Layers className="w-4 h-4 mr-2" />
                    Sub Categories
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab === 'category' ? 'categories' : 'sub categories'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            {/* Table Content */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Name Details</th>
                                {activeTab === 'sub' && <th className="px-6 py-4">Main Category</th>}
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
                                        Loading data...
                                    </td>
                                </tr>
                            ) : activeTab === 'category' ? (
                                filteredCategories.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No categories found.</td></tr>
                                ) : filteredCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                                    <tr key={item.C_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{item.C_ID}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">{item.C_NAME}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center space-x-1">
                                                   
                                                    <span className="text-sm font-bold text-slate-700 dark:text-white">{item.C_CREATED_BY || 'System'}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                    {item.C_CREATED_DATE ? new Date(item.C_CREATED_DATE).toLocaleDateString() : '-'}
                                                </span>
                                                {item.C_EDITED_BY && (
                                                    <div className="flex flex-col border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                                                        <div className="flex items-center space-x-1">
                                                           

                                                        </div>
                                                       
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Active</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => setEditingCat(item)} className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCat(item.C_ID)} 
                                                    disabled={deletingId === item.C_ID}
                                                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {deletingId === item.C_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                filteredSubCategories.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No sub-categories found.</td></tr>
                                ) : filteredSubCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                                    <tr key={item.SC_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{item.SC_ID}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">{item.SC_NAME}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20">
                                                {item.category_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center space-x-1">
                                                   
                                                    <span className="text-sm font-bold text-slate-700 dark:text-white">{item.SC_CREATED_BY || 'System'}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                    {item.SC_CREATED_DATE ? new Date(item.SC_CREATED_DATE).toLocaleDateString() : '-'}
                                                </span>
                                                {item.SC_EDITED_BY && (
                                                    <div className="flex flex-col border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                                                        <div className="flex items-center space-x-1">
                                                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Edited by:</span>
                                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{item.SC_EDITED_BY}</span>
                                                        </div>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                                                            {item.SC_EDITED_DATE ? new Date(item.SC_EDITED_DATE).toLocaleDateString() : '-'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Active</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => setEditingSub(item)} className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteSub(item.SC_ID)} 
                                                    disabled={deletingId === item.SC_ID}
                                                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {deletingId === item.SC_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
                {((activeTab === 'category' && filteredCategories.length > itemsPerPage) || (activeTab === 'sub' && filteredSubCategories.length > itemsPerPage)) && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(activeTab === 'category' ? filteredCategories.length : filteredSubCategories.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(activeTab === 'category' ? filteredCategories.length : filteredSubCategories.length, currentPage * itemsPerPage)} of {activeTab === 'category' ? filteredCategories.length : filteredSubCategories.length} {activeTab === 'category' ? 'categories' : 'sub-categories'}
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
                                {[...Array(Math.ceil((activeTab === 'category' ? filteredCategories.length : filteredSubCategories.length) / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil((activeTab === 'category' ? filteredCategories.length : filteredSubCategories.length) / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil((activeTab === 'category' ? filteredCategories.length : filteredSubCategories.length) / itemsPerPage), prev + 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Category Modal */}
            <AnimatePresence>
                {(isCatModalOpen || editingCat) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsCatModalOpen(false); setEditingCat(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingCat ? 'Edit Category' : 'Add New Category'}</h3>
                                <button onClick={() => { setIsCatModalOpen(false); setEditingCat(null); }} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={editingCat ? handleUpdateCat : handleAddCat} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Category Name</label>
                                    <input type="text" required maxLength={50} value={editingCat ? editingCat.C_NAME : newCat.C_NAME} onChange={(e) => editingCat ? setEditingCat({ ...editingCat, C_NAME: e.target.value }) : setNewCat({ ...newCat, C_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. Breads, Pastries, Cakes..." />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{isSaving ? 'Processing...' : (editingCat ? 'Update' : 'Save')}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Sub Category Modal */}
            <AnimatePresence>
                {(isSubModalOpen || editingSub) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsSubModalOpen(false); setEditingSub(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingSub ? 'Edit Sub Category' : 'Add New Sub Category'}</h3>
                                <button onClick={() => { setIsSubModalOpen(false); setEditingSub(null); }} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={editingSub ? handleUpdateSub : handleAddSub} className="p-6 space-y-4">

                                 <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Main Category</label>
                                    <select required value={editingSub ? editingSub.SC_CATEGORY_ID : newSub.SC_CATEGORY_ID} onChange={(e) => editingSub ? setEditingSub({ ...editingSub, SC_CATEGORY_ID: e.target.value }) : setNewSub({ ...newSub, SC_CATEGORY_ID: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                        {categories.map(cat => (
                                            <option key={cat.C_ID} value={cat.C_ID}>{cat.C_NAME}</option>
                                        ))}
                                    </select>
                                </div>

                                
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Sub Category Name</label>
                                    <input type="text" required maxLength={50} value={editingSub ? editingSub.SC_NAME : newSub.SC_NAME} onChange={(e) => editingSub ? setEditingSub({ ...editingSub, SC_NAME: e.target.value }) : setNewSub({ ...newSub, SC_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. Sandwich Bread, Croissants..." />
                                </div>
                               
                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{isSaving ? 'Processing...' : (editingSub ? 'Update' : 'Save')}</span>
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

export default ProductCategory;
