import { AnimatePresence, motion } from 'framer-motion';
import { Edit2, Loader2, Save, Search, Trash2, UserCheck, UserPlus, X, Eye, EyeOff, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');

    // Auth Check
    const perms = currentUser?.permissions?.split(',') || [];
    const hasManageUsers = perms.includes('manage_users');
    const roles_list = currentUser?.roles?.toLowerCase() || '';
    const isSuperAdmin = roles_list.includes('super admin');


    if (!hasManageUsers && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-600 dark:text-[#94a3b8] max-w-md">You do not have the required permissions to manage users. Please contact your administrator.</p>
            </div>
        );
    }

    // Modals state
    const [editingUser, setEditingUser] = useState(null);
    const [viewingUser, setViewingUser] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form states
    const [isSaving, setIsSaving] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        roleId: '',
        permissionIds: []
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [usersRes, rolesRes, permsRes] = await Promise.all([
                api.get('/users/all'),
                api.get('/users/roles'),
                api.get('/users/permissions')
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
            setAllPermissions(permsRes.data);

            const filteredRoles = rolesRes.data.filter(r => {
                const name = r.role_name.toLowerCase();
                if (name === 'super admin') return false;
                if (!isSuperAdmin && !roles_list.includes('admin')) {
                    return name === 'staff' || name === 'sales ref';
                }
                return true;
            });
            if (filteredRoles.length > 0) {
                setNewUser(prev => ({ ...prev, roleId: filteredRoles[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const [deletingId, setDeletingId] = useState(null);

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        setDeletingId(userId);
        try {
            await api.delete(`/users/${userId}`);
            setUsers(users.filter(u => u.id !== userId));
            showNotification('User deleted successfully', 'success');
        } catch (error) {
            showNotification('Failed to delete user', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.put(`/users/${editingUser.id}`, {
                username: editingUser.username,
                roleId: editingUser.roleId,
                permissionIds: editingUser.permissionIds
            });
            const usersRes = await api.get('/users/all');
            setUsers(usersRes.data);
            setEditingUser(null);
            showNotification('User updated successfully', 'success');
        } catch (error) {
            showNotification('Failed to update user', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(newUser.password)) {
            showNotification('Password must be at least 8 characters, include an uppercase letter and a symbol', 'error');
            return;
        }

        if (newUser.password !== newUser.confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await api.post('/users', newUser);
            const usersRes = await api.get('/users/all');
            setUsers(usersRes.data);
            setIsAddModalOpen(false);
            setNewUser({ username: '', password: '', confirmPassword: '', roleId: roles[0]?.id || '', permissionIds: [] });
            showNotification('User added successfully', 'success');
        } catch (error) {
            showNotification(error.response?.data?.error || 'Failed to add user', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const isStaffOrSales = roles_list.includes('staff');

    const filteredUsers = users
        .filter(u => {
            const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
            const targetRole = u.roles?.toLowerCase() || '';
            const isTargetSuperAdmin = targetRole.includes('super admin');
            const isTargetAdmin = targetRole.includes('admin');
            
            // Always hide Super Admin users from everyone as per previous request
            if (isTargetSuperAdmin) return false;

            // If current user is Staff or Sales Ref, hide any Admin users
            if (isStaffOrSales && isTargetAdmin) return false;
            
            return matchesSearch;
        })
        .sort((a, b) => b.id - a.id);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">User Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Manage system users, their status, and permissions.</p>
                </div>
                {hasManageUsers && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all font-semibold"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span>Add New User</span>
                    </button>
                )}
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-300 dark:border-[#334155] mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search by username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-6 py-4">User Details</th>
                                <th className="px-6 py-4">Security Role</th>
                                {/* <th className="px-6 py-4">Permission Overrides</th> */}
                                <th className="px-6 py-4">Created By</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No users found matching your search.</td>
                                </tr>
                            ) : filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-slate-800 dark:text-white font-bold text-sm truncate tracking-tight">{user.username}</div>
                                                <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-[#94a3b8]">ID: #{user.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-slate-50 dark:bg-[#0f172a] text-slate-600 dark:text-white text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-[#334155] rounded-lg shadow-sm">
                                            {user.roles || 'No Role'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-white">{user.creator_name || 'System'}</span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {hasManageUsers ? (
                                                <>
                                                    <button
                                                        onClick={() => setViewingUser(user)}
                                                        className="p-3 text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all shadow-sm"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingUser({
                                                            ...user,
                                                            permissionIds: user.directPermissionIds ? String(user.directPermissionIds).split(',').filter(Boolean).map(Number) : [],
                                                            rolePermissionIds: user.rolePermissionIds ? String(user.rolePermissionIds).split(',').filter(Boolean).map(Number) : []
                                                        })}
                                                        className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(user.id)} 
                                                        disabled={deletingId === user.id}
                                                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm disabled:opacity-50"
                                                    >
                                                        {deletingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="p-2 text-slate-300">
                                                    <ShieldAlert className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredUsers.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredUsers.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredUsers.length, currentPage * itemsPerPage)} of {filteredUsers.length} users
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
                                {[...Array(Math.ceil(filteredUsers.length / itemsPerPage))].map((_, i) => (
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
                                disabled={currentPage === Math.ceil(filteredUsers.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredUsers.length / itemsPerPage), prev + 1))}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center"><UserPlus className="mr-2 text-blue-500" /> Add New User</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 dark:text-[#64748b] hover:text-slate-800 dark:text-white"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleAddUser} className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Username</label>
                                        <input type="text" required maxLength={50} value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. jsmith" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Assign Role</label>
                                        <select value={newUser.roleId} onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                            {roles.filter(r => {
                                                const name = r.role_name.toLowerCase();
                                                if (name === 'super admin') return false;
                                                if (!isSuperAdmin && !roles_list.includes('admin')) {
                                                    return name === 'staff' || name === 'sales ref';
                                                }
                                                return true;
                                            }).map(role => (
                                                <option key={role.id} value={role.id}>{role.role_name.charAt(0).toUpperCase() + role.role_name.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Password</label>
                                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/5 px-2 py-0.5 rounded-md border border-blue-500/10">Min. 8 chars</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type={showPassword ? "text" : "password"} 
                                                required 
                                                value={newUser.password} 
                                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} 
                                                className={`w-full bg-slate-50 dark:bg-[#0f172a] border rounded-xl py-2.5 pl-4 pr-12 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${newUser.password && (newUser.password.length < 8 || !/[A-Z]/.test(newUser.password) || !/[^A-Za-z0-9]/.test(newUser.password)) ? 'border-amber-500/50' : 'border-slate-300 dark:border-[#334155]'}`}
                                                placeholder="••••••••" 
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {newUser.password && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${newUser.password.length >= 8 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/10'}`}>8+ Chars</span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${/[A-Z]/.test(newUser.password) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/10'}`}>Capital</span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${/[^A-Za-z0-9]/.test(newUser.password) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/10'}`}>Symbol</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Confirm Password</label>
                                        <div className="relative">
                                            <input 
                                                type={showConfirmPassword ? "text" : "password"} 
                                                required 
                                                value={newUser.confirmPassword} 
                                                onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })} 
                                                className={`w-full bg-slate-50 dark:bg-[#0f172a] border rounded-xl py-2.5 pl-4 pr-12 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${newUser.confirmPassword && newUser.password !== newUser.confirmPassword ? 'border-red-500' : 'border-slate-300 dark:border-[#334155]'}`} 
                                                placeholder="••••••••" 
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {newUser.confirmPassword && newUser.password !== newUser.confirmPassword && (
                                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1">Passwords do not match</p>
                                        )}

                                        
                                    </div>

                                    <div className="md:col-span-2 space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                        <label className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Direct Permissions</label>
                                        <div className="bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-2xl p-4 max-h-48 overflow-y-auto grid grid-cols-2 gap-3">
                                            {allPermissions.map(perm => (
                                                <label key={perm.id} className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-xl transition-all border border-transparent hover:border-blue-500/30 dark:hover:border-blue-500/30">
                                                    <input
                                                        type="checkbox"
                                                        checked={newUser.permissionIds.includes(perm.id)}
                                                        onChange={(e) => {
                                                            const ids = e.target.checked
                                                                ? [...newUser.permissionIds, perm.id]
                                                                : newUser.permissionIds.filter(id => id !== perm.id);
                                                            setNewUser({ ...newUser, permissionIds: ids });
                                                        }}
                                                        className="w-4 h-4 bg-white dark:bg-[#1e293b] border-slate-300 dark:border-[#334155] rounded text-blue-600 focus:ring-blue-500 transition-colors"
                                                    />
                                                    <span className="text-xs font-medium text-slate-600 dark:text-[#94a3b8] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {perm.permission_name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-200 dark:bg-[#334155] text-slate-800 dark:text-white font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-[#404e63]">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                                        <span>{isSaving ? 'Creating...' : 'Create User'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Modal */}
            <AnimatePresence>
                {viewingUser && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingUser(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between bg-slate-50/50 dark:bg-[#0f172a]/50">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-500/20">
                                        {viewingUser.username[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{viewingUser.username}</h3>
                                        <div className="flex items-center space-x-2">
                                            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/20">ID: #{viewingUser.id}</span>
                                            <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest">{viewingUser.roles || 'No Role'}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setViewingUser(null)} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-white rounded-2xl transition-all shadow-sm border border-slate-200 dark:border-slate-700"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><UserCheck className="w-3 h-3 mr-1" /> Account Created</span>
                                        <div className="text-sm font-bold text-slate-700 dark:text-white">{viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleString() : 'N/A'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Shield className="w-3 h-3 mr-1" /> Created By</span>
                                        <div className="text-sm font-bold text-slate-700 dark:text-white">{viewingUser.creator_name || 'System Administrator'}</div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Permission Overrides</h4>
                                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-widest">Direct Overrides</span>
                                    </div>
                                    
                                    {viewingUser.direct_permissions ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {viewingUser.direct_permissions.split(',').map((perm, idx) => (
                                                <div key={idx} className="bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] p-3 rounded-2xl flex items-center space-x-2 shadow-sm group hover:border-blue-500/50 transition-all">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter truncate">{perm.replace(/_/g, ' ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-[#0f172a] border-2 border-dashed border-slate-200 dark:border-[#334155] p-8 rounded-[2rem] text-center">
                                            <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3 opacity-20" />
                                            <p className="text-slate-400 dark:text-slate-600 font-bold text-xs uppercase tracking-widest">No individual permission overrides found</p>
                                            <p className="text-[10px] text-slate-500 mt-1 italic">This user inherits all permissions from their assigned security role.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-end">
                                <button onClick={() => setViewingUser(null)} className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl tracking-widest uppercase text-xs">Close Details</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingUser(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden" >
                            <div className="p-6 border-b border-slate-300 dark:border-[#334155] flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center"><Edit2 className="mr-2 text-blue-500" /> Edit User</h3>
                                <button onClick={() => setEditingUser(null)} className="text-slate-500 dark:text-[#64748b] hover:text-slate-800 dark:text-white"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Username</label>
                                        <input type="text" maxLength={50} value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8]">Change Role</label>
                                        <select value={editingUser.roleId} onChange={(e) => setEditingUser({ ...editingUser, roleId: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-2.5 px-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                            {roles.filter(r => {
                                                const name = r.role_name.toLowerCase();
                                                if (name === 'super admin') return false;
                                                if (!isSuperAdmin && !roles_list.includes('admin')) {
                                                    return name === 'staff' || name === 'sales ref';
                                                }
                                                return true;
                                            }).map(role => (
                                                <option key={role.id} value={role.id}>{role.role_name.charAt(0).toUpperCase() + role.role_name.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                        <label className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Direct Permissions Overrides</label>
                                        <div className="bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-2xl p-4 max-h-48 overflow-y-auto grid grid-cols-2 gap-3">
                                            {allPermissions.map(perm => (
                                                <label key={perm.id} className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-xl transition-all border border-transparent hover:border-blue-500/30 dark:hover:border-blue-500/30">
                                                    <input
                                                        type="checkbox"
                                                        checked={(editingUser.permissionIds || []).includes(perm.id)}
                                                        onChange={(e) => {
                                                            const currentIds = editingUser.permissionIds || [];
                                                            const ids = e.target.checked
                                                                ? [...currentIds, perm.id]
                                                                : currentIds.filter(id => id !== perm.id);
                                                            setEditingUser({ ...editingUser, permissionIds: ids });
                                                        }}
                                                        className="w-4 h-4 bg-white dark:bg-[#1e293b] border-slate-300 dark:border-[#334155] rounded text-blue-600 focus:ring-blue-500 transition-colors"
                                                    />
                                                    <span className="text-xs font-medium text-slate-600 dark:text-[#94a3b8] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {perm.permission_name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-6 py-3 bg-slate-200 dark:bg-[#334155] text-slate-800 dark:text-white font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-[#404e63]">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>Save Changes</span>
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

export default UserManagement;
