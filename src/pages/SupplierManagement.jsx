import { AnimatePresence, motion } from 'framer-motion';
import { Edit2, Loader2, Plus, Save, Search, Trash2, X, Users, Globe, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { slMobileRegex } from '../utils/validation';

const SupplierManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [suppliers, setSuppliers] = useState([]);
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    
    const [activeTab, setActiveTab] = useState('general');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [viewingSupplier, setViewingSupplier] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form states
    const [newSupplier, setNewSupplier] = useState({
        CS_CODE: '',
        CS_FULL_NAME: '',
        CS_SHORT_NAME: '',
        CS_CONTACT_PERSON: '',
        CS_CUSTSUP_FLAG: 'Supplier',
        CS_EMAIL: '',
        CS_MOBILE_NO: '',
        CS_TELEPHONE_NO: '',
        CS_FAX_NO: '',
        CS_COUNTRY_ID: '',
        CS_CITY_ID: '',
        CS_PERMENENT_ADDRESS: '',
        CS_MAIL_ADDRESS_1: '',
        CS_MAIL_ADDRESS_2: '',
        CS_MAIL_ADDRESS_3: '',
        CS_BUS_REG_NO: '',
        CS_VAT_NO: '',
        CS_SVAT_NO: '',
        CS_TAX_FLAG: 0,
        CS_CONTCT_SALES: '',
        CS_CONTC_ACC: '',
        CS_CURRENCY_CODE: 'LKR',
        CS_PAY_TYPE: 'Credit',
        CS_BANK_NAME: '',
        CS_BRANCH_NAME: '',
        CS_ACC_NO: '',
        CS_CREDIT_BAL: 0,
        CS_CREDIT_LIMIT: 0
    });

    // Auth Check
    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('supply-customer');

    useEffect(() => {
        fetchData();
    }, []);

    const supplierSchema = Yup.object().shape({
        CS_FULL_NAME: Yup.string().required('Supplier Full Name is required'),
        CS_EMAIL: Yup.string().email('Please enter a valid email address').nullable(),
        CS_MOBILE_NO: Yup.string()
            .matches(slMobileRegex, 'Please enter a valid Sri Lankan mobile number')
            .nullable(),
        CS_TELEPHONE_NO: Yup.string()
            .test('is-sl-phone', 'Please enter a valid telephone number', (value) => !value || slMobileRegex.test(value))
            .nullable(),
        CS_FAX_NO: Yup.string()
            .test('is-sl-fax', 'Please enter a valid fax number', (value) => !value || slMobileRegex.test(value))
            .nullable(),
    });

    const validateForm = async (data) => {
        try {
            await supplierSchema.validate(data, { abortEarly: false });
            return true;
        } catch (err) {
            const firstError = err.inner[0];
            showNotification(firstError.message, 'error');
            
            // Switch to relevant tab based on field
            if (['CS_EMAIL', 'CS_MOBILE_NO', 'CS_TELEPHONE_NO', 'CS_FAX_NO'].includes(firstError.path)) {
                setActiveTab('contact');
            } else {
                setActiveTab('general');
            }
            return false;
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [supRes, countRes, cityRes] = await Promise.all([
                api.get('/suppliers'),
                api.get('/maintain/countries'),
                api.get('/maintain/cities')
            ]);
            setSuppliers(supRes.data);
            setCountries(countRes.data);
            setCities(cityRes.data);
            
            if (countRes.data.length > 0) {
                const firstCountryId = countRes.data[0].C_ID;
                const relevantCities = cityRes.data.filter(c => c.CC_COUNTRY_ID === firstCountryId);
                setNewSupplier(prev => ({ 
                    ...prev, 
                    CS_COUNTRY_ID: firstCountryId,
                    CS_CITY_ID: relevantCities[0]?.CC_ID || null
                }));
            }
        } catch (error) {
            showNotification('Failed to load data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const isValid = await validateForm(newSupplier);
        if (!isValid) return;
        setIsSaving(true);
        try {
            await api.post('/suppliers', newSupplier);
            await fetchData();
            setIsAddModalOpen(false);
            const firstCountryId = countries[0]?.C_ID || null;
            const firstCityId = cities.find(c => c.CC_COUNTRY_ID === firstCountryId)?.CC_ID || null;
            
            setNewSupplier({
                CS_CODE: '',
                CS_FULL_NAME: '',
                CS_SHORT_NAME: '',
                CS_CONTACT_PERSON: '',
                CS_CUSTSUP_FLAG: 'Supplier',
                CS_EMAIL: '',
                CS_MOBILE_NO: '',
                CS_TELEPHONE_NO: '',
                CS_FAX_NO: '',
                CS_COUNTRY_ID: firstCountryId,
                CS_CITY_ID: firstCityId,
                CS_PERMENENT_ADDRESS: '',
                CS_MAIL_ADDRESS_1: '',
                CS_MAIL_ADDRESS_2: '',
                CS_MAIL_ADDRESS_3: '',
                CS_BUS_REG_NO: '',
                CS_VAT_NO: '',
                CS_SVAT_NO: '',
                CS_TAX_FLAG: 0,
                CS_CONTCT_SALES: '',
                CS_CONTC_ACC: '',
                CS_CURRENCY_CODE: 'LKR',
                CS_PAY_TYPE: 'Credit',
                CS_BANK_NAME: '',
                CS_BRANCH_NAME: '',
                CS_ACC_NO: '',
                CS_CREDIT_BAL: 0,
                CS_CREDIT_LIMIT: 0
            });
            showNotification('Supplier added successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to add supplier', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const isValid = await validateForm(editingSupplier);
        if (!isValid) return;
        setIsSaving(true);
        try {
            await api.put(`/suppliers/${editingSupplier.CS_ID}`, editingSupplier);
            await fetchData();
            setEditingSupplier(null);
            showNotification('Supplier updated successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to update supplier', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this supplier?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/suppliers/${id}`);
            await fetchData();
            showNotification('Supplier deactivated successfully', 'success');
        } catch (error) {
            showNotification('Failed to deactivate supplier', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredSuppliers = suppliers
        .filter(s => 
            s.CS_FULL_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.city_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.CS_ID - a.CS_ID);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (!hasPermission && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Users className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">Insufficient permissions to manage suppliers.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Supplier Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Maintain your database of product suppliers.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Supplier</span>
                </button>
            </div>

            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search suppliers..."
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
                                <th className="px-6 py-4 text-left">Supplier Name</th>
                                <th className="px-6 py-4 text-left">Location</th>
                                <th className="px-6 py-4 text-left">Created By</th>
                                <th className="px-6 py-4 text-left">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading suppliers...
                                    </td>
                                </tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No suppliers found.</td>
                                </tr>
                            ) : filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((sup) => (
                                <tr key={sup.CS_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{sup.CS_ID}</span>
                                            <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{sup.CS_CODE || `SUP-${sup.CS_ID.toString().padStart(3, '0')}`}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-800 dark:text-white font-bold text-sm tracking-tight">{sup.CS_FULL_NAME}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-800 dark:text-white text-sm font-bold tracking-tight">{sup.city_name}</span>
                                            <span className="text-slate-500 dark:text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest">{sup.country_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-white">{sup.CS_ENTERED_BY || 'System'}</span>
                                            <span className="text-[10px] text-slate-500 font-bold">{sup.CS_ENTERED_DATE ? new Date(sup.CS_ENTERED_DATE).toLocaleDateString() : '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${sup.CS_STATUS === 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            {sup.CS_STATUS === 0 ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button 
                                                onClick={() => { setEditingSupplier(sup); setIsAddModalOpen(true); }}
                                                className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(sup.CS_ID)}
                                                disabled={deletingId === sup.CS_ID}
                                                className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {deletingId === sup.CS_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredSuppliers.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredSuppliers.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredSuppliers.length, currentPage * itemsPerPage)} of {filteredSuppliers.length} suppliers
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
                                {[...Array(Math.ceil(filteredSuppliers.length / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil(filteredSuppliers.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredSuppliers.length / itemsPerPage), prev + 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {(isAddModalOpen || editingSupplier) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddModalOpen(false); setEditingSupplier(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    {isAddModalOpen ? <Plus className="mr-2 text-blue-500" /> : <Edit2 className="mr-2 text-blue-500" />}
                                    {isAddModalOpen ? 'Add New Supplier' : 'Edit Supplier'}
                                </h3>
                                <button onClick={() => { setIsAddModalOpen(false); setEditingSupplier(null); }} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>

                            {/* Tabs Header */}
                            <div className="flex border-b border-slate-200 dark:border-[#334155] bg-slate-50/30 dark:bg-[#0f172a]/30 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'general', label: 'General' },
                                    { id: 'contact', label: 'Contact & Location' },
                                    { id: 'business', label: 'Business & Tax' },
                                    { id: 'financial', label: 'Financial & Banking' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-6 py-3 text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={isAddModalOpen ? handleAdd : handleUpdate} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {activeTab === 'general' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier Full Name</label>
                                                <input type="text" required maxLength={50} value={isAddModalOpen ? newSupplier.CS_FULL_NAME : editingSupplier.CS_FULL_NAME} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_FULL_NAME: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_FULL_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="Enter full legal name" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Short Name / Alias</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_SHORT_NAME : editingSupplier.CS_SHORT_NAME} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_SHORT_NAME: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_SHORT_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="Common name" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Person</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_CONTACT_PERSON : editingSupplier.CS_CONTACT_PERSON} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_CONTACT_PERSON: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_CONTACT_PERSON: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="Primary contact name" />
                                            </div>
                                           
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'contact' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                                <input type="email" maxLength={50} value={isAddModalOpen ? newSupplier.CS_EMAIL : editingSupplier.CS_EMAIL} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_EMAIL: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_EMAIL: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="vendor@example.com" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                                                <input type="tel" maxLength={50} value={isAddModalOpen ? newSupplier.CS_MOBILE_NO : editingSupplier.CS_MOBILE_NO} onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9+]/g, '');
                                                    isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_MOBILE_NO: val }) : setEditingSupplier({ ...editingSupplier, CS_MOBILE_NO: val });
                                                }} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="+94 77..." />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telephone</label>
                                                <input type="tel" maxLength={50} value={isAddModalOpen ? newSupplier.CS_TELEPHONE_NO : editingSupplier.CS_TELEPHONE_NO} onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9+]/g, '');
                                                    isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_TELEPHONE_NO: val }) : setEditingSupplier({ ...editingSupplier, CS_TELEPHONE_NO: val });
                                                }} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="+94 11..." />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fax Number</label>
                                                <input type="tel" maxLength={50} value={isAddModalOpen ? newSupplier.CS_FAX_NO : editingSupplier.CS_FAX_NO} onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9+]/g, '');
                                                    isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_FAX_NO: val }) : setEditingSupplier({ ...editingSupplier, CS_FAX_NO: val });
                                                }} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="Fax" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Country</label>
                                                <select required value={isAddModalOpen ? newSupplier.CS_COUNTRY_ID : editingSupplier.CS_COUNTRY_ID} onChange={(e) => {
                                                    const countryId = parseInt(e.target.value);
                                                    const countryCities = cities.filter(c => c.CC_COUNTRY_ID === countryId);
                                                    const val = { CS_COUNTRY_ID: countryId, CS_CITY_ID: countryCities[0]?.CC_ID || null };
                                                    isAddModalOpen ? setNewSupplier({ ...newSupplier, ...val }) : setEditingSupplier({ ...editingSupplier, ...val });
                                                }} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                                                    {countries.map(c => <option key={c.C_ID} value={c.C_ID}>{c.C_NAME}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">City</label>
                                                <select required value={isAddModalOpen ? newSupplier.CS_CITY_ID : editingSupplier.CS_CITY_ID} onChange={(e) => {
                                                    const cityId = e.target.value ? parseInt(e.target.value) : null;
                                                    isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_CITY_ID: cityId }) : setEditingSupplier({ ...editingSupplier, CS_CITY_ID: cityId });
                                                }} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                                                    {cities.filter(c => c.CC_COUNTRY_ID === parseInt(isAddModalOpen ? newSupplier.CS_COUNTRY_ID : editingSupplier.CS_COUNTRY_ID)).map(c => (
                                                        <option key={c.CC_ID} value={c.CC_ID}>{c.CC_NAME}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Permanent Address</label>
                                            <textarea maxLength={50} value={isAddModalOpen ? newSupplier.CS_PERMENENT_ADDRESS : editingSupplier.CS_PERMENENT_ADDRESS} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_PERMENENT_ADDRESS: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_PERMENENT_ADDRESS: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all h-24 resize-none" placeholder="Enter full address..." />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'business' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Registration No</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_BUS_REG_NO : editingSupplier.CS_BUS_REG_NO} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_BUS_REG_NO: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_BUS_REG_NO: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">VAT Number</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_VAT_NO : editingSupplier.CS_VAT_NO} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_VAT_NO: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_VAT_NO: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">TIN Number</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_SVAT_NO : editingSupplier.CS_SVAT_NO} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_SVAT_NO: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_SVAT_NO: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax Registered?</label>
                                                <select value={isAddModalOpen ? newSupplier.CS_TAX_FLAG : editingSupplier.CS_TAX_FLAG} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_TAX_FLAG: parseInt(e.target.value) }) : setEditingSupplier({ ...editingSupplier, CS_TAX_FLAG: parseInt(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                                                    <option value={0}>No</option>
                                                    <option value={1}>Yes</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Contact Name</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_CONTCT_SALES : editingSupplier.CS_CONTCT_SALES} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_CONTCT_SALES: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_CONTCT_SALES: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accounts Contact Name</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_CONTC_ACC : editingSupplier.CS_CONTC_ACC} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_CONTC_ACC: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_CONTC_ACC: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'financial' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Currency</label>
                                                <select value={isAddModalOpen ? newSupplier.CS_CURRENCY_CODE : editingSupplier.CS_CURRENCY_CODE} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_CURRENCY_CODE: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_CURRENCY_CODE: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                                                    <option value="LKR">LKR - Sri Lankan Rupee</option>
                                                    <option value="USD">USD - US Dollar</option>
                                                    <option value="EUR">EUR - Euro</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Type</label>
                                                <select value={isAddModalOpen ? newSupplier.CS_PAY_TYPE : editingSupplier.CS_PAY_TYPE} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_PAY_TYPE: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_PAY_TYPE: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                                                    <option value="Credit">Credit</option>
                                                    <option value="Cash">Cash</option>
                                                    <option value="Cheque">Cheque</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Name</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_BANK_NAME : editingSupplier.CS_BANK_NAME} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_BANK_NAME: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_BANK_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Name</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_BRANCH_NAME : editingSupplier.CS_BRANCH_NAME} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_BRANCH_NAME: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_BRANCH_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Number</label>
                                                <input type="text" maxLength={50} value={isAddModalOpen ? newSupplier.CS_ACC_NO : editingSupplier.CS_ACC_NO} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_ACC_NO: e.target.value }) : setEditingSupplier({ ...editingSupplier, CS_ACC_NO: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credit Limit</label>
                                                <input type="number" value={isAddModalOpen ? newSupplier.CS_CREDIT_LIMIT : editingSupplier.CS_CREDIT_LIMIT} onChange={(e) => isAddModalOpen ? setNewSupplier({ ...newSupplier, CS_CREDIT_LIMIT: parseFloat(e.target.value) }) : setEditingSupplier({ ...editingSupplier, CS_CREDIT_LIMIT: parseFloat(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-8 sticky bottom-0 bg-white dark:bg-[#1e293b] mt-4">
                                    <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingSupplier(null); }} className="flex-1 px-6 py-4 bg-slate-100 dark:bg-[#334155] text-slate-700 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-[#404e63] transition-all">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        <span>{isSaving ? 'Processing Data...' : (isAddModalOpen ? 'Create Supplier Profile' : 'Save Changes')}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* View Details Modal */}
            <AnimatePresence>
                {viewingSupplier && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingSupplier(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-5xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" >
                            <div className="p-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <div>
                                    <div className="flex items-center space-x-3 mb-1">
                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg font-mono font-bold text-sm tracking-widest">{viewingSupplier.CS_CODE}</span>
                                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{viewingSupplier.CS_FULL_NAME}</h3>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">{viewingSupplier.CS_SHORT_NAME || 'Official Supplier Profile'}</p>
                                </div>
                                <button onClick={() => setViewingSupplier(null)} className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-white rounded-2xl transition-all shadow-sm"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                    {/* Left Column: General & Contact */}
                                    <div className="space-y-10">
                                        <section>
                                            <h4 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-6">General Information</h4>
                                            <div className="space-y-6">
                                                <DetailItem label="Contact Person" value={viewingSupplier.CS_CONTACT_PERSON} />
                                                <DetailItem label="Business Reg No" value={viewingSupplier.CS_BUS_REG_NO} />
                                            </div>
                                        </section>
                                        <section>
                                            <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-6">Communication</h4>
                                            <div className="space-y-6">
                                                <DetailItem label="Email Address" value={viewingSupplier.CS_EMAIL} />
                                                <DetailItem label="Mobile" value={viewingSupplier.CS_MOBILE_NO} />
                                                <DetailItem label="Telephone" value={viewingSupplier.CS_TELEPHONE_NO} />
                                                <DetailItem label="Fax" value={viewingSupplier.CS_FAX_NO} />
                                            </div>
                                        </section>
                                    </div>

                                    {/* Middle Column: Address & Tax */}
                                    <div className="space-y-10">
                                        <section>
                                            <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] mb-6">Location Details</h4>
                                            <div className="space-y-6">
                                                <DetailItem label="Country" value={viewingSupplier.country_name} />
                                                <DetailItem label="City" value={viewingSupplier.city_name} />
                                                <DetailItem label="Permanent Address" value={viewingSupplier.CS_PERMENENT_ADDRESS} />
                                                <div className="pt-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Mailing Addresses</label>
                                                    <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                                        <p>{viewingSupplier.CS_MAIL_ADDRESS_1}</p>
                                                        <p>{viewingSupplier.CS_MAIL_ADDRESS_2}</p>
                                                        <p>{viewingSupplier.CS_MAIL_ADDRESS_3}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                        <section>
                                            <h4 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] mb-6">Tax Information</h4>
                                            <div className="space-y-6">
                                                <DetailItem label="VAT No" value={viewingSupplier.CS_VAT_NO} />
                                                <DetailItem label="SVAT No" value={viewingSupplier.CS_SVAT_NO} />
                                                <DetailItem label="Tax Registered" value={viewingSupplier.CS_TAX_FLAG === 1 ? 'Yes' : 'No'} />
                                            </div>
                                        </section>
                                    </div>

                                    {/* Right Column: Financial & Audit */}
                                    <div className="space-y-10">
                                        <section className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                                            <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-8">Financial Profile</h4>
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Currency</label>
                                                        <span className="text-lg font-black text-slate-800 dark:text-white">{viewingSupplier.CS_CURRENCY_CODE}</span>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Pay Type</label>
                                                        <span className="text-lg font-black text-slate-800 dark:text-white">{viewingSupplier.CS_PAY_TYPE}</span>
                                                    </div>
                                                </div>
                                                <DetailItem label="Bank" value={viewingSupplier.CS_BANK_NAME} />
                                                <DetailItem label="Branch" value={viewingSupplier.CS_BRANCH_NAME} />
                                                <DetailItem label="Account No" value={viewingSupplier.CS_ACC_NO} />
                                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                                    <DetailItem label="Credit Limit" value={viewingSupplier.CS_CREDIT_LIMIT?.toLocaleString()} isMoney />
                                                    <DetailItem label="Current Balance" value={viewingSupplier.CS_CREDIT_BAL?.toLocaleString()} isMoney />
                                                </div>
                                            </div>
                                        </section>
                                        <section>
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Audit Trail</h4>
                                            <div className="space-y-4 text-[10px] font-bold text-slate-500 uppercase">
                                                <div className="flex justify-between"><span>Entered By</span><span className="text-slate-800 dark:text-slate-300">{viewingSupplier.CS_ENTERED_BY}</span></div>
                                                <div className="flex justify-between"><span>Entered Date</span><span className="text-slate-800 dark:text-slate-300">{new Date(viewingSupplier.CS_ENTERED_DATE).toLocaleDateString()}</span></div>
                                                {viewingSupplier.CS_EDITED_BY && (
                                                    <>
                                                        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800"><span>Last Edited By</span><span className="text-blue-500">{viewingSupplier.CS_EDITED_BY}</span></div>
                                                        <div className="flex justify-between"><span>Edit Date</span><span className="text-blue-500">{new Date(viewingSupplier.CS_EDITED_DATE).toLocaleDateString()}</span></div>
                                                    </>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-end">
                                <button onClick={() => setViewingSupplier(null)} className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl tracking-widest uppercase text-xs">Close Profile</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper component for Detail items
const DetailItem = ({ label, value, isMoney }) => (
    <div className="group">
        <label className="text-[10px] font-black text-slate-400 group-hover:text-blue-500 transition-colors uppercase tracking-widest block mb-1">{label}</label>
        <span className={`text-slate-800 dark:text-slate-200 font-bold ${isMoney ? 'font-mono text-lg text-indigo-500' : 'text-base'}`}>
            {isMoney ? parseFloat(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (value || '-')}
        </span>
    </div>
);

export default SupplierManagement;
