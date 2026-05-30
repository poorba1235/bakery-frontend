import { AnimatePresence, motion } from 'framer-motion';
import { 
    Edit2, 
    Layers, 
    Loader2, 
    Plus, 
    Save, 
    Search, 
    Trash2, 
    X, 
    MapPin,
    Navigation,
    FileText,
    Calendar,
    User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const AreaRouteManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [areas, setAreas] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('area'); // 'area' or 'route'
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');

    // Area State
    const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
    const [editingArea, setEditingArea] = useState(null);
    const [areaFormData, setAreaFormData] = useState({
        AR_NAME: '',
        AR_DESCRIPTION: ''
    });

    // Route State
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState(null);
    const [routeFormData, setRouteFormData] = useState({
        RT_NAME: '',
        RT_AREA_ID: '',
        RT_DESCRIPTION: ''
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
            const [areaRes, routeRes] = await Promise.all([
                api.get('/location-maintain/areas'),
                api.get('/location-maintain/routes')
            ]);
            setAreas(areaRes.data);
            setRoutes(routeRes.data);
        } catch (error) {
            showNotification('Failed to load location data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Area Handlers ---
    const handleAreaSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingArea) {
                await api.put(`/location-maintain/areas/${editingArea.AR_ID}`, areaFormData);
                showNotification('Area updated successfully', 'success');
            } else {
                await api.post('/location-maintain/areas', areaFormData);
                showNotification('Area added successfully', 'success');
            }
            fetchData();
            handleCloseAreaModal();
        } catch (error) {
            showNotification('Error saving area', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseAreaModal = () => {
        setIsAreaModalOpen(false);
        setEditingArea(null);
        setAreaFormData({ AR_NAME: '', AR_DESCRIPTION: '' });
    };

    const handleEditArea = (area) => {
        setEditingArea(area);
        setAreaFormData({
            AR_NAME: area.AR_NAME,
            AR_DESCRIPTION: area.AR_DESCRIPTION || ''
        });
        setIsAreaModalOpen(true);
    };

    const handleDeleteArea = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this area?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/location-maintain/areas/${id}`);
            showNotification('Area deactivated', 'success');
            fetchData();
        } catch (error) {
            showNotification('Error deactivating area', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    // --- Route Handlers ---
    const handleRouteSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingRoute) {
                await api.put(`/location-maintain/routes/${editingRoute.RT_ID}`, routeFormData);
                showNotification('Route updated successfully', 'success');
            } else {
                await api.post('/location-maintain/routes', routeFormData);
                showNotification('Route added successfully', 'success');
            }
            fetchData();
            handleCloseRouteModal();
        } catch (error) {
            showNotification('Error saving route', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseRouteModal = () => {
        setIsRouteModalOpen(false);
        setEditingRoute(null);
        setRouteFormData({ RT_NAME: '', RT_AREA_ID: '', RT_DESCRIPTION: '' });
    };

    const handleEditRoute = (rt) => {
        setEditingRoute(rt);
        setRouteFormData({
            RT_NAME: rt.RT_NAME,
            RT_AREA_ID: rt.RT_AREA_ID,
            RT_DESCRIPTION: rt.RT_DESCRIPTION || ''
        });
        setIsRouteModalOpen(true);
    };

    const handleDeleteRoute = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this route?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/location-maintain/routes/${id}`);
            showNotification('Route deactivated', 'success');
            fetchData();
        } catch (error) {
            showNotification('Error deactivating route', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredAreas = areas
        .filter(a => 
            a.AR_CODE.toLowerCase().includes(searchTerm.toLowerCase()) || 
            a.AR_NAME.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.AR_ID - a.AR_ID);

    const filteredRoutes = routes
        .filter(r => 
            r.RT_CODE.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.RT_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.area_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.RT_ID - a.RT_ID);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <MapPin className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">You don't have the required permissions to manage area and route data.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Area & Route Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Define delivery areas and specific distribution routes.</p>
                </div>
                <button
                    onClick={() => activeTab === 'area' ? setIsAreaModalOpen(true) : setIsRouteModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add {activeTab === 'area' ? 'Area' : 'Route'}</span>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center space-x-1 p-1 bg-slate-200 dark:bg-[#0f172a] rounded-xl w-fit mb-8 border border-slate-300 dark:border-[#334155]">
                <button
                    onClick={() => setActiveTab('area')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'area' 
                        ? 'bg-white dark:bg-[#1e293b] text-blue-600 shadow-md' 
                        : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                    <MapPin className="w-4 h-4 mr-2" />
                    Areas
                </button>
                <button
                    onClick={() => setActiveTab('route')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'route' 
                        ? 'bg-white dark:bg-[#1e293b] text-blue-600 shadow-md' 
                        : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                    <Navigation className="w-4 h-4 mr-2" />
                    Routes
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab === 'area' ? 'by name or code' : 'by route, area or code'}...`}
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
                                {activeTab === 'area' ? (
                                    <>
                                        <th className="px-6 py-4">Code & ID</th>
                                        <th className="px-6 py-4">Area Name</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4">Created By</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4">Code & ID</th>
                                        <th className="px-6 py-4">Route Name</th>
                                        <th className="px-6 py-4">Assigned Area</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </>
                                )}
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
                            ) : activeTab === 'area' ? (
                                filteredAreas.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">No areas found.</td></tr>
                                ) : filteredAreas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((area) => (
                                    <tr key={area.AR_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{area.AR_ID}</span>
                                                <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{area.AR_CODE}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">{area.AR_NAME}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-[#94a3b8] text-sm font-medium">{area.AR_DESCRIPTION || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 dark:text-white">{area.AR_ENTERED_BY || 'System'}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{area.AR_ENTERED_DATE ? new Date(area.AR_ENTERED_DATE).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => handleEditArea(area)} className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteArea(area.AR_ID)} 
                                                    disabled={deletingId === area.AR_ID}
                                                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {deletingId === area.AR_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                filteredRoutes.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">No routes found.</td></tr>
                                ) : filteredRoutes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((route) => (
                                    <tr key={route.RT_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold font-mono">#{route.RT_ID}</span>
                                                <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{route.RT_CODE}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">{route.RT_NAME}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-800 dark:text-white text-sm font-bold tracking-tight">{route.area_name}</span>
                                                <span className="text-slate-500 dark:text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest">{route.RT_DESCRIPTION || 'Route Description'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 dark:text-white">{route.RT_ENTERED_BY || 'System'}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{route.RT_ENTERED_DATE ? new Date(route.RT_ENTERED_DATE).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => handleEditRoute(route)} className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteRoute(route.RT_ID)} 
                                                    disabled={deletingId === route.RT_ID}
                                                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {deletingId === route.RT_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
                {((activeTab === 'area' && filteredAreas.length > itemsPerPage) || (activeTab === 'route' && filteredRoutes.length > itemsPerPage)) && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(activeTab === 'area' ? filteredAreas.length : filteredRoutes.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(activeTab === 'area' ? filteredAreas.length : filteredRoutes.length, currentPage * itemsPerPage)} of {activeTab === 'area' ? filteredAreas.length : filteredRoutes.length} {activeTab === 'area' ? 'areas' : 'routes'}
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
                                {[...Array(Math.ceil((activeTab === 'area' ? filteredAreas.length : filteredRoutes.length) / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil((activeTab === 'area' ? filteredAreas.length : filteredRoutes.length) / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil((activeTab === 'area' ? filteredAreas.length : filteredRoutes.length) / itemsPerPage), prev + 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Area Modal */}
            <AnimatePresence>
                {isAreaModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseAreaModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between bg-blue-50/50 dark:bg-[#0f172a]/50">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    <MapPin className="mr-2 text-blue-500" />
                                    {editingArea ? 'Edit Area Profile' : 'Register New Area'}
                                </h3>
                                <button onClick={handleCloseAreaModal} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleAreaSubmit} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Area Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. Colombo North" 
                                        value={areaFormData.AR_NAME} 
                                        maxLength={45}
                                        onChange={(e) => setAreaFormData({...areaFormData, AR_NAME: e.target.value})} 
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                                        <span className={`text-[10px] font-bold ${areaFormData.AR_DESCRIPTION.length >= 100 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {areaFormData.AR_DESCRIPTION.length}/100
                                        </span>
                                    </div>
                                    <textarea 
                                        placeholder="Regional distribution details..." 
                                        value={areaFormData.AR_DESCRIPTION} 
                                        maxLength={100}
                                        onChange={(e) => setAreaFormData({...areaFormData, AR_DESCRIPTION: e.target.value})} 
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[120px] transition-all resize-none" 
                                    />
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                    <span>{isSaving ? 'Processing...' : (editingArea ? 'Update Area' : 'Register Area')}</span>
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Route Modal */}
            <AnimatePresence>
                {isRouteModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseRouteModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between bg-indigo-50/50 dark:bg-[#0f172a]/50">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    <Navigation className="mr-2 text-indigo-500" />
                                    {editingRoute ? 'Edit Route Profile' : 'Define New Route'}
                                </h3>
                                <button onClick={handleCloseRouteModal} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleRouteSubmit} className="p-8 space-y-6">

                                 <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Area</label>
                                    <select required value={routeFormData.RT_AREA_ID} onChange={(e) => setRouteFormData({...routeFormData, RT_AREA_ID: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all">
                                        <option value="">Select Primary Area</option>
                                        {areas.map(area => (
                                            <option key={area.AR_ID} value={area.AR_ID}>{area.AR_NAME}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Route Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. Route 01 - Pettah" 
                                        value={routeFormData.RT_NAME} 
                                        maxLength={45}
                                        onChange={(e) => setRouteFormData({...routeFormData, RT_NAME: e.target.value})} 
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" 
                                    />
                                </div>
                               
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Route Description</label>
                                        <span className={`text-[10px] font-bold ${routeFormData.RT_DESCRIPTION.length >= 100 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {routeFormData.RT_DESCRIPTION.length}/100
                                        </span>
                                    </div>
                                    <textarea 
                                        placeholder="Specific landmarks or stops..." 
                                        value={routeFormData.RT_DESCRIPTION} 
                                        maxLength={100}
                                        onChange={(e) => setRouteFormData({...routeFormData, RT_DESCRIPTION: e.target.value})} 
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[120px] transition-all resize-none" 
                                    />
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                    <span>{isSaving ? 'Processing...' : (editingRoute ? 'Update Route' : 'Define Route')}</span>
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AreaRouteManagement;
