import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useState } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'info', duration) => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        const hideDuration = duration || (type === 'error' ? 10000 : 3000);

        if (hideDuration) {
            setTimeout(() => {
                removeNotification(id);
            }, hideDuration);
        }
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {notifications.map((n) => (
                        <Toast key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};

const Toast = ({ notification, onClose }) => {
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
        info: <Info className="w-5 h-5 text-blue-400" />,
        error: <AlertCircle className="w-5 h-5 text-red-400" />,
        warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
    };

    const bgColors = {
        success: 'bg-emerald-500/10 border-emerald-500/20',
        info: 'bg-blue-500/10 border-blue-500/20',
        error: 'bg-red-500/10 border-red-500/20',
        warning: 'bg-white dark:bg-slate-900 border-amber-500/30',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`pointer-events-auto min-w-[300px] max-w-md ${bgColors[notification.type]} border backdrop-blur-md rounded-xl p-4 shadow-2xl flex items-start gap-3`}
        >
            <div className="shrink-0 mt-0.5">
                {icons[notification.type]}
            </div>
            <div className="flex-1 text-sm font-medium text-slate-800 dark:text-white">
                {notification.message}
            </div>
            <button
                onClick={onClose}
                className="shrink-0 text-slate-500 dark:text-[#64748b] hover:text-slate-800 dark:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};
