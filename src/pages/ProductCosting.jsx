import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calculator, 
    Plus, 
    Package, 
    ChevronRight, 
    Edit2,
    Trash2,
    Save,
    X,
    Tag,
    ListTree
} from 'lucide-react';
import { useState } from 'react';

const ProductCosting = () => {
    // Mock Data
    const [items] = useState([
        { id: 1, item_name: 'Sandwich Bread', category_name: 'Bread', sub_category_name: 'Sliced', shop_price: 180, created_at: new Date() },
        { id: 2, item_name: 'Chocolate Bun', category_name: 'Buns', sub_category_name: 'Sweet', shop_price: 85, created_at: new Date() }
    ]);
    const [categories] = useState([{ id: 1, name: 'Bread' }, { id: 2, name: 'Buns' }]);
    
    const [showProductModal, setShowProductModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    return (
        <div className="p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-[#0f172a]">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Products & Recipe Hub (Static)</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">UI skeleton for item management and BOM configuration.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowCategoryModal(true)}
                        className="bg-white dark:bg-[#1e293b] text-slate-700 dark:text-white px-5 py-3 rounded-2xl border border-slate-300 flex items-center space-x-2 font-semibold shadow-sm"
                    >
                        <ListTree size={18} className="text-blue-500" />
                        <span>Categories</span>
                    </button>
                    <button 
                        onClick={() => setShowProductModal(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 shadow-lg font-semibold"
                    >
                        <Plus size={20} />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-[40px] overflow-hidden shadow-xl">
                <div className="p-8 border-b border-slate-200 dark:border-[#334155]">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                        <Tag className="mr-2 text-blue-500" /> Catalog (Demo Only)
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-8 py-6">Product Information</th>
                                <th className="px-8 py-6">Category Path</th>
                                <th className="px-8 py-6 text-right">Selling Price</th>
                                <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><Package size={20} /></div>
                                            <span className="text-slate-800 dark:text-white font-bold text-sm">{item.item_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-white uppercase tracking-wider block mb-0.5">{item.category_name}</span>
                                        <span className="text-slate-700 dark:text-white font-semibold">{item.sub_category_name}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right font-bold text-base text-slate-800 dark:text-white">Rs. {parseFloat(item.shop_price).toFixed(2)}</td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button className="p-2 text-slate-400 hover:text-blue-500"><Edit2 size={18} /></button>
                                            <button className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Demos */}
            <AnimatePresence>
                {(showProductModal || showCategoryModal) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowProductModal(false); setShowCategoryModal(false); }} />
                        <div className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl p-10 shadow-2xl text-center">
                            <h3 className="text-2xl font-bold mb-6">Demo Interface</h3>
                            <p className="text-slate-500 mb-8">Backend logic and database tables for Products, Categories, and Recipes have been removed. This is now a static UI template.</p>
                            <button onClick={() => { setShowProductModal(false); setShowCategoryModal(false); }} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl">Dismiss</button>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductCosting;
