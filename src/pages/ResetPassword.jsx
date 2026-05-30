import { motion } from 'framer-motion';
import { ArrowLeft, KeyRound, Loader2, Lock, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const ResetPassword = () => {
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const { showNotification } = useNotification();
    const { directResetPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        setStatus('loading');
        try {
            const response = await directResetPassword(username, newPassword);
            showNotification(response.message, 'success');
            setStatus('success');
            setMessage(response.message);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            showNotification(err.response?.data?.error || 'Failed to reset password', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden border border-slate-300 dark:border-[#334155]"
            >
                <div className="p-8">
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <KeyRound className="w-8 h-8 text-slate-800 dark:text-white" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-center text-slate-800 dark:text-white mb-2">Reset Password</h2>
                    <p className="text-slate-600 dark:text-[#94a3b8] text-center mb-8">Enter your username and new password.</p>

                    {status === 'success' ? (
                        <div className="space-y-6">
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-center">
                                {message} Redirecting to login...
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8] ml-1">Username</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#64748b]">
                                        <User className="w-5 h-5" />
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        maxLength={50}
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                        placeholder="Enter your username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8] ml-1">New Password</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#64748b]">
                                        <Lock className="w-5 h-5" />
                                    </span>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600 dark:text-[#94a3b8] ml-1">Confirm Password</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#64748b]">
                                        <Lock className="w-5 h-5" />
                                    </span>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {status === 'error' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm"
                                >
                                    {message}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
                            >
                                {status === 'loading' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <span>Reset Password</span>
                                )}
                            </button>

                            <div className="text-center">
                                <Link to="/login" className="text-slate-600 dark:text-[#94a3b8] hover:text-slate-800 dark:text-white flex items-center justify-center space-x-2 transition-colors">
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back to Login</span>
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
