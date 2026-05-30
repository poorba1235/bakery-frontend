import { AnimatePresence, motion } from 'framer-motion';
import {
    Calendar,
    Clock,
    Edit2,
    Loader2,
    Mail,
    Percent,
    Phone,
    Plus,
    Save,
    Search,
    ShieldAlert,
    Trash2,
    Truck,
    UserCircle2,
    UserPlus,
    Wallet,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { slMobileRegex, slNicRegex } from '../utils/validation';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SalesRepManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [salesReps, setSalesReps] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [vehicleAssignments, setVehicleAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('reps'); // 'reps', 'schedule', 'vehicle'
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Validation Schemas
    const repSchema = Yup.object().shape({
        SR_NAME: Yup.string().required('Name is required').max(100, 'Name cannot exceed 100 characters'),
        SR_CODE: Yup.string().max(20, 'Code cannot exceed 20 characters'),
        SR_NIC: Yup.string().matches(slNicRegex, 'Invalid Sri Lankan NIC format').required('NIC is required').max(20),
        SR_MOBILE: Yup.string().matches(slMobileRegex, 'Invalid Sri Lankan mobile number').required('Mobile is required').max(20),
        SR_EMAIL: Yup.string().email('Invalid email address').nullable().max(100),
        SR_BASIC_SALARY: Yup.number()
            .transform((value, originalValue) => originalValue === "" ? undefined : value)
            .min(0, 'Salary must be positive')
            .required('Basic Salary is required'),
        SR_COMMISSION_PERCENT: Yup.number()
            .transform((value, originalValue) => originalValue === "" ? undefined : value)
            .min(0, 'Commission must be at least 0')
            .max(100, 'Commission cannot exceed 100%')
            .required('Commission Rate is required'),
        SR_TARGET_AMOUNT: Yup.number()
            .transform((value, originalValue) => originalValue === "" ? undefined : value)
            .min(0, 'Target must be positive')
            .required('Target Amount is required'),
        SR_ADDRESS: Yup.string().max(100, 'Address cannot exceed 100 characters').nullable(),
        SR_REMARKS: Yup.string().max(100, 'Remarks cannot exceed 100 characters').nullable(),
        SR_DOB: Yup.date()
            .transform((value, originalValue) => originalValue === "" ? undefined : value)
            .required('Date of Birth is required')
            .max(new Date(), 'Date of Birth must be in the past')
            .test('age', 'Sales Representative must be at least 18 years old', function(value) {
                if (!value) return false;
                const today = new Date();
                const birthDate = new Date(value);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                return age >= 18;
            }),
        SR_JOIN_DATE: Yup.date()
            .transform((value, originalValue) => originalValue === "" ? undefined : value)
            .required('Join Date is required')
            .max(new Date(), 'Join Date cannot be in the future')
    });

    const scheduleSchema = Yup.object().shape({
        SRR_SALES_REP_ID: Yup.string().required('Sales Rep is required'),
        SRR_ROUTE_ID: Yup.string().required('Route is required'),
        SRR_DAY: Yup.string().required('Day is required').max(20),
        SRR_START_TIME: Yup.string().required('Start time is required'),
        SRR_END_TIME: Yup.string().required('End time is required'),
        SRR_REMARKS: Yup.string().max(500, 'Remarks cannot exceed 500 characters').nullable()
    });

    const assignmentSchema = Yup.object().shape({
        SRV_SALES_REP_ID: Yup.string().required('Sales Rep is required'),
        SRV_VEHICLE_ID: Yup.string().required('Vehicle is required'),
        SRV_ASSIGN_DATE: Yup.date().required('Assign date is required'),
        SRV_REMARKS: Yup.string().max(500, 'Remarks cannot exceed 500 characters').nullable()
    });

    const validateForm = async (schema, data) => {
        try {
            await schema.validate(data, { abortEarly: false });
            return true;
        } catch (err) {
            showNotification(err.inner[0].message, 'error');
            return false;
        }
    };

    // Modal States
    const [isRepModalOpen, setIsRepModalOpen] = useState(false);
    const [editingRep, setEditingRep] = useState(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

    // Form States
    const [repFormData, setRepFormData] = useState({
        SR_NAME: '',
        SR_CODE: '',
        SR_NIC: '',
        SR_MOBILE: '',
        SR_LAND_NUMBER: '',
        SR_EMAIL: '',
        SR_ADDRESS: '',
        SR_GENDER: 'Male',
        SR_JOIN_DATE: new Date().toISOString().split('T')[0],
        SR_DOB: '',
        SR_BASIC_SALARY: '',
        SR_COMMISSION_PERCENT: '',
        SR_TARGET_AMOUNT: '',
        SR_PHOTO: '',
        SR_REMARKS: ''
    });

    const [scheduleFormData, setScheduleFormData] = useState({
        SRR_SALES_REP_ID: '',
        SRR_ROUTE_ID: '',
        SRR_DAY: 'Monday',
        SRR_START_TIME: '08:00',
        SRR_END_TIME: '17:00',
        SRR_REMARKS: ''
    });

    const [vehicleFormData, setVehicleFormData] = useState({
        SRV_SALES_REP_ID: '',
        SRV_VEHICLE_ID: '',
        SRV_ASSIGN_DATE: new Date().toISOString().split('T')[0],
        SRV_REMARKS: ''
    });

    const perms = currentUser?.permissions?.split(',') || [];
    const hasPermission = perms.includes('table-maintain');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [repsRes, routesRes, vehRes, schedRes, assignRes] = await Promise.all([
                api.get('/sales-rep'),
                api.get('/location-maintain/routes'),
                api.get('/vehicles/items'),
                api.get('/sales-rep/schedules/all'),
                api.get('/sales-rep/vehicles/transactions')
            ]);
            setSalesReps(repsRes.data);
            setRoutes(routesRes.data);
            setVehicles(vehRes.data);
            setSchedules(schedRes.data);
            setVehicleAssignments(assignRes.data);
        } catch (error) {
            console.error('Fetch Data Error:', error);
            showNotification(`Failed to load data: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Sales Rep Handlers ---
    const handleAddRep = async () => {
        resetRepForm();
        setEditingRep(null);
        try {
            const res = await api.get('/sales-rep/get-next-code');
            setRepFormData(prev => ({ ...prev, SR_CODE: res.data.code }));
        } catch (error) {
            console.error('Failed to fetch next code', error);
        }
        setIsRepModalOpen(true);
    };

    const handleRepSubmit = async (e) => {
        e.preventDefault();
        const isValid = await validateForm(repSchema, repFormData);
        if (!isValid) return;
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(repFormData));
            if (selectedFile) {
                formData.append('photo', selectedFile);
            }

            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };

            if (editingRep) {
                await api.put(`/sales-rep/${editingRep.SR_ID}`, formData, config);
                showNotification('Sales Representative updated successfully', 'success');
            } else {
                await api.post('/sales-rep', formData, config);
                showNotification('Sales Representative added successfully', 'success');
            }
            await fetchData();
            setIsRepModalOpen(false);
            setEditingRep(null);
            resetRepForm();
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to save Sales Representative', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRep = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this Sales Representative?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/sales-rep/${id}`);
            showNotification('Sales Representative deactivated', 'success');
            await fetchData();
        } catch (error) {
            showNotification('Failed to deactivate', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const resetRepForm = () => {
        setRepFormData({
            SR_NAME: '',
            SR_CODE: '',
            SR_NIC: '',
            SR_MOBILE: '',
            SR_LAND_NUMBER: '',
            SR_EMAIL: '',
            SR_ADDRESS: '',
            SR_GENDER: 'Male',
            SR_JOIN_DATE: new Date().toISOString().split('T')[0],
            SR_DOB: '',
            SR_BASIC_SALARY: '',
            SR_COMMISSION_PERCENT: '',
            SR_TARGET_AMOUNT: '',
            SR_PHOTO: '',
            SR_REMARKS: ''
        });
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    // --- Schedule Handlers ---
    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        const isValid = await validateForm(scheduleSchema, scheduleFormData);
        if (!isValid) return;

        // Constraint: One rep can have a specific route only once in their schedule
        const isDuplicateRoute = schedules.some(s =>
            s.SRR_SALES_REP_ID === parseInt(scheduleFormData.SRR_SALES_REP_ID) &&
            s.SRR_ROUTE_ID === parseInt(scheduleFormData.SRR_ROUTE_ID)
        );
        if (isDuplicateRoute) {
            showNotification('This representative is already assigned to this route.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/sales-rep/schedules', scheduleFormData);
            showNotification('Route schedule added successfully', 'success');
            await fetchData();
            setIsScheduleModalOpen(false);
            setScheduleFormData({
                SRR_SALES_REP_ID: '',
                SRR_ROUTE_ID: '',
                SRR_DAY: 'Monday',
                SRR_START_TIME: '08:00',
                SRR_END_TIME: '17:00',
                SRR_REMARKS: ''
            });
        } catch (error) {
            showNotification('Failed to add schedule', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSchedule = async (id) => {
        if (!window.confirm('Deactivate this schedule?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/sales-rep/schedules/${id}`);
            showNotification('Schedule deactivated', 'success');
            await fetchData();
        } catch (error) {
            showNotification('Failed to deactivate schedule', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    // --- Vehicle Handlers ---
    const handleVehicleSubmit = async (e) => {
        e.preventDefault();
        const isValid = await validateForm(assignmentSchema, vehicleFormData);
        if (!isValid) return;

        // Constraint 1: Rep can only have one active vehicle
        const repHasActiveVehicle = vehicleAssignments.some(a =>
            a.SRV_SALES_REP_ID === parseInt(vehicleFormData.SRV_SALES_REP_ID) &&
            a.SRV_IS_ACTIVE === 1
        );
        if (repHasActiveVehicle) {
            showNotification('This representative already has an active vehicle assignment.', 'error');
            return;
        }

        // Constraint 2: Vehicle can only be assigned to one rep at a time
        const vehicleIsBusy = vehicleAssignments.some(a =>
            a.SRV_VEHICLE_ID === parseInt(vehicleFormData.SRV_VEHICLE_ID) &&
            a.SRV_IS_ACTIVE === 1
        );
        if (vehicleIsBusy) {
            showNotification('This vehicle is already assigned to another representative.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/sales-rep/vehicles/assign', {
                ...vehicleFormData,
                SRV_IS_ACTIVE: 1
            });
            showNotification('Vehicle assigned successfully', 'success');
            await fetchData();
            setIsVehicleModalOpen(false);
            setVehicleFormData({
                SRV_SALES_REP_ID: '',
                SRV_VEHICLE_ID: '',
                SRV_ASSIGN_DATE: new Date().toISOString().split('T')[0],
                SRV_REMARKS: ''
            });
        } catch (error) {
            showNotification('Failed to assign vehicle', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeactivateAssignment = async (id) => {
        if (!window.confirm('Deactivate this vehicle assignment?')) return;
        setDeletingId(id);
        try {
            await api.put(`/sales-rep/vehicles/deactivate/${id}`);
            showNotification('Assignment deactivated', 'success');
            await fetchData();
        } catch (error) {
            showNotification('Failed to deactivate assignment', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    // --- Filtering & Pagination ---
    const getFilteredData = () => {
        const data = activeTab === 'reps' ? salesReps : activeTab === 'schedule' ? schedules : vehicleAssignments;
        
        let filtered = data;
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = data.filter(item => {
                if (activeTab === 'reps') {
                    return (
                        (item.SR_NAME || '').toLowerCase().includes(search) ||
                        (item.SR_CODE || '').toLowerCase().includes(search) ||
                        (item.SR_NIC || '').toLowerCase().includes(search)
                    );
                } else if (activeTab === 'schedule') {
                    const rep = salesReps.find(r => r.SR_ID === item.SRR_SALES_REP_ID);
                    return (
                        (rep?.SR_NAME || '').toLowerCase().includes(search) ||
                        (item.route_name || '').toLowerCase().includes(search) ||
                        (item.SRR_DAY || '').toLowerCase().includes(search)
                    );
                } else {
                    const rep = salesReps.find(r => r.SR_ID === item.SRV_SALES_REP_ID);
                    return (
                        (rep?.SR_NAME || '').toLowerCase().includes(search) ||
                        (item.vehicle_no || '').toLowerCase().includes(search)
                    );
                }
            });
        }

        // Apply Descending Sort
        return [...filtered].sort((a, b) => {
            const idA = activeTab === 'reps' ? a.SR_ID : activeTab === 'schedule' ? a.SRR_ID : a.SRV_ID;
            const idB = activeTab === 'reps' ? b.SR_ID : activeTab === 'schedule' ? b.SRR_ID : b.SRV_ID;
            return idB - idA;
        });
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
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">Insufficient permissions to manage Sales Representatives.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Sales Representative Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Manage sales staff, route schedules, and vehicle allocations.</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'reps' && (
                        <button
                            onClick={handleAddRep}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                        >
                            <UserPlus className="w-5 h-5" />
                            <span>Add Sales Rep</span>
                        </button>
                    )}
                    {activeTab === 'schedule' && (
                        <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all font-semibold"
                        >
                            <Calendar className="w-5 h-5" />
                            <span>Assign Route</span>
                        </button>
                    )}
                    {activeTab === 'vehicle' && (
                        <button
                            onClick={() => setIsVehicleModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all font-semibold"
                        >
                            <Truck className="w-5 h-5" />
                            <span>Assign Vehicle</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center space-x-1 mb-6 bg-slate-100 dark:bg-[#1e293b] p-1.5 rounded-2xl w-fit">
                {[
                    { id: 'reps', label: 'Sales Reps', icon: UserCircle2 },
                    { id: 'schedule', label: 'Route Schedule', icon: Calendar },
                    { id: 'vehicle', label: 'Vehicle Assignment', icon: Truck }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab === 'reps' ? 'by name or code' : activeTab === 'schedule' ? 'by route or rep' : 'by vehicle or rep'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                {activeTab === 'reps' && (
                                    <>
                                        <th className="px-6 py-4 w-32">Code & ID</th>
                                        <th className="px-6 py-4">Basic Details</th>
                                        <th className="px-6 py-4">Contact Info</th>
                                        <th className="px-6 py-4 text-right w-32">Actions</th>
                                    </>
                                )}
                                {activeTab === 'schedule' && (
                                    <>
                                        <th className="px-6 py-4 w-32">Code & ID</th>
                                        <th className="px-6 py-4">Sales Rep</th>
                                        <th className="px-6 py-4">Route Info</th>
                                        <th className="px-6 py-4">Day & Time</th>
                                        <th className="px-6 py-4 text-right w-24">Actions</th>
                                    </>
                                )}
                                {activeTab === 'vehicle' && (
                                    <>
                                        <th className="px-6 py-4 w-32">Code & ID</th>
                                        <th className="px-6 py-4">Sales Rep</th>
                                        <th className="px-6 py-4">Vehicle Info</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right w-24">Actions</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading data...
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-12 text-center text-slate-500">No data found.</td>
                                </tr>
                            ) : paginatedData.map((item) => (
                                <tr key={activeTab === 'reps' ? item.SR_ID : activeTab === 'schedule' ? item.SRR_ID : item.SRV_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    {activeTab === 'reps' && (
                                        <>
                                              <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold font-mono">#{item.SR_ID}</span>
                                            <div className="text-sm font-mono font-bold text-slate-700 dark:text-white tracking-tighter">{item.SR_CODE}</div>
                                        </div>
                                    </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-5">
                                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shrink-0 shadow-lg uppercase overflow-hidden border-2 border-white dark:border-slate-700">
                                                        {item.SR_PHOTO ? (
                                                            <img src={`${api.defaults.baseURL.replace('/api', '')}${item.SR_PHOTO}`} alt={item.SR_NAME} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-3xl">{item.SR_NAME[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-slate-800 dark:text-white font-black text-lg truncate tracking-tight">{item.SR_NAME}</div>
                                                        <div className="flex flex-col mt-0.5">
                                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">NIC: {item.SR_NIC}</span>
                                                            <div className="flex items-center text-xs font-bold text-emerald-600">
                                                                <Wallet className="w-3 h-3 mr-1.5" />
                                                                <span>Rs. {parseFloat(item.SR_BASIC_SALARY).toLocaleString()}</span>
                                                                <span className="mx-2 text-slate-300">|</span>
                                                                <Percent className="w-3 h-3 mr-1" />
                                                                <span>{item.SR_COMMISSION_PERCENT}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                                        <Phone className="w-3 h-3 mr-1.5" />
                                                        <span className="font-bold tracking-tight">{item.SR_MOBILE}</span>
                                                    </div>
                                                    <div className="flex items-center text-[10px] text-slate-500">
                                                        <Mail className="w-3 h-3 mr-1.5" />
                                                        <span className="font-bold truncate max-w-[150px]">{item.SR_EMAIL || 'No Email'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button onClick={() => { setEditingRep(item); setRepFormData(item); setIsRepModalOpen(true); }} className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteRep(item.SR_ID)} 
                                                        disabled={deletingId === item.SR_ID}
                                                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                    >
                                                        {deletingId === item.SR_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                    {activeTab === 'schedule' && (
                                        <>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">{item.route_code}</span>
                                                    <span className="text-[10px] font-black text-slate-400 font-mono uppercase tracking-widest">ID #{item.SRR_ID}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                                                        {(salesReps.find(r => r.SR_ID === item.SRR_SALES_REP_ID)?.SR_NAME || 'U')[0]}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-700 dark:text-white">
                                                        {salesReps.find(r => r.SR_ID === item.SRR_SALES_REP_ID)?.SR_NAME || 'Unknown'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-slate-700 dark:text-white tracking-tight">{item.route_name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-white uppercase">{item.SRR_DAY}</span>
                                                    <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {(item.SRR_START_TIME || '').substring(0, 5)} - {(item.SRR_END_TIME || '').substring(0, 5)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleDeleteSchedule(item.SRR_ID)} 
                                                    disabled={deletingId === item.SRR_ID}
                                                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {deletingId === item.SRR_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        </>
                                    )}
                                    {activeTab === 'vehicle' && (
                                        <>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{item.vehicle_code}</span>
                                                    <span className="text-[10px] font-black text-slate-400 font-mono uppercase tracking-widest">ID #{item.SRV_ID}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase shadow-inner">
                                                        {(salesReps.find(r => r.SR_ID === item.SRV_SALES_REP_ID)?.SR_NAME || 'U')[0]}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="text-sm font-bold text-slate-700 dark:text-white">
                                                            {salesReps.find(r => r.SR_ID === item.SRV_SALES_REP_ID)?.SR_NAME || 'Unknown'}
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{salesReps.find(r => r.SR_ID === item.SRV_SALES_REP_ID)?.SR_CODE || '---'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{item.vehicle_no}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-sm font-bold text-slate-700 dark:text-white">
                                                    <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                                    {new Date(item.SRV_ASSIGN_DATE).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${item.SRV_IS_ACTIVE === 1 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                                                    {item.SRV_IS_ACTIVE === 1 ? 'Current' : 'History'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {item.SRV_IS_ACTIVE === 1 && (
                                                    <button 
                                                        onClick={() => handleDeactivateAssignment(item.SRV_ID)} 
                                                        disabled={deletingId === item.SRV_ID}
                                                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                    >
                                                        {deletingId === item.SRV_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredData.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredData.length, currentPage * itemsPerPage)} of {filteredData.length} records
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
                                {[...Array(Math.ceil(filteredData.length / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredData.length / itemsPerPage), prev + 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sales Rep Modal */}
            <AnimatePresence>
                {isRepModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRepModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    <UserPlus className="mr-2 text-blue-500" />
                                    {editingRep ? 'Edit Sales Representative' : 'Add New Sales Representative'}
                                </h3>
                                <button onClick={() => setIsRepModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleRepSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                                        </div>
                                        <input type="text" required maxLength={50} placeholder="e.g. Kamal Perera" value={repFormData.SR_NAME} onChange={(e) => setRepFormData({ ...repFormData, SR_NAME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">NIC Number</label>
                                        <input type="text" maxLength={20} placeholder="e.g. 199012345678" value={repFormData.SR_NIC} onChange={(e) => setRepFormData({ ...repFormData, SR_NIC: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                                        <select value={repFormData.SR_GENDER} onChange={(e) => setRepFormData({ ...repFormData, SR_GENDER: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile No</label>
                                        <input type="tel" maxLength={20} placeholder="e.g. 0771234567" value={repFormData.SR_MOBILE} onChange={(e) => setRepFormData({ ...repFormData, SR_MOBILE: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Land Line</label>
                                        <input type="tel" maxLength={20} placeholder="e.g. 0112345678" value={repFormData.SR_LAND_NUMBER} onChange={(e) => setRepFormData({ ...repFormData, SR_LAND_NUMBER: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                        <input type="email" maxLength={100} placeholder="e.g. kamal@example.com" value={repFormData.SR_EMAIL} onChange={(e) => setRepFormData({ ...repFormData, SR_EMAIL: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                                        <input type="date" value={repFormData.SR_DOB ? new Date(repFormData.SR_DOB).toISOString().split('T')[0] : ''} onChange={(e) => setRepFormData({ ...repFormData, SR_DOB: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Join Date</label>
                                        <input type="date" value={repFormData.SR_JOIN_DATE ? new Date(repFormData.SR_JOIN_DATE).toISOString().split('T')[0] : ''} onChange={(e) => setRepFormData({ ...repFormData, SR_JOIN_DATE: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Basic Salary</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                                            <input
                                                type="number"
                                                min=""
                                                placeholder="e.g. 50000"
                                                onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                                                value={repFormData.SR_BASIC_SALARY}
                                                onChange={(e) => setRepFormData({ ...repFormData, SR_BASIC_SALARY: Math.max(0, e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 pl-12 pr-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Commission Rate(%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                                                value={repFormData.SR_COMMISSION_PERCENT}
                                                onChange={(e) => setRepFormData({ ...repFormData, SR_COMMISSION_PERCENT: Math.min(100, Math.max(0, e.target.value)) })}
                                                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 1000000"
                                                onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                                                value={repFormData.SR_TARGET_AMOUNT}
                                                onChange={(e) => setRepFormData({ ...repFormData, SR_TARGET_AMOUNT: Math.max(0, e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 pl-12 pr-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Representative Photo</label>
                                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-[#0f172a] rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#334155]">
                                            <div className="relative group">
                                                <div className="w-32 h-32 rounded-2xl bg-white dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center">
                                                    {previewUrl ? (
                                                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                                    ) : repFormData.SR_PHOTO ? (
                                                        <img src={`${api.defaults.baseURL.replace('/api', '')}${repFormData.SR_PHOTO}`} className="w-full h-full object-cover" alt="Rep" />
                                                    ) : (
                                                        <UserCircle2 className="w-16 h-16 text-slate-300" />
                                                    )}
                                                </div>
                                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            setSelectedFile(file);
                                                            setPreviewUrl(URL.createObjectURL(file));
                                                        }
                                                    }} />
                                                    <Plus className="text-white w-8 h-8" />
                                                </label>
                                            </div>
                                            <div className="text-center sm:text-left">
                                                <p className="text-sm font-bold text-slate-700 dark:text-white mb-1">Click to upload photo</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">JPG, PNG or WEBP (Max 2MB)</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Permanent Address</label>
                                        <textarea placeholder="e.g. No. 123, Main Street, Colombo" value={repFormData.SR_ADDRESS} onChange={(e) => setRepFormData({ ...repFormData, SR_ADDRESS: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none h-24 resize-none" />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks</label>
                                        <textarea placeholder="Any additional notes..." value={repFormData.SR_REMARKS} onChange={(e) => setRepFormData({ ...repFormData, SR_REMARKS: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none h-20 resize-none" />
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-[#1e293b]">
                                    <button type="button" onClick={() => setIsRepModalOpen(false)} className="flex-1 px-6 py-4 bg-slate-100 dark:bg-[#0f172a] text-slate-600 dark:text-[#94a3b8] font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-[#334155] transition-all">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        <span>{isSaving ? 'Processing...' : (editingRep ? 'Update Representative' : 'Save Representative')}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Schedule Modal */}
            <AnimatePresence>
                {isScheduleModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsScheduleModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    <Calendar className="mr-2 text-indigo-500" />
                                    Assign Route Schedule
                                </h3>
                                <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Representative</label>
                                    <select required value={scheduleFormData.SRR_SALES_REP_ID} onChange={(e) => setScheduleFormData({ ...scheduleFormData, SRR_SALES_REP_ID: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none">
                                        <option value="">Select a Rep...</option>
                                        {salesReps.map(rep => <option key={rep.SR_ID} value={rep.SR_ID}>{rep.SR_NAME} ({rep.SR_CODE})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Route</label>
                                    <select required value={scheduleFormData.SRR_ROUTE_ID} onChange={(e) => setScheduleFormData({ ...scheduleFormData, SRR_ROUTE_ID: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none">
                                        <option value="">Select a Route...</option>
                                        {routes.map(route => <option key={route.RT_ID} value={route.RT_ID}>{route.RT_NAME} ({route.RT_CODE})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule Day</label>
                                    <select value={scheduleFormData.SRR_DAY} onChange={(e) => setScheduleFormData({ ...scheduleFormData, SRR_DAY: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none">
                                        {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</label>
                                        <input type="time" value={scheduleFormData.SRR_START_TIME} onChange={(e) => setScheduleFormData({ ...scheduleFormData, SRR_START_TIME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</label>
                                        <input type="time" value={scheduleFormData.SRR_END_TIME} onChange={(e) => setScheduleFormData({ ...scheduleFormData, SRR_END_TIME: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="flex-1 px-6 py-4 bg-slate-100 dark:bg-[#0f172a] text-slate-600 dark:text-[#94a3b8] font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-[#334155] transition-all">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-[2] px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        <span>{isSaving ? 'Processing...' : 'Assign Route'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Vehicle Modal */}
            <AnimatePresence>
                {isVehicleModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsVehicleModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    <Truck className="mr-2 text-emerald-500" />
                                    Assign Vehicle
                                </h3>
                                <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleVehicleSubmit} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Representative</label>
                                    <select required value={vehicleFormData.SRV_SALES_REP_ID} onChange={(e) => setVehicleFormData({ ...vehicleFormData, SRV_SALES_REP_ID: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/50 outline-none">
                                        <option value="">Select a Rep...</option>
                                        {salesReps.map(rep => <option key={rep.SR_ID} value={rep.SR_ID}>{rep.SR_NAME} ({rep.SR_CODE})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Vehicle</label>
                                    <select required value={vehicleFormData.SRV_VEHICLE_ID} onChange={(e) => setVehicleFormData({ ...vehicleFormData, SRV_VEHICLE_ID: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/50 outline-none">
                                        <option value="">Select a Vehicle...</option>
                                        {vehicles.map(veh => <option key={veh.V_ID} value={veh.V_ID}>{veh.V_NUMBER} ({veh.V_CODE})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assignment Date</label>
                                    <input type="date" value={vehicleFormData.SRV_ASSIGN_DATE} onChange={(e) => setVehicleFormData({ ...vehicleFormData, SRV_ASSIGN_DATE: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/50 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks</label>
                                    <textarea value={vehicleFormData.SRV_REMARKS} onChange={(e) => setVehicleFormData({ ...vehicleFormData, SRV_REMARKS: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/50 outline-none h-24 resize-none" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="flex-1 px-6 py-4 bg-slate-100 dark:bg-[#0f172a] text-slate-600 dark:text-[#94a3b8] font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-[#334155] transition-all">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-[2] px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        <span>{isSaving ? 'Processing...' : 'Assign Vehicle'}</span>
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

export default SalesRepManagement;
