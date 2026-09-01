import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowRight,
    Beaker,
    Calculator,
    CheckCircle2,
    Coins,
    Copy,
    DollarSign,
    Info,
    Loader2,
    Package,
    Percent,
    Printer,
    RefreshCw,
    Scale,
    ShieldAlert,
    Sparkles,
    TrendingUp,
    Utensils
} from 'lucide-react';
import { useEffect, useState } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const ProfitCalculator = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();

    const userRoles = currentUser?.roles?.toLowerCase() || '';
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super admin');

    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [costData, setCostData] = useState(null);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isLoadingCost, setIsLoadingCost] = useState(false);

    // User inputs
    const [autoCalQty, setAutoCalQty] = useState(1);
    const [profitPercentage, setProfitPercentage] = useState(50);
    const [copied, setCopied] = useState(false);

    if (!isAdmin && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-rose-500/5">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">This Profit Calculator is restricted to Admin users only.</p>
            </div>
        );
    }

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setIsLoadingProducts(true);
        try {
            // Fetch all products that have recipes
            const res = await api.get('/product/order-items');
            setProducts(res.data || []);
        } catch (error) {
            showNotification('Failed to load product list', 'error');
        } finally {
            setIsLoadingProducts(false);
        }
    };

    useEffect(() => {
        if (selectedProductId) {
            const prod = products.find(p => String(p.P_ID) === String(selectedProductId));
            setSelectedProduct(prod || null);
            fetchRecipeCost(selectedProductId);
        } else {
            setSelectedProduct(null);
            setCostData(null);
            setAutoCalQty(1);
        }
    }, [selectedProductId]);

    const fetchRecipeCost = async (productId) => {
        setIsLoadingCost(true);
        try {
            const res = await api.get(`/recipe/product-cost/${productId}`);
            setCostData(res.data);
            if (res.data && res.data.header) {
                setAutoCalQty(res.data.header.RECH_MADE_QTY || 1);
            }
        } catch (error) {
            setCostData(null);
            if (error.response && error.response.status === 404) {
                showNotification('No recipe found for this selected product', 'warning');
            } else {
                showNotification('Error loading recipe cost details', 'error');
            }
        } finally {
            setIsLoadingCost(false);
        }
    };

    // Formatted numeric values
    const safeQty = Math.max(parseFloat(autoCalQty) || 1, 0.0001);
    const safePercentage = parseFloat(profitPercentage) || 0;

    // Calculations
    // 1. Total Recipe Cost Price (Material Cost + Store Expenses)
    const recipeCostPrice = costData ? Number(costData.totalCost) : 0;

    // STEP 1: Divide recipe cost price by auto cal qty to get unit cost price
    const val1 = recipeCostPrice > 0 ? (recipeCostPrice / safeQty) : 0;

    // STEP 2: Multiply val1 by user input profit percentage (e.g., 50%)
    const val2 = val1 * (safePercentage / 100);

    // FINAL SUM: 1 and 2 sum
    const finalSum = val1 + val2;

    // Batch calculations
    const totalBatchProfit = val2 * safeQty;
    const totalBatchRevenue = finalSum * safeQty;

    const handleCopySummary = () => {
        if (!selectedProduct || !costData) return;
        const text = `=== Profit Calculation Summary ===
Product: ${selectedProduct.P_NAME} (${selectedProduct.P_CODE})
Recipe Total Cost: Rs. ${recipeCostPrice.toFixed(2)}
Auto Cal Qty (Yield): ${safeQty} units

Step 1 (Unit Cost Price - Val1): Rs. ${val1.toFixed(2)}
Step 2 (Profit ${safePercentage}% - Val2): Rs. ${val2.toFixed(2)}

FINAL SUM (Selling Price / Unit): Rs. ${finalSum.toFixed(2)}
Total Batch Profit: Rs. ${totalBatchProfit.toFixed(2)}
Total Batch Revenue: Rs. ${totalBatchRevenue.toFixed(2)}
=================================`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        showNotification('Profit calculation summary copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 3000);
    };

    const handlePrint = () => {
        window.print();
    };

    const percentagePresets = [20, 30, 40, 50, 60, 75, 100];

    return (
        <div className="p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-[#0f172a] space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#1e293b] p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-xl">
                <div className="flex items-center space-x-5">
                    <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                        <Calculator className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Profit Calculator</h1>
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-500/20 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Auto Cal
                            </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                            Calculate recipe unit cost, apply profit margin percentage, and estimate selling prices.
                        </p>
                    </div>
                </div>

                {costData && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCopySummary}
                            className="flex items-center space-x-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-2xl transition-all shadow-sm active:scale-95"
                        >
                            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-blue-500" />}
                            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
                        </button>
                        {/* <button
                            onClick={handlePrint}
                            className="flex items-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print</span>
                        </button> */}
                    </div>
                )}
            </div>

            {/* Product Select Card */}
            <div className="bg-white dark:bg-[#1e293b] p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">
                            Step 1: Select Product
                        </label>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Choose Finished Good with Recipe</h2>
                    </div>

                    {selectedProduct && (
                        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-600/10 px-4 py-2 rounded-2xl border border-blue-200 dark:border-blue-500/20">
                            <Package className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Code: <span className="text-blue-600 dark:text-blue-400 font-mono">{selectedProduct.P_CODE}</span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="max-w-2xl">
                    <SearchableSelect
                        options={products.map(p => ({ value: p.P_ID, label: `${p.P_NAME} (${p.P_CODE})` }))}
                        value={selectedProductId}
                        onChange={(val) => setSelectedProductId(val)}
                        placeholder="Search & Select Product..."
                    />
                </div>
            </div>

            {/* Main Calculation Grid */}
            {isLoadingCost ? (
                <div className="bg-white dark:bg-[#1e293b] p-16 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-xl text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Fetching Recipe Cost & Formulas...</p>
                </div>
            ) : !selectedProductId ? (
                <div className="bg-white dark:bg-[#1e293b] p-16 rounded-3xl border border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-500">
                        <Package className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">No Product Selected</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm font-medium">
                        Please select a product from the dropdown above to load its recipe costs and calculate profit margins.
                    </p>
                </div>
            ) : !costData ? (
                <div className="bg-white dark:bg-[#1e293b] p-16 rounded-3xl border border-amber-200 dark:border-amber-500/20 shadow-xl text-center space-y-4">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">No Recipe Found</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm font-medium">
                        Selected product <strong className="text-slate-800 dark:text-white">{selectedProduct?.P_NAME}</strong> does not have an active recipe assigned in Recipe Master.
                    </p>
                </div>
            ) : (
                <>
                    {/* Calculation Cards: Step 1, Step 2, Final Sum */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* STEP 1 CARD */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-blue-200 dark:border-blue-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-500/20">
                                        Step 1
                                    </span>
                                    <Scale className="w-5 h-5 text-blue-500" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">1. Recipe Cost / Auto Cal Amount</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Recipe Cost ÷ Auto Cal Qty</p>
                                </div>

                                {/* Controls */}
                                <div className="space-y-3 bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-bold">Recipe Total Cost:</span>
                                        <span className="font-mono font-bold text-slate-800 dark:text-white">Rs. {recipeCostPrice.toFixed(2)}</span>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                            Auto Cal Qty (Recipe Yield)
                                        </label>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="any"
                                            value={autoCalQty}
                                            onChange={(e) => setAutoCalQty(e.target.value)}
                                            className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stored Value 1</span>
                                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
                                    Rs. {val1.toFixed(2)}
                                </div>
                                <p className="text-[10px] text-slate-400 italic">Recipe Cost ÷ Auto Cal Amount</p>
                            </div>
                        </motion.div>

                        {/* STEP 2 CARD */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-indigo-200 dark:border-indigo-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20">
                                        Step 2
                                    </span>
                                    <Percent className="w-5 h-5 text-indigo-500" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">2. Value 1 × Profit %</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">(Recipe Cost / Auto Cal) × {safePercentage}%</p>
                                </div>

                                {/* Controls */}
                                <div className="space-y-3 bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Input Profit Percentage (%)
                                            </label>
                                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                                {safePercentage}%
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={profitPercentage}
                                                onChange={(e) => setProfitPercentage(e.target.value)}
                                                className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>

                                    {/* Presets */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {percentagePresets.map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setProfitPercentage(p)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${Number(profitPercentage) === p ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50'}`}
                                            >
                                                {p}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stored Value 2</span>
                                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                                    Rs. {val2.toFixed(2)}
                                </div>
                                <p className="text-[10px] text-slate-400 italic">Value 1 × {safePercentage}%</p>
                            </div>
                        </motion.div>

                        {/* FINAL SUM CARD */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-blue-400/30"
                        >
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-md">
                                        Finally (1 + 2 Sum)
                                    </span>
                                    <TrendingUp className="w-6 h-6 text-emerald-300" />
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-white">Finally = 1 + 2 Sum</h3>
                                    <p className="text-xs text-blue-100 font-medium">Stored Value 1 + Stored Value 2</p>
                                </div>

                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-blue-100">1 (Recipe Cost / Auto Cal):</span>
                                        <span className="font-mono font-bold">Rs. {val1.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-100">2 (Value 1 × {safePercentage}%):</span>
                                        <span className="font-mono font-bold">Rs. {val2.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/20 mt-6 space-y-2 relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Finally (1 + 2 Total Price)</span>
                                <div className="text-4xl font-black text-white font-mono tracking-tight">
                                    Rs. {finalSum.toFixed(2)}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-blue-100 pt-2 border-t border-white/10">
                                    <span>Batch Revenue: <strong>Rs. {totalBatchRevenue.toFixed(2)}</strong></span>
                                    <span>Batch Profit: <strong className="text-emerald-300">Rs. {totalBatchProfit.toFixed(2)}</strong></span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Recipe Ingredient Breakdown Table */}
                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-3xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-slate-200 dark:border-[#334155] flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                                    <Utensils className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recipe Ingredients Breakdown</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Formula Code: <span className="font-mono font-bold text-blue-600">{costData.header.RECH_CODE}</span> | Prep Time: {costData.header.RECH_PREPARATION_TIME} Mins
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-bold">
                                <div className="bg-slate-50 dark:bg-[#0f172a] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                    Materials Cost: <span className="text-slate-800 dark:text-white font-mono">Rs. {costData.materialsCost.toFixed(2)}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-[#0f172a] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                    Store Expenses: <span className="text-amber-600 dark:text-amber-400 font-mono">Rs. {costData.storeExpenses.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                        <th className="px-6 py-4">Ingredient Name</th>
                                        <th className="px-6 py-4">Recipe Qty</th>
                                        <th className="px-6 py-4">Base Unit</th>
                                        <th className="px-6 py-4 text-right">Latest Batch Purchase Price</th>
                                        <th className="px-6 py-4 text-right">Ingredient Total Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                                    {costData.ingredients.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-slate-400 text-xs font-medium">
                                                No ingredients attached to this recipe.
                                            </td>
                                        </tr>
                                    ) : (
                                        costData.ingredients.map((ing, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#0f172a]/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-sm text-slate-800 dark:text-white">{ing.material_name}</div>
                                                    <div className="text-[10px] font-mono text-slate-400">{ing.material_code}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-sm text-slate-700 dark:text-slate-300 font-mono">
                                                    {ing.qty} {ing.unit}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                                                    {ing.base_unit || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                                                    Rs. {ing.unit_price.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-sm text-slate-800 dark:text-white">
                                                    Rs. {ing.cost.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {/* Store Expenses Row */}
                                    {costData.storeExpenses > 0 && (
                                        <tr className="bg-amber-500/5 font-bold text-sm">
                                            <td colSpan="4" className="px-6 py-4 text-amber-700 dark:text-amber-400">
                                                Store & Overhead Expenses
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-amber-700 dark:text-amber-400">
                                                Rs. {costData.storeExpenses.toFixed(2)}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 dark:bg-[#0f172a] font-black text-sm border-t border-slate-200 dark:border-[#334155]">
                                        <td colSpan="4" className="px-6 py-4 text-slate-800 dark:text-white uppercase text-xs tracking-wider">
                                            Total Batch Recipe Cost Price
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-base text-blue-600 dark:text-blue-400">
                                            Rs. {recipeCostPrice.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProfitCalculator;
