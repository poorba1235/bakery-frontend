import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    Box,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Database,
    FileText,
    Globe,
    Home,
    Layers,
    LayoutDashboard,
    LogOut,
    Menu,
    Package,
    Settings,
    ShoppingCart,
    ShoppingBag,
    Users,
    X,
    FlaskConical,
    Warehouse,
    MapPin,
    Receipt,
    ChefHat,
    Truck
} from 'lucide-react';
import React, { useState,useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isCollapsed, onToggle }) => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState([]);

    useEffect(() => {
        // Automatically expand the menu section containing the active path
        const activeMenu = menuItems.find(item => 
            item.subItems?.some(sub => sub.path === location.pathname)
        );
        if (activeMenu && !expandedMenus.includes(activeMenu.name)) {
            setExpandedMenus(prev => [...new Set([...prev, activeMenu.name])]);
        }
    }, [location.pathname]);

    const menuItems = [
        {
            name: 'Dashboard',
            icon: LayoutDashboard,
            path: '/',
        },
       
       
       
        {
            name: 'Product',
            icon: Box,
            permission: 'categorey',
            subItems: [
                { name: 'Product Category', path: '/product/category', icon: Layers },
                { name: 'Product Master', path: '/product/items', icon: Package },
                { name: 'Recipe Master', path: '/product/recipe', icon: ChefHat }
            ]
        },
        {
            name: 'Orders & Sales',
            icon: ShoppingCart,
            permission: 'order-manage',
            subItems: [
                { name: 'Production Orders', path: '/inventory/orders', icon: ShoppingBag },
                { name: 'Order Cross Check', path: '/inventory/order-cross-check', icon: ClipboardList },
                { name: 'Storefront POS', path: '/pos', icon: Receipt }
            ]
        },
        {
            name: 'Raw Material',
            icon: FlaskConical,
            permission: 'raw-material',
            subItems: [
                { name: 'Raw Material Category', path: '/raw-material/category', icon: Layers },
                { name: 'Raw Materials', path: '/raw-material/items', icon: Package },
                { name: 'Goods Received (GRN)', path: '/inventory/grn', icon: Receipt }
            ]
        },
        {
            name: 'Warehouse',
            icon: Warehouse,
            permission: 'warehouse',
            subItems: [
                { name: 'Warehouse Location', path: '/warehouse/location', icon: MapPin }
            ]
        },
        {
            name: 'Table Maintain',
            icon: Database,
            permission: 'table-maintain',
            subItems: [
                { name: 'Country', path: '/maintain/country', icon: Globe },
                { name: 'Country City', path: '/maintain/country-city', icon: Globe },
                { name: 'Vehicle Management', path: '/maintain/vehicles', icon: Truck },
                { name: 'Area & Route', path: '/maintain/area-route', icon: MapPin },
                { name: 'Sales Representative', path: '/maintain/sales-rep', icon: Users },
                { name: 'Suppliers', path: '/suppliers', icon: Users, permission: 'supply-customer' },
                // { name: 'Tax', path: '/maintain/tax', icon: Receipt, permission: 'tax' }
            ]
        },
        {
            name: 'Users',
            icon: Users,
            path: '/users',
            permission: 'manage_users'
        },

        {
            name: 'Reports',
            icon: FileText,
            path: '/reports',
            permission: 'view_reports'
        },
        {
            name: 'Change Password',
            icon: Settings,
            path: '/change-password'
        },
    ];

    const perms = user?.permissions?.split(',') || [];

    const filteredMenuItems = menuItems.filter(item => {
        // If it's a simple link, check its permission
        if (!item.subItems) {
            return !item.permission || perms.includes(item.permission);
        }

        // If it's a group, check if the parent permission is met
        // OR if any of its sub-items are accessible
        const hasParentPermission = !item.permission || perms.includes(item.permission);
        const hasAccessibleSubItem = item.subItems.some(sub => !sub.permission || perms.includes(sub.permission));

        return hasParentPermission || hasAccessibleSubItem;
    });

    const toggleMenu = (name) => {
        setExpandedMenus(prev => 
            prev.includes(name) 
                ? prev.filter(m => m !== name)
                : [...prev, name]
        );
    };

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        setShowLogoutConfirm(false);
    };

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-[#1e293b] rounded-lg shadow-lg border border-slate-200 dark:border-[#334155]"
            >
                <Menu className="w-6 h-6 text-slate-600 dark:text-white" />
            </button>

            {/* Logout Confirmation Modal */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setShowLogoutConfirm(false)} 
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }} 
                            className="relative w-full max-w-sm bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-300 dark:border-[#334155] shadow-2xl p-8 text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <LogOut className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Confirm Logout</h3>
                            <p className="text-slate-600 dark:text-[#94a3b8] mb-8">Are you sure you want to log out of your account?</p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-[#334155] text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-[#404e63] transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmLogout}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all"
                                >
                                    Logout
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{
                    width: isCollapsed ? '80px' : '280px',
                    x: isMobileOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -300 : 0)
                }}
                className={`fixed top-0 left-0 h-screen bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-[#1e293b] z-[70] transition-all flex flex-col shadow-2xl lg:shadow-none`}
            >
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 dark:border-[#1e293b]">
                    {(!isCollapsed || isMobileOpen) && (
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                                <Package className="text-white w-6 h-6" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">Indika<span className="text-blue-600">Bakery</span></span>
                        </div>
                    )}
                    <button
                        onClick={onToggle}
                        className="hidden lg:flex p-2 hover:bg-slate-100 dark:hover:bg-[#1e293b] rounded-lg text-slate-500 transition-colors"
                    >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-[#1e293b] rounded-lg text-slate-500"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-2 custom-scrollbar">
                    {filteredMenuItems.map((item) => (
                        <div key={item.name}>
                            {item.subItems ? (
                                <div>
                                    <button
                                        onClick={() => toggleMenu(item.name)}
                                        className={`w-full flex items-center px-4 py-3 rounded-xl transition-all group ${
                                            expandedMenus.includes(item.name) 
                                                ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 font-bold' 
                                                : 'text-slate-600 dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-[#1e293b]'
                                        }`}
                                    >
                                        <item.icon className="shrink-0 w-5 h-5" />
                                        {(!isCollapsed || isMobileOpen) && (
                                            <>
                                                <span className="ml-3 font-semibold flex-1 text-left">{item.name}</span>
                                                {expandedMenus.includes(item.name) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </>
                                        )}
                                    </button>
                                    <AnimatePresence>
                                        {expandedMenus.includes(item.name) && (!isCollapsed || isMobileOpen) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden ml-4 mt-1 space-y-1"
                                            >
                                                {item.subItems
                                                    .filter(sub => !sub.permission || perms.includes(sub.permission))
                                                    .map((sub) => (
                                                        <Link
                                                            key={sub.name}
                                                            to={sub.path}
                                                            onClick={() => setIsMobileOpen(false)}
                                                            className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                                location.pathname === sub.path
                                                                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-600/10 font-bold'
                                                                    : 'text-slate-500 dark:text-[#64748b] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-600/5'
                                                            }`}
                                                        >
                                                            <sub.icon className="w-4 h-4 mr-3" />
                                                            {sub.name}
                                                        </Link>
                                                    ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <Link
                                    to={item.path}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-xl transition-all group ${
                                        location.pathname === item.path
                                            ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 font-bold shadow-sm shadow-blue-600/5'
                                            : 'text-slate-600 dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-[#1e293b]'
                                    }`}
                                >
                                    <item.icon className="shrink-0 w-5 h-5" />
                                    {(!isCollapsed || isMobileOpen) && (
                                        <span className="ml-3 font-semibold">{item.name}</span>
                                    )}
                                </Link>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-[#1e293b]">
                    <button
                        onClick={handleLogoutClick}
                        className="w-full flex items-center px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-semibold"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        {(!isCollapsed || isMobileOpen) && <span>Logout</span>}
                    </button>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;
