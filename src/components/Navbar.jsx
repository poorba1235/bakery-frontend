import { LayoutDashboard, LogOut, Moon, Sun, UserCircle, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'User Management', path: '/users', icon: Users },
    ];

    return (
        <nav className="bg-white dark:bg-[#1e293b] border-b border-slate-300 dark:border-[#334155] sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between h-16">
                    <div className="flex space-x-8">
                        <div className="flex items-center">
                            <img src='/logo.png' alt="Logo" className="h-10 w-10" />
                            <span className="text-blue-500 font-bold text-xl tracking-tight">INDIKA BAKERY</span>
                        </div>
                        <div className="hidden md:flex space-x-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors border-b-2 ${location.pathname === item.path
                                        ? 'border-blue-500 text-blue-600 dark:text-white'
                                        : 'border-transparent text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-[#334155]'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4 mr-2" />
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-[#94a3b8]">
                            <UserCircle className="w-6 h-6 text-blue-500" />
                            <span className="text-sm font-medium">{user?.username}</span>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="bg-slate-50 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-800 dark:text-white p-2 rounded-lg transition-colors border border-slate-300 dark:border-[#334155]"
                            title="Toggle Theme"
                        >
                            {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
                        </button>
                        <button
                            onClick={logout}
                            className="bg-slate-50 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-800 dark:text-white p-2 rounded-lg transition-colors border border-slate-300 dark:border-[#334155]"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5 text-red-500" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
