import { AnimatePresence, motion } from 'framer-motion';
import { 
    Plus, Search, FileText, CheckCircle, Clock, 
    ArrowRight, Trash2, Save, X, Loader2, 
    ChefHat, Edit2, Box, Layers, Ruler, 
    Hash, BarChart, ShoppingCart, Info, 
    Calendar, TrendingUp, Filter, AlertTriangle,
    Utensils, Beaker, ClipboardList, Minus,
    Zap, Eye
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import SearchableSelect from '../components/SearchableSelect';

const RecipeManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    
    const [recipes, setRecipes] = useState([]);
    const [products, setProducts] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [viewingRecipe, setViewingRecipe] = useState(null);
    const [viewingDetails, setViewingDetails] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // Helper to block negative signs and other non-numeric characters
    const handleNumericKeyDown = (e) => {
        if (['-', '+', 'e', 'E'].includes(e.key)) {
            e.preventDefault();
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        RECH_PRODUCT_ID: '',
        RECH_MADE_QTY: 1,
        RECH_PREPARATION_TIME: 0,
        RECH_REMARKS: '',
        items: []
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [recipeRes, prodRes, rmRes] = await Promise.all([
                api.get('/recipe'),
                api.get('/product/items'),
                api.get('/raw-material')
            ]);
            setRecipes(recipeRes.data);
            setProducts(prodRes.data);
            setRawMaterials(rmRes.data);
        } catch (error) {
            showNotification('Failed to load recipe data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = async (recipe = null) => {
        if (recipe) {
            setEditingRecipe(recipe);
            try {
                const detailsRes = await api.get(`/recipe/${recipe.RECH_ID}/details`);
                setFormData({ 
                    ...recipe, 
                    items: detailsRes.data.map(d => {
                        const baseUnit = d.RECD_UNIT;
                        const qty = Number(d.RECD_QTY);
                        let displayUnit = baseUnit;
                        let displayQty = qty;

                        const baseU = String(baseUnit || '').trim().toUpperCase();
                        if (['KG', 'KGS', 'KGMS'].includes(baseU)) {
                            if (qty < 0.001 && qty > 0) {
                                displayUnit = 'mg';
                                displayQty = qty * 1000000;
                            } else if (qty < 1 && qty > 0) {
                                displayUnit = 'g';
                                displayQty = qty * 1000;
                            }
                        } else if (['L', 'LTR', 'LITRE', 'LITRES'].includes(baseU)) {
                            if (qty < 1 && qty > 0) {
                                displayUnit = 'ml';
                                displayQty = qty * 1000;
                            }
                        } else if (['G', 'GRAM', 'GRAMS'].includes(baseU)) {
                            if (qty < 0.001 && qty > 0) {
                                displayUnit = 'mg';
                                displayQty = qty * 1000;
                            }
                        }

                        return {
                            RECD_RAW_METERIAL_ID: d.RECD_RAW_METERIAL_ID,
                            RECD_QTY: qty,
                            RECD_UNIT: d.RECD_UNIT,
                            RECD_REMARKS: d.RECD_REMARKS,
                            displayUnit,
                            displayQty: displayQty % 1 === 0 ? displayQty.toString() : displayQty.toFixed(3)
                        };
                    })
                });
            } catch (err) {
                showNotification('Error loading recipe details', 'error');
            }
        } else {
            setEditingRecipe(null);
            setFormData({
                RECH_PRODUCT_ID: '',
                RECH_MADE_QTY: 1,
                RECH_PREPARATION_TIME: 30,
                RECH_REMARKS: '',
                items: []
            });
        }
        setIsModalOpen(true);
    };

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { RECD_RAW_METERIAL_ID: '', RECD_QTY: 0, RECD_UNIT: '', RECD_REMARKS: '', displayQty: '', displayUnit: '' }]
        }));
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index, field, value) => {
        if (field === 'RECD_RAW_METERIAL_ID' && value) {
            const isDuplicate = formData.items.some((item, i) => i !== index && String(item.RECD_RAW_METERIAL_ID) === String(value));
            if (isDuplicate) {
                showNotification('This material is already added to the recipe.', 'warning');
                return;
            }
        }

        const newItems = [...formData.items];
        
        if (field === 'RECD_RAW_METERIAL_ID') {
            const material = rawMaterials.find(rm => rm.RM_ID === value);
            if (material) {
                newItems[index].RECD_RAW_METERIAL_ID = value;
                newItems[index].RECD_UNIT = material.RM_UNIT;
                newItems[index].displayUnit = material.RM_UNIT;
                newItems[index].displayQty = '';
                newItems[index].RECD_QTY = 0;
            }
        } else if (field === 'displayQty') {
            newItems[index].displayQty = value;
            const qtyVal = parseFloat(value) || 0;
            const dUnit = newItems[index].displayUnit;
            const bUnit = newItems[index].RECD_UNIT;

            const f = String(dUnit || '').trim().toUpperCase();
            const b = String(bUnit || '').trim().toUpperCase();
            const isBaseKg = ['KG', 'KGS', 'KGMS'].includes(b);
            const isBaseL = ['L', 'LTR', 'LITRE', 'LITRES'].includes(b);
            const isBaseG = ['G', 'GRAM', 'GRAMS'].includes(b);

            let ratio = 1;
            if (isBaseKg) {
                if (f === 'G' || f === 'ML') ratio = 0.001;
                else if (f === 'MG') ratio = 0.000001;
            } else if (isBaseL) {
                if (f === 'G' || f === 'ML') ratio = 0.001;
                else if (f === 'MG') ratio = 0.000001;
            } else if (isBaseG) {
                if (f === 'KG' || f === 'L') ratio = 1000;
                else if (f === 'MG') ratio = 0.001;
            }
            newItems[index].RECD_QTY = qtyVal * ratio;
        } else if (field === 'displayUnit') {
            newItems[index].displayUnit = value;
            const qtyVal = parseFloat(newItems[index].displayQty) || 0;
            const bUnit = newItems[index].RECD_UNIT;

            const f = String(value || '').trim().toUpperCase();
            const b = String(bUnit || '').trim().toUpperCase();
            const isBaseKg = ['KG', 'KGS', 'KGMS'].includes(b);
            const isBaseL = ['L', 'LTR', 'LITRE', 'LITRES'].includes(b);
            const isBaseG = ['G', 'GRAM', 'GRAMS'].includes(b);

            let ratio = 1;
            if (isBaseKg) {
                if (f === 'G' || f === 'ML') ratio = 0.001;
                else if (f === 'MG') ratio = 0.000001;
            } else if (isBaseL) {
                if (f === 'G' || f === 'ML') ratio = 0.001;
                else if (f === 'MG') ratio = 0.000001;
            } else if (isBaseG) {
                if (f === 'KG' || f === 'L') ratio = 1000;
                else if (f === 'MG') ratio = 0.001;
            }
            newItems[index].RECD_QTY = qtyVal * ratio;
        } else {
            newItems[index][field] = value;
        }
        
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.RECH_PRODUCT_ID) {
            showNotification('Product is required', 'warning');
            return;
        }

        // 1. Duplicate Recipe Check (only when creating new)
        if (!editingRecipe) {
            const exists = recipes.some(r => String(r.RECH_PRODUCT_ID) === String(formData.RECH_PRODUCT_ID));
            if (exists) {
                showNotification('A recipe already exists for this product. Please edit the existing one.', 'error');
                return;
            }
        }

        // 2. Ingredient & Qty Validation
        if (formData.items.length === 0) {
            showNotification('At least one ingredient is required', 'warning');
            return;
        }

        for (let i = 0; i < formData.items.length; i++) {
            const item = formData.items[i];
            if (!item.RECD_RAW_METERIAL_ID) {
                showNotification(`Please select an ingredient for item ${i + 1}`, 'warning');
                return;
            }
            if (!item.RECD_QTY || Number(item.RECD_QTY) <= 0) {
                showNotification(`Please enter a valid quantity for ${rawMaterials.find(rm => rm.RM_ID === item.RECD_RAW_METERIAL_ID)?.RM_NAME || 'item ' + (i + 1)}`, 'warning');
                return;
            }
        }

        setIsSaving(true);
        const finalData = { ...formData, RECH_MADE_QTY: 1 };
        try {
            if (editingRecipe) {
                await api.put(`/recipe/${editingRecipe.RECH_ID}`, finalData);
                showNotification('Recipe updated successfully', 'success');
            } else {
                await api.post('/recipe', finalData);
                showNotification('Recipe created successfully', 'success');
            }
            setIsModalOpen(false);
            fetchInitialData();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Error saving recipe', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleView = async (recipe) => {
        setViewingRecipe(recipe);
        try {
            const detailsRes = await api.get(`/recipe/${recipe.RECH_ID}/details`);
            setViewingDetails(detailsRes.data);
            setIsViewModalOpen(true);
        } catch (err) {
            showNotification('Error loading recipe details', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this recipe?')) {
            try {
                await api.delete(`/recipe/${id}`);
                showNotification('Recipe deactivated', 'success');
                fetchInitialData();
            } catch (error) {
                showNotification('Error deleting recipe', 'error');
            }
        }
    };

    const filteredRecipes = recipes
        .filter(r => 
            r.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.RECH_CODE.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.RECH_ID - a.RECH_ID);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const hasPermission = currentUser?.permissions?.includes('categorey');

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-rose-500/5">
                    <AlertTriangle className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">You don't have the required permissions to manage Recipes.</p>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                       
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Recipe Master</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center text-sm">
                              
                                Manage formulas and ingredient ratios
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search recipes..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-6 py-3.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl w-full md:w-80 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create Recipe</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-8 py-5">Formula Code</th>
                                <th className="px-8 py-5">Target Finished Good</th>
                                <th className="px-8 py-5">Production Yield</th>
                                <th className="px-8 py-5">Prep Time</th>
                                <th className="px-8 py-5">Created By</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-24 text-center">
                                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Formulas...</p>
                                    </td>
                                </tr>
                            ) : filteredRecipes.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-24 text-center">
                                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <ClipboardList className="w-10 h-10" />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No recipes found</p>
                                    </td>
                                </tr>
                            ) : filteredRecipes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((recipe) => (
                                <tr key={recipe.RECH_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{recipe.RECH_ID}</span>
                                            <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{recipe.RECH_CODE}</div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-4">
                                           
                                            <div className="min-w-0">
                                                <div className="text-slate-800 dark:text-white font-black text-sm tracking-tight mb-0.5 truncate max-w-[200px]" title={recipe.product_name}>
                                                    {recipe.product_name}
                                                </div>
                                               
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                                            <Beaker className="w-4 h-4 mr-2 text-blue-500" />
                                            {recipe.RECH_MADE_QTY} Units
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                                            <Clock className="w-4 h-4 mr-2 text-amber-500" />
                                            {recipe.RECH_PREPARATION_TIME} Min
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight">{recipe.RECH_CREATED_BY}</span>
                                            <span className="text-[10px] font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">{new Date(recipe.RECH_CREATED_DATE).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button 
                                                onClick={() => handleView(recipe)}
                                                className="p-3 text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all shadow-sm"
                                                title="View Recipe Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleOpenModal(recipe)}
                                                className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"
                                                title="Edit Recipe"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(recipe.RECH_ID)}
                                                className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm"
                                                title="Deactivate"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredRecipes.length > itemsPerPage && (
                    <div className="px-10 py-6 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredRecipes.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredRecipes.length, currentPage * itemsPerPage)} of {filteredRecipes.length} recipes
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
                                {[...Array(Math.ceil(filteredRecipes.length / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil(filteredRecipes.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredRecipes.length / itemsPerPage), prev + 1))}
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
                            className="relative w-full max-w-5xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
                        >
                            {/* Modal Header */}
                            <div className="px-10 py-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <div className="flex items-center space-x-5">
                                    <div className="w-14 h-14 bg-blue-600  rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30">
                                        {editingRecipe ? <Edit2 className="w-7 h-7" /> : <Plus className="w-7 h-7" />}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{editingRecipe ? 'Edit Recipe' : 'New Product Formula'}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight">Define exact ingredient ratios and preparation requirements.</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-sm transition-all"><X className="w-6 h-6" /></button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <form onSubmit={handleSave} className="space-y-10">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                        {/* Left Column - Meta Data */}
                                        <div className="lg:col-span-1 space-y-8">
                                            <section className="space-y-6">
                                                <div className="flex items-center space-x-2 text-indigo-600 font-black uppercase text-[10px] tracking-[0.2em]">
                                                    <Info className="w-4 h-4" />
                                                    <span>Target Product</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Finished Good</label>
                                                    <SearchableSelect 
                                                        options={products.map(p => ({ value: p.P_ID, label: `${p.P_NAME} (${p.P_CODE})` }))}
                                                        value={formData.RECH_PRODUCT_ID}
                                                        onChange={(val) => setFormData({ ...formData, RECH_PRODUCT_ID: val })}
                                                        placeholder="Select Product"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Yield Qty</label>
                                                        <input
                                                            type="number" readOnly value={1}
                                                            className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-400 dark:text-slate-500 outline-none cursor-not-allowed font-bold"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 text-amber-500">Prep (Mins)</label>
                                                        <input 
                                                            type="number" min="0" value={formData.RECH_PREPARATION_TIME} 
                                                            onChange={(e) => setFormData({ ...formData, RECH_PREPARATION_TIME: e.target.value })} 
                                                            onKeyDown={handleNumericKeyDown}
                                                            className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instructions / Notes</label>
                                                        <span className={`text-[10px] font-bold ${(formData.RECH_REMARKS || '').length >= 100 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                            {(formData.RECH_REMARKS || '').length}/100
                                                        </span>
                                                    </div>
                                                    <textarea 
                                                        rows="4" value={formData.RECH_REMARKS || ''} 
                                                        maxLength={100}
                                                        onChange={(e) => setFormData({ ...formData, RECH_REMARKS: e.target.value })} 
                                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 px-6 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold"
                                                        placeholder="Cooking instructions or quality notes..."
                                                    />
                                                </div>
                                            </section>
                                        </div>

                                        {/* Right Column - Ingredients */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2 text-indigo-600 font-black uppercase text-[10px] tracking-[0.2em]">
                                                    <Utensils className="w-4 h-4" />
                                                    <span>Ingredients & Ratios</span>
                                                </div>
                                                <button 
                                                    type="button" onClick={handleAddItem}
                                                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>Add Material</span>
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                {formData.items.length === 0 && (
                                                    <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] text-center">
                                                        <Beaker className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                        <p className="text-slate-400 text-sm font-medium italic">No ingredients added yet. Click 'Add Material' to begin.</p>
                                                    </div>
                                                )}
                                                {formData.items.map((item, index) => (
                                                    <div key={index} className="flex gap-4 p-5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl animate-in slide-in-from-right-4 duration-300">
                                                        <div className="flex-1 space-y-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <SearchableSelect 
                                                                    options={rawMaterials.map(rm => ({ value: rm.RM_ID, label: `${rm.RM_NAME} (${rm.RM_CODE})` }))}
                                                                    value={item.RECD_RAW_METERIAL_ID}
                                                                    onChange={(val) => handleItemChange(index, 'RECD_RAW_METERIAL_ID', val)}
                                                                    placeholder="Ingredient"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <div className="relative flex-[2]">
                                                                        <input 
                                                                            type="number" min="0" step="any" placeholder="Qty"
                                                                            value={item.displayQty} 
                                                                            onChange={(e) => handleItemChange(index, 'displayQty', e.target.value)} 
                                                                            onKeyDown={handleNumericKeyDown}
                                                                            className="w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        {(() => {
                                                                            const baseU = String(item.RECD_UNIT || '').trim().toUpperCase();
                                                                            const isMassOrVol = ['KG', 'KGS', 'KGMS', 'L', 'LTR', 'LITRE', 'LITRES', 'G', 'GRAM', 'GRAMS', 'ML', 'MLS'].includes(baseU);

                                                                            if (isMassOrVol) {
                                                                                return (
                                                                                    <select
                                                                                        value={item.displayUnit}
                                                                                        onChange={(e) => handleItemChange(index, 'displayUnit', e.target.value)}
                                                                                        className="w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-center"
                                                                                    >
                                                                                        <option value="KG">KG</option>
                                                                                        <option value="g">g</option>
                                                                                        <option value="mg">mg</option>
                                                                                        <option value="L">L</option>
                                                                                        <option value="ml">ml</option>
                                                                                    </select>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-2 text-sm font-bold text-center text-slate-500">
                                                                                    {item.RECD_UNIT || 'Unit'}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    <button 
                                                                        type="button" onClick={() => handleRemoveItem(index)}
                                                                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                                    >
                                                                        <Minus className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="relative group">
                                                                <input 
                                                                    type="text" placeholder="Note (e.g., finely chopped, sifted)"
                                                                    value={item.RECD_REMARKS} 
                                                                    maxLength={100}
                                                                    onChange={(e) => handleItemChange(index, 'RECD_REMARKS', e.target.value)} 
                                                                    className="w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 text-[10px] italic text-slate-700 dark:text-white pr-16"
                                                                />
                                                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold ${item.RECD_REMARKS?.length >= 100 ? 'text-rose-500' : 'text-slate-400 opacity-0 group-focus-within:opacity-100 transition-opacity'}`}>
                                                                    {item.RECD_REMARKS?.length || 0}/100
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-6 pt-6 sticky bottom-0 bg-white dark:bg-[#1e293b] py-6 border-t border-slate-100 dark:border-slate-800">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-widest rounded-3xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Close</button>
                                        <button 
                                            type="submit" disabled={isSaving} 
                                            className="flex-[2] py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-[0.2em] rounded-3xl shadow-2xl shadow-indigo-600/30 flex items-center justify-center space-x-3 transition-all active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            <span>{isSaving ? 'Processing...' : (editingRecipe ? 'Apply Changes' : 'Authorize & Save Recipe')}</span>
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
                {isViewModalOpen && viewingRecipe && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsViewModalOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="px-10 py-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between bg-indigo-50/50 dark:bg-[#0f172a]/50">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                                        <ChefHat className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Recipe Formula Details</h3>
                                        <div className="flex items-center mt-1.5 space-x-2">
                                            <span className="bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border border-blue-200 dark:border-blue-600/30 tracking-tight">
                                                {viewingRecipe.RECH_CODE}
                                            </span>
                                            <span className="text-slate-400 dark:text-slate-500 font-bold text-xs">for</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                                                {viewingRecipe.product_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsViewModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm"><X className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-3 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard Yield</p>
                                        <div className="flex items-center text-lg font-black text-slate-800 dark:text-white tracking-tighter">
                                            <Beaker className="w-5 h-5 mr-2 text-blue-500" />
                                            {viewingRecipe.RECH_MADE_QTY} Units
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preparation Time</p>
                                        <div className="flex items-center text-lg font-black text-slate-800 dark:text-white tracking-tighter">
                                            <Clock className="w-5 h-5 mr-2 text-amber-500" />
                                            {viewingRecipe.RECH_PREPARATION_TIME} Minutes
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Date</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(viewingRecipe.RECH_CREATED_DATE).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2 text-indigo-600 font-black uppercase text-[10px] tracking-[0.2em]">
                                        <Utensils className="w-4 h-4" />
                                        <span>Ingredient Breakdown</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {viewingDetails.map((item, idx) => (
                                            <div key={idx} className="p-5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 dark:text-white leading-none mb-1">{item.material_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.material_code}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-base font-black text-blue-600 dark:text-blue-400 tracking-tighter">
                                                        {(() => {
                                                            const qty = Number(item.RECD_QTY);
                                                            const baseU = String(item.RECD_UNIT || '').trim().toUpperCase();
                                                            const isKg = ['KG', 'KGS', 'KGMS'].includes(baseU);
                                                            const isL = ['L', 'LTR', 'LITRE', 'LITRES'].includes(baseU);
                                                            const isG = ['G', 'GRAM', 'GRAMS'].includes(baseU);

                                                            if (isKg) {
                                                                if (qty < 0.001 && qty > 0) return (qty * 1000000).toFixed(0);
                                                                if (qty < 1 && qty > 0) return (qty * 1000).toFixed(0);
                                                            } else if (isL) {
                                                                if (qty < 1 && qty > 0) return (qty * 1000).toFixed(0);
                                                            } else if (isG) {
                                                                if (qty < 0.001 && qty > 0) return (qty * 1000).toFixed(0);
                                                            }
                                                            return qty % 1 === 0 ? qty : qty.toFixed(3);
                                                        })()}
                                                    </p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">
                                                        {(() => {
                                                            const qty = Number(item.RECD_QTY);
                                                            const baseU = String(item.RECD_UNIT || '').trim().toUpperCase();
                                                            const isKg = ['KG', 'KGS', 'KGMS'].includes(baseU);
                                                            const isL = ['L', 'LTR', 'LITRE', 'LITRES'].includes(baseU);
                                                            const isG = ['G', 'GRAM', 'GRAMS'].includes(baseU);

                                                            if (isKg) {
                                                                if (qty < 0.001 && qty > 0) return 'mg';
                                                                if (qty < 1 && qty > 0) return 'g';
                                                            } else if (isL) {
                                                                if (qty < 1 && qty > 0) return 'ml';
                                                            } else if (isG) {
                                                                if (qty < 0.001 && qty > 0) return 'mg';
                                                            }
                                                            return item.RECD_UNIT;
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {viewingRecipe.RECH_REMARKS && (
                                    <div className="p-6 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-[2rem] space-y-2">
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center">
                                            <Info className="w-3.5 h-3.5 mr-1.5" />
                                            Formula Remarks
                                        </p>
                                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200 leading-relaxed italic">{viewingRecipe.RECH_REMARKS}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-transparent">
                                <button onClick={() => setIsViewModalOpen(false)} className="w-full py-4 bg-slate-800 dark:bg-slate-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-700 transition-all">Close</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecipeManagement;
