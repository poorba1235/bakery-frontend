import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, 
    Box,
    History,
    X,
    Plus
} from 'lucide-react';
import { useState } from 'react';

const ProductionReporting = () => {
    // Mock Data
    const [reports] = useState([
        { id: 1, item_name: 'Sandwich Bread', quantity: 150, cost: 45.20, time: new Date().toLocaleString(), user: 'Admin' },
        { id: 2, item_name: 'Chocolate Cake', quantity: 12, cost: 850.00, time: new Date().toLocaleString(), user: 'Chef John' }
    ]);

    const [showModal, setShowModal] = useState(false);

    return (
        <div className="p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-[#0f172a]">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Production Reporting (Static)</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">UI skeleton for logging daily production.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all font-semibold active:scale-95"
                    >
                        <Zap className="w-5 h-5" />
                        <span>Log Production</span>
                    </button>
                </div>
            </div>

            {/* Production History */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-[40px] overflow-hidden shadow-xl">
                <div className="p-8 border-b border-slate-200 dark:border-[#334155]">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                        <History className="mr-2 text-blue-500" /> Recent Logs (Demo Only)
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-8 py-6">Product Details</th>
                                <th className="px-8 py-6">Quantity Produced</th>
                                <th className="px-8 py-6">Audit Info</th>
                                <th className="px-8 py-6">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                            {reports.map((report) => (
                                <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors group text-sm">
                                    <td className="px-8 py-6 flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500"><Box size={16} /></div>
                                        <span className="font-semibold text-slate-800 dark:text-white">{report.item_name}</span>
                                    </td>
                                    <td className="px-8 py-6 text-lg font-bold text-slate-800 dark:text-white">{report.quantity} units</td>
                                    <td className="px-8 py-6 text-xs font-bold uppercase text-slate-600 dark:text-white">By: {report.user}</td>
                                    <td className="px-8 py-6 text-xs text-slate-500 dark:text-white">{report.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Demo */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <div className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-3xl p-10 shadow-2xl text-center">
                            <h3 className="text-2xl font-bold mb-6">Log Production (Demo)</h3>
                            <p className="text-slate-500 mb-8">This page is now static. Backend production logging and automated inventory deduction have been removed.</p>
                            <button onClick={() => setShowModal(false)} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl">Dismiss Demo</button>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductionReporting;
