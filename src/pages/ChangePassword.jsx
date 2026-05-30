import { motion, AnimatePresence } from 'framer-motion';
import { Key, Loader2, Save, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const ChangePassword = () => {
    const { showNotification } = useNotification();
    const [isSaving, setIsSaving] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            showNotification('New passwords do not match', 'error');
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(formData.newPassword)) {
            showNotification('Password must be at least 8 characters, include an uppercase letter and a symbol', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/users/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            showNotification('Password changed successfully', 'success');
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            showNotification(error.response?.data?.error || 'Failed to change password', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 md:p-10 min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
            <div className="max-w-2xl mx-auto">
                <header className="mb-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-4"
                    >
                        <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 text-white">
                            <Key className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Security Settings</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Manage your account credentials</p>
                        </div>
                    </motion.div>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-200 dark:border-[#334155] shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden"
                >
                    <div className="p-8 md:p-12">
                        <div className="flex items-center space-x-3 mb-8">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white">Change Password</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrent ? "text" : "password"}
                                            required
                                            value={formData.currentPassword}
                                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 pl-6 pr-14 text-sm text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                            placeholder="Enter your current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrent(!showCurrent)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                                            <div className="flex space-x-2">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border transition-all ${formData.newPassword.length >= 8 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm shadow-emerald-500/10' : 'bg-slate-500/5 text-slate-400 border-slate-500/10'}`}>8+ Chars</span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border transition-all ${/[A-Z]/.test(formData.newPassword) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm shadow-emerald-500/10' : 'bg-slate-500/5 text-slate-400 border-slate-500/10'}`}>Capital</span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border transition-all ${/[^A-Za-z0-9]/.test(formData.newPassword) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm shadow-emerald-500/10' : 'bg-slate-500/5 text-slate-400 border-slate-500/10'}`}>Symbol</span>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showNew ? "text" : "password"}
                                                required
                                                value={formData.newPassword}
                                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                                className={`w-full bg-slate-50 dark:bg-[#0f172a] border rounded-2xl py-4 pl-6 pr-14 text-sm text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all ${formData.newPassword && (formData.newPassword.length < 8 || !/[A-Z]/.test(formData.newPassword) || !/[^A-Za-z0-9]/.test(formData.newPassword)) ? 'border-amber-500/50' : 'border-slate-200 dark:border-[#334155] focus:border-indigo-500'}`}
                                                placeholder="Min. 8 characters"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNew(!showNew)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirm ? "text" : "password"}
                                                required
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 pl-6 pr-14 text-sm text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                                placeholder="Repeat new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center space-x-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Updating Security...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            <span>Update Password</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Security Recommendation</h4>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Use a strong password that includes uppercase letters, numbers, and special characters. Do not share your password with anyone else.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ChangePassword;
