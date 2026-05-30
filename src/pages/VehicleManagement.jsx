import { AnimatePresence, motion } from 'framer-motion';
import { 
    Edit2, 
    Eye,
    Layers, 
    Loader2, 
    Plus, 
    Save, 
    Search, 
    Trash2, 
    X, 
    Car, 
    Truck,
    Fuel,
    Weight,
    Palette,
    Fingerprint,
    Calendar,
    Settings
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const VEHICLE_COLORS = [
    'White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Brown', 'Beige', 'Orange', 'Purple'
];

const PROVINCES = [
    { code: 'WP', name: 'Western' },
    { code: 'CP', name: 'Central' },
    { code: 'SP', name: 'Southern' },
    { code: 'NW', name: 'North Western' },
    { code: 'NC', name: 'North Central' },
    { code: 'UP', name: 'Uva' },
    { code: 'SG', name: 'Sabaragamuwa' },
    { code: 'EP', name: 'Eastern' },
    { code: 'NP', name: 'Northern' }
];

const VehicleManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [vehicles, setVehicles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [activeTab, setActiveTab] = useState('vehicle'); // 'vehicle' or 'category'
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Vehicle State
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [viewingVehicle, setViewingVehicle] = useState(null);
    const [vehicleFormData, setVehicleFormData] = useState({
        V_TYPE_ID: '',
        V_PROVINCE: '',
        V_SERIES: '',
        V_NUMBER: '',
        V_CHASSIS_NO: '',
        V_ENGINE_NO: '',
        V_COLOR: '',
        V_FUEL_TYPE: '',
        V_LOAD_CAPACITY: ''
    });

    // Category State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryFormData, setCategoryFormData] = useState({
        VEH_C_CATEGORY: ''
    });

    // Auth Check
    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('table-maintain');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [vehRes, catRes] = await Promise.all([
                api.get('/vehicles/items'),
                api.get('/vehicles/categories')
            ]);
            setVehicles(vehRes.data);
            setCategories(catRes.data);
        } catch (error) {
            showNotification('Failed to load data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Vehicle Handlers ---
    const handleVehicleSubmit = async (e) => {
        e.preventDefault();
        
        // Combine parts for backend
        const fullVNo = `${vehicleFormData.V_PROVINCE ? vehicleFormData.V_PROVINCE + ' ' : ''}${vehicleFormData.V_SERIES.trim()}-${vehicleFormData.V_NUMBER.trim()}`.toUpperCase();
        
        // Vehicle Number Validation
        const vehicleRegex = /^([A-Z]{1,2}\s)?([A-Z]{1,3}|[0-9]{1,3})-[0-9]{4}$/;
        
        if (!vehicleRegex.test(fullVNo)) {
            showNotification('Invalid Vehicle Number format. Please check the parts.', 'warning');
            return;
        }

        if (!vehicleFormData.V_COLOR) {
            showNotification('Vehicle color is required.', 'warning');
            return;
        }

        if (!vehicleFormData.V_FUEL_TYPE) {
            showNotification('Fuel type is required.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave = { ...vehicleFormData, V_NO: fullVNo };
            if (editingVehicle) {
                await api.put(`/vehicles/items/${editingVehicle.V_ID}`, dataToSave);
                showNotification('Vehicle updated successfully', 'success');
            } else {
                await api.post('/vehicles/items', dataToSave);
                showNotification('Vehicle added successfully', 'success');
            }
            fetchData();
            handleCloseVehicleModal();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Error saving vehicle', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseVehicleModal = () => {
        setIsVehicleModalOpen(false);
        setIsViewModalOpen(false);
        setEditingVehicle(null);
        setViewingVehicle(null);
        setVehicleFormData({
            V_TYPE_ID: '',
            V_PROVINCE: '',
            V_SERIES: '',
            V_NUMBER: '',
            V_CHASSIS_NO: '',
            V_ENGINE_NO: '',
            V_COLOR: '',
            V_FUEL_TYPE: '',
            V_LOAD_CAPACITY: ''
        });
    };

    const handleEditVehicle = (veh) => {
        setEditingVehicle(veh);
        
        // Split V_NO back into parts
        const parts = veh.V_NO.split(' ');
        let province = '';
        let rest = '';
        if (parts.length > 1) {
            province = parts[0];
            rest = parts[1];
        } else {
            rest = parts[0];
        }
        const [series, number] = rest.split('-');

        setVehicleFormData({
            V_TYPE_ID: veh.V_TYPE_ID,
            V_PROVINCE: province,
            V_SERIES: series || '',
            V_NUMBER: number || '',
            V_CHASSIS_NO: veh.V_CHASSIS_NO,
            V_ENGINE_NO: veh.V_ENGINE_NO,
            V_COLOR: veh.V_COLOR,
            V_FUEL_TYPE: veh.V_FUEL_TYPE,
            V_LOAD_CAPACITY: veh.V_LOAD_CAPACITY
        });
        setIsVehicleModalOpen(true);
    };

    const handleViewVehicle = (veh) => {
        setViewingVehicle(veh);
        setIsViewModalOpen(true);
    };

    const handleDeleteVehicle = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this vehicle?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/vehicles/items/${id}`);
            showNotification('Vehicle deactivated', 'success');
            fetchData();
        } catch (error) {
            showNotification('Error deactivating vehicle', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    // --- Category Handlers ---
    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingCategory) {
                await api.put(`/vehicles/categories/${editingCategory.VEH_C_ID}`, categoryFormData);
                showNotification('Category updated successfully', 'success');
            } else {
                await api.post('/vehicles/categories', categoryFormData);
                showNotification('Category added successfully', 'success');
            }
            fetchData();
            handleCloseCategoryModal();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Error saving category', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseCategoryModal = () => {
        setIsCategoryModalOpen(false);
        setEditingCategory(null);
        setCategoryFormData({ VEH_C_CATEGORY: '' });
    };

    const handleEditCategory = (cat) => {
        setEditingCategory(cat);
        setCategoryFormData({ VEH_C_CATEGORY: cat.VEH_C_CATEGORY });
        setIsCategoryModalOpen(true);
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this category?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/vehicles/categories/${id}`);
            showNotification('Category deactivated', 'success');
            fetchData();
        } catch (error) {
            showNotification('Error deactivating category', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredVehicles = vehicles
        .filter(v => 
            v.V_CODE.toLowerCase().includes(searchTerm.toLowerCase()) || 
            v.V_NO.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.V_ID - a.V_ID);

    const filteredCategories = categories
        .filter(c => 
            c.VEH_C_CATEGORY.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.VEH_C_ID - a.VEH_C_ID);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Truck className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">You don't have the required permissions to manage vehicle data.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Vehicle Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Manage your fleet vehicles and classification hierarchy.</p>
                </div>
                <button
                    onClick={() => activeTab === 'vehicle' ? setIsVehicleModalOpen(true) : setIsCategoryModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add {activeTab === 'vehicle' ? 'Vehicle' : 'Category'}</span>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center space-x-1 p-1 bg-slate-200 dark:bg-[#0f172a] rounded-xl w-fit mb-8 border border-slate-300 dark:border-[#334155]">
                <button
                    onClick={() => setActiveTab('vehicle')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'vehicle' 
                        ? 'bg-white dark:bg-[#1e293b] text-blue-600 shadow-md' 
                        : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                    <Car className="w-4 h-4 mr-2" />
                    Vehicles
                </button>
                <button
                    onClick={() => setActiveTab('category')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'category' 
                        ? 'bg-white dark:bg-[#1e293b] text-blue-600 shadow-md' 
                        : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                    <Layers className="w-4 h-4 mr-2" />
                    Categories
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab === 'vehicle' ? 'by code, number or category' : 'categories'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            {/* Main Table Content */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                {activeTab === 'vehicle' ? (
                                    <>
                                        <th className="px-6 py-4">Code & ID</th>
                                        <th className="px-6 py-4">Vehicle Details</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Specifications</th>
                                        <th className="px-6 py-4">Created By</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Category Details</th>
                                        <th className="px-6 py-4">Created By</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </>
                                )}
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
                            ) : activeTab === 'vehicle' ? (
                                filteredVehicles.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No vehicles found.</td></tr>
                                ) : filteredVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((veh) => (
                                    <tr key={veh.V_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{veh.V_ID}</span>
                                                <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{veh.V_CODE}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-[#0f172a] rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 dark:border-[#334155]">
                                                    <Truck className="w-5 h-5" />
                                                </div>
                                                <div className="text-slate-800 dark:text-white font-bold text-sm tracking-tight">{veh.V_NO}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20">
                                                {veh.category_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">{veh.V_FUEL_TYPE}</span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-white">{veh.V_LOAD_CAPACITY} KG Capacity</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 dark:text-white">{veh.V_ENTERED_BY || 'System'}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{veh.V_ENTERED_DATE ? new Date(veh.V_ENTERED_DATE).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => handleViewVehicle(veh)} className="p-3 text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all shadow-sm" title="View Details">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleEditVehicle(veh)} className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteVehicle(veh.V_ID)} 
                                                    disabled={deletingId === veh.V_ID}
                                                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {deletingId === veh.V_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                filteredCategories.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No categories found.</td></tr>
                                ) : filteredCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((cat) => (
                                    <tr key={cat.VEH_C_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{cat.VEH_C_ID}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">{cat.VEH_C_CATEGORY}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 dark:text-white">{cat.VEH_C_ENTERED_BY || 'System'}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{cat.VEH_C_ENTERED_DATE ? new Date(cat.VEH_C_ENTERED_DATE).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => handleEditCategory(cat)} className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCategory(cat.VEH_C_ID)} 
                                                    disabled={deletingId === cat.VEH_C_ID}
                                                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {deletingId === cat.VEH_C_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
                {((activeTab === 'vehicle' && filteredVehicles.length > itemsPerPage) || (activeTab === 'category' && filteredCategories.length > itemsPerPage)) && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(activeTab === 'vehicle' ? filteredVehicles.length : filteredCategories.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(activeTab === 'vehicle' ? filteredVehicles.length : filteredCategories.length, currentPage * itemsPerPage)} of {activeTab === 'vehicle' ? filteredVehicles.length : filteredCategories.length} {activeTab === 'vehicle' ? 'vehicles' : 'categories'}
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
                                {[...Array(Math.ceil((activeTab === 'vehicle' ? filteredVehicles.length : filteredCategories.length) / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil((activeTab === 'vehicle' ? filteredVehicles.length : filteredCategories.length) / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil((activeTab === 'vehicle' ? filteredVehicles.length : filteredCategories.length) / itemsPerPage), prev + 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Vehicle Modal */}
            <AnimatePresence>
                {isVehicleModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseVehicleModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
                                <button onClick={handleCloseVehicleModal} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleVehicleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar overflow-y-auto max-h-[70vh]">
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Vehicle Category</label>
                                    <select required value={vehicleFormData.V_TYPE_ID} onChange={(e) => setVehicleFormData({...vehicleFormData, V_TYPE_ID: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.VEH_C_ID} value={cat.VEH_C_ID}>{cat.VEH_C_CATEGORY}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Vehicle Number Plate</label>
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={vehicleFormData.V_PROVINCE} 
                                            onChange={(e) => setVehicleFormData({...vehicleFormData, V_PROVINCE: e.target.value})} 
                                            className="w-1/4 bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            <option value="">-</option>
                                            {PROVINCES.map(p => (
                                                <option key={p.code} value={p.code}>{p.code}</option>
                                            ))}
                                        </select>
                                        <input 
                                            type="text" 
                                            placeholder="SERIES" 
                                            value={vehicleFormData.V_SERIES} 
                                            maxLength={3}
                                            onChange={(e) => setVehicleFormData({...vehicleFormData, V_SERIES: e.target.value.toUpperCase()})} 
                                            className="flex-1 bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                                        />
                                        <span className="text-slate-400 font-bold">-</span>
                                        <input 
                                            type="text" 
                                            placeholder="NUMBER" 
                                            value={vehicleFormData.V_NUMBER} 
                                            maxLength={4}
                                            onChange={(e) => setVehicleFormData({...vehicleFormData, V_NUMBER: e.target.value})} 
                                            className="flex-1 bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Chassis No</label>
                                    <input type="text" placeholder="Optional" value={vehicleFormData.V_CHASSIS_NO} onChange={(e) => setVehicleFormData({...vehicleFormData, V_CHASSIS_NO: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Engine No</label>
                                    <input type="text" placeholder="Optional" value={vehicleFormData.V_ENGINE_NO} onChange={(e) => setVehicleFormData({...vehicleFormData, V_ENGINE_NO: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Color <span className="text-red-500">*</span></label>
                                    <select required value={vehicleFormData.V_COLOR} onChange={(e) => setVehicleFormData({...vehicleFormData, V_COLOR: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                        <option value="">Select Color</option>
                                        {VEHICLE_COLORS.map(color => (
                                            <option key={color} value={color}>{color}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Fuel Type <span className="text-red-500">*</span></label>
                                    <select required value={vehicleFormData.V_FUEL_TYPE} onChange={(e) => setVehicleFormData({...vehicleFormData, V_FUEL_TYPE: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                        <option value="">Select Fuel Type</option>
                                        <option value="Diesel">Diesel</option>
                                        <option value="Petrol">Petrol</option>
                                        <option value="Electric">Electric</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Load Capacity(kg)</label>
                                    <input type="text" placeholder="e.g. 1500kg" value={vehicleFormData.V_LOAD_CAPACITY} onChange={(e) => setVehicleFormData({...vehicleFormData, V_LOAD_CAPACITY: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                </div>
                                <div className="flex gap-3 pt-4 col-span-1 md:col-span-2 sticky bottom-0 bg-white dark:bg-[#1e293b]">
                                    <button type="submit" disabled={isSaving} className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 transition-all active:scale-95">
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        <span>{isSaving ? 'Processing...' : (editingVehicle ? 'Update Vehicle' : 'Save Vehicle')}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Category Modal */}
            <AnimatePresence>
                {isCategoryModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseCategoryModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                                <button onClick={handleCloseCategoryModal} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Category Name</label>
                                    <input type="text" required placeholder="e.g. Delivery Truck, Bike, Car..." value={categoryFormData.VEH_C_CATEGORY} onChange={(e) => setCategoryFormData({VEH_C_CATEGORY: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 transition-all active:scale-95">
                                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                    <span>{isSaving ? 'Processing...' : (editingCategory ? 'Update Category' : 'Save Category')}</span>
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Vehicle View Modal */}
            <AnimatePresence>
                {isViewModalOpen && viewingVehicle && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseVehicleModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between bg-blue-50/50 dark:bg-[#0f172a]/50">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Vehicle Details</h3>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{viewingVehicle.V_CODE} • ID #{viewingVehicle.V_ID}</p>
                                    </div>
                                </div>
                                <button onClick={handleCloseVehicleModal} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registration No</p>
                                        <p className="text-base font-bold text-slate-800 dark:text-white tracking-tight">{viewingVehicle.V_NO}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                                        <p className="text-base font-bold text-slate-800 dark:text-white tracking-tight">{viewingVehicle.category_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chassis Number</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{viewingVehicle.V_CHASSIS_NO || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engine Number</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{viewingVehicle.V_ENGINE_NO || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specifications</p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                                {viewingVehicle.V_FUEL_TYPE}
                                            </span>
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                                {viewingVehicle.V_COLOR}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Load Capacity</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{viewingVehicle.V_LOAD_CAPACITY || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Info</p>
                                        <p className="text-[11px] font-bold text-slate-500">Entered by {viewingVehicle.V_ENTERED_BY} on {new Date(viewingVehicle.V_ENTERED_DATE).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={handleCloseVehicleModal} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs">Close View</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VehicleManagement;
