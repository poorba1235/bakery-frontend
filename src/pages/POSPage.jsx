import { AnimatePresence, motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { sinhalaFontBase64 } from '../utils/SinhalaFont';
import { logoBase64 } from '../utils/logoBase64';
import {
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    CreditCard,
    DollarSign,
    History,
    Minus,
    Plus,
    Printer,
    Receipt,
    Search,
    ShoppingCart,
    Smartphone,
    Trash2,
    User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const POSPage = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();

    // Tabs ('register' | 'history')
    const [activeTab, setActiveTab] = useState('register');

    // Catalog States
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Register Cart States
    const [cart, setCart] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [customerName, setCustomerName] = useState('Walking Customer');
    const [amountTendered, setAmountTendered] = useState('');

    // Customer & Credit System States
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('Walking Customer');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isTenderedManuallyEdited, setIsTenderedManuallyEdited] = useState(false);

    // Credit Ledger Tab States
    const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState(null);
    const [ledgerCustomerSearchQuery, setLedgerCustomerSearchQuery] = useState('');
    const [showLedgerCustomerDropdown, setShowLedgerCustomerDropdown] = useState(false);
    const [creditLog, setCreditLog] = useState([]);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentRemarks, setPaymentRemarks] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    const [invoiceNo, setInvoiceNo] = useState('');
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Receipt History States
    const [salesHistory, setSalesHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
    const historyItemsPerPage = 10;

    // Active Completed Sale State for Direct Printing
    const [completedSale, setCompletedSale] = useState(null);
    const [selectedProductForPrice, setSelectedProductForPrice] = useState(null);

    // Post-Checkout Print Action Selection ('preview' | 'browser' | 'pdf')
    const [checkoutAction, setCheckoutAction] = useState('preview');
    // Paper Width Preference ('80mm' | '58mm') - default to 80mm
    const [paperWidth, setPaperWidth] = useState('80mm');
    // Receipt Font Preference ('Segoe UI' | 'Consolas' | 'Trebuchet MS' | 'Courier New' | 'Arial') - default to Segoe UI
    const [receiptFont, setReceiptFont] = useState(() => localStorage.getItem('pos_receipt_font') || 'Segoe UI');

    const getReceiptFontFamily = () => {
        if (receiptFont === 'Segoe UI') {
            return "'Segoe UI', system-ui, 'Noto Sans Sinhala', Arial, sans-serif";
        }
        if (receiptFont === 'Trebuchet MS') {
            return "'Trebuchet MS', 'Segoe UI', 'Noto Sans Sinhala', sans-serif";
        }
        if (receiptFont === 'Courier New') {
            return "'Courier New', Courier, monospace";
        }
        if (receiptFont === 'Arial') {
            return "Arial, 'Helvetica Neue', 'Noto Sans Sinhala', sans-serif";
        }
        return "'Consolas', 'Segoe UI', 'Noto Sans Sinhala', Arial, sans-serif";
    };

    // Load data on mount
    useEffect(() => {
        fetchInitialData();
        // Focus the search input on mount
        setTimeout(() => {
            document.getElementById('product-search')?.focus();
        }, 400);
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/pos/customers');
            setCustomers(res.data);
            
            // Sync selected customer object if it was already selected to get updated credit balance
            if (selectedCustomer) {
                const updated = res.data.find(c => c.PC_ID === selectedCustomer.PC_ID);
                if (updated) setSelectedCustomer(updated);
            }
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        }
    };

    const fetchCreditLog = async (customerId) => {
        setLoadingLedger(true);
        try {
            const res = await api.get(`/pos/credit-log/${customerId}`);
            setCreditLog(res.data);
        } catch (error) {
            showNotification('Failed to fetch credit ledger log', 'error');
        } finally {
            setLoadingLedger(false);
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!selectedLedgerCustomer) return;
        const parsedAmt = parseFloat(paymentAmount);
        if (isNaN(parsedAmt) || parsedAmt <= 0) {
            showNotification('Please enter a valid positive payment amount', 'error');
            return;
        }

        setIsSubmittingPayment(true);
        try {
            const payload = {
                customerId: selectedLedgerCustomer.PC_ID,
                amount: parsedAmt,
                paymentMethod: paymentMode,
                remarks: paymentRemarks
            };
            await api.post('/pos/credit-payment', payload);
            showNotification('Credit payment recorded successfully!', 'success');
            setPaymentAmount('');
            setPaymentRemarks('');
            
            // Refresh customer lists & ledger details
            const res = await api.get('/pos/customers');
            setCustomers(res.data);
            const updatedLedgerCust = res.data.find(c => c.PC_ID === selectedLedgerCustomer.PC_ID);
            if (updatedLedgerCust) {
                setSelectedLedgerCustomer(updatedLedgerCust);
            }
            await fetchCreditLog(selectedLedgerCustomer.PC_ID);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Payment failed', 'error');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const fetchInitialData = async () => {
        setLoadingProducts(true);
        try {
            // 1. Fetch Next Invoice No
            const invRes = await api.get('/pos/next-invoice');
            setInvoiceNo(invRes.data.invoiceNo);

            // 2. Fetch Products
            const prodRes = await api.get('/product/items');
            setProducts(prodRes.data);
            setFilteredProducts(prodRes.data);

            // 3. Fetch Categories
            const catRes = await api.get('/product/categories');
            setCategories(catRes.data);

            // 4. Fetch Customers
            await fetchCustomers();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to load POS details', 'error');
        } finally {
            setLoadingProducts(false);
        }
    };

    const fetchSalesHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await api.get('/pos/sales');
            setSalesHistory(res.data);
            setFilteredHistory(res.data);
        } catch (error) {
            showNotification('Failed to fetch sales history', 'error');
        } finally {
            setLoadingHistory(false);
        }
    };

    // Filter products
    useEffect(() => {
        let filtered = products;

        if (selectedCategory !== 'All') {
            filtered = filtered.filter(p => p.category_name === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                (p.P_NAME && p.P_NAME.toLowerCase().includes(query)) ||
                (p.P_CODE && p.P_CODE.toLowerCase().includes(query)) ||
                (p.P_BARCODE_NO && p.P_BARCODE_NO.toLowerCase().includes(query)) ||
                (p.actual_barcode && p.actual_barcode.toLowerCase().includes(query))
            );
        }

        setFilteredProducts(filtered);
    }, [searchQuery, selectedCategory, products]);

    // Filter receipt history
    useEffect(() => {
        setHistoryCurrentPage(1);
        if (!searchHistoryQuery.trim()) {
            setFilteredHistory(salesHistory);
            return;
        }
        const query = searchHistoryQuery.toLowerCase();
        setFilteredHistory(
            salesHistory.filter(s =>
                s.PSH_INVOICE_NO.toLowerCase().includes(query) ||
                (s.PSH_CUSTOMER_NAME && s.PSH_CUSTOMER_NAME.toLowerCase().includes(query)) ||
                s.PSH_ENTERED_BY.toLowerCase().includes(query)
            )
        );
    }, [searchHistoryQuery, salesHistory]);

    // Cart Management
    const addToCart = (product, selectedPrice) => {
        const stock = parseFloat(product.stock_balance) || 0;
        if (stock <= 0) {
            showNotification('Product is out of stock in storefront!', 'warning');
            return;
        }

        const priceToUse = selectedPrice !== undefined
            ? parseFloat(selectedPrice) || 0
            : parseFloat(product.last_sale_price) || 0;

        const existing = cart.find(item => item.P_ID === product.P_ID && item.unitPrice === priceToUse);

        if (existing) {
            if (existing.qty >= stock) {
                showNotification(`Cannot exceed storefront stock level (${stock})`, 'warning');
                return;
            }
            setCart(cart.map(item =>
                (item.P_ID === product.P_ID && item.unitPrice === priceToUse)
                    ? { ...item, qty: item.qty + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                ...product,
                qty: 1,
                unitPrice: priceToUse
            }]);
        }

        // Clear discount when a new item is added
        setDiscount(0);
    };

    const updateQty = (productId, delta) => {
        const product = products.find(p => p.P_ID === productId);
        const stock = parseFloat(product?.stock_balance) || 0;

        setCart(cart.map(item => {
            if (item.P_ID === productId) {
                const newQty = item.qty + delta;
                if (newQty <= 0) return null;
                if (newQty > stock) {
                    showNotification(`Cannot exceed storefront stock level (${stock})`, 'warning');
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.P_ID !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setDiscount(0);
        setAmountTendered('');
        setCustomerName('Walking Customer');
        setSelectedCustomer(null);
        setCustomerSearchQuery('Walking Customer');
        setIsTenderedManuallyEdited(false);
    };

    // Quantity Input Change handler for direct typing
    const handleQtyChange = (productId, value) => {
        if (value === '') {
            setCart(cart.map(item =>
                item.P_ID === productId
                    ? { ...item, qty: '' }
                    : item
            ));
            return;
        }

        const qty = parseFloat(value);
        if (isNaN(qty) || qty <= 0) return;

        const product = products.find(p => p.P_ID === productId);
        const stock = parseFloat(product?.stock_balance) || 0;

        if (qty > stock) {
            showNotification(`Cannot exceed storefront stock level (${stock})`, 'warning');
            return;
        }

        setCart(cart.map(item =>
            item.P_ID === productId
                ? { ...item, qty }
                : item
        ));
    };

    // Quick Cash tender helper
    const handleQuickCash = (amount) => {
        const net = getNetTotal();
        const prevBal = selectedCustomer ? parseFloat(selectedCustomer.PC_CREDIT_BALANCE || 0) : 0;
        const totalToPay = net + prevBal;
        if (amount === 'exact') {
            setAmountTendered(totalToPay.toFixed(2));
        } else {
            setAmountTendered(amount.toString());
        }
        setIsTenderedManuallyEdited(true);
    };

    // Search Keydown Handler (Enter to add exact match or first item)
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchQuery.trim().toLowerCase();
            if (!query) return;

            // Find exact code match first
            let matchedProduct = products.find(p =>
                (p.P_CODE && p.P_CODE.toLowerCase() === query) ||
                (p.P_BARCODE_NO && p.P_BARCODE_NO.toLowerCase() === query) ||
                (p.actual_barcode && p.actual_barcode.toLowerCase() === query)
            );

            // If no exact code match, search for exact name match
            if (!matchedProduct) {
                matchedProduct = products.find(p => p.P_NAME && p.P_NAME.toLowerCase() === query);
            }

            // If no exact match, use the first filtered product
            if (!matchedProduct && filteredProducts.length > 0) {
                matchedProduct = filteredProducts[0];
            }

            if (matchedProduct) {
                const stock = parseFloat(matchedProduct.stock_balance) || 0;
                if (stock <= 0) {
                    showNotification('Product is out of stock in storefront!', 'warning');
                    return;
                }
                setSelectedProductForPrice(matchedProduct);
                setSearchQuery('');
            } else {
                showNotification('Product not found!', 'warning');
            }
        }
    };

    // Calculate totals
    const getSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    };

    const getNetTotal = () => {
        const subtotal = getSubtotal();
        const discountAmount = subtotal * ((parseFloat(discount) || 0) / 100);
        return Math.max(0, subtotal - discountAmount);
    };

    const getChange = () => {
        const tendered = parseFloat(amountTendered) || 0;
        const net = getNetTotal();
        const prevBal = selectedCustomer ? parseFloat(selectedCustomer.PC_CREDIT_BALANCE || 0) : 0;
        
        // If they have a previous balance, any cash tendered above today's bill net total goes to settle the previous balance first!
        const excess = tendered - net;
        if (excess <= 0) return excess;
        return Math.max(0, excess - prevBal);
    };

    // Trigger receipt modal display on screen
    const triggerDirectPrint = (saleData) => {
        setCompletedSale(saleData);
    };

    // Auto Download structured PDF receipt natively using local jsPDF (Works 100% offline!)
    const downloadReceiptPDF = (saleData) => {
        const targetSale = saleData && saleData.invoiceNo ? saleData : completedSale;
        if (!targetSale) return;

        // Set dimensions based on paper size (80mm default or 58mm)
        const is80mm = paperWidth === '80mm';
        const width = is80mm ? 80 : 58;
        const height = Math.max(120, targetSale.items.length * 8 + 90);
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [width, height]
        });

        // Embed and register the native Sinhala font
        doc.addFileToVFS("SinhalaFont.ttf", sinhalaFontBase64);
        doc.addFont("SinhalaFont.ttf", "Sinhala", "normal");
        doc.addFont("SinhalaFont.ttf", "Sinhala", "bold");

        // Use Sinhala font for flawless alignment
        doc.setFont('Sinhala', 'bold');
        doc.setFontSize(is80mm ? 11 : 10);

        // Brand Header Box containing logo and details
        let y = 3;
        const boxX = 4;
        const boxWidth = width - 8;
        const boxStartY = y;

        const logoSize = is80mm ? 10 : 8;
        const logoX = (width / 2) - (logoSize / 2);
        y += 1;
        try {
            doc.addImage(logoBase64, 'PNG', logoX, y, logoSize, logoSize);
            y += logoSize + 4;
        } catch (imgErr) {
            console.warn('PDF logo rendering fallback:', imgErr);
            y += 4;
        }

        doc.text("INDIKA BAKERS", width / 2, y, { align: 'center' });
        doc.setFont('Sinhala', 'normal');
        doc.setFontSize(is80mm ? 10.5 : 9.5);
        y += 4.5;
        doc.text("Mehiellagama, Hiripitiya,", width / 2, y, { align: 'center' });
        y += 3.5;
        doc.text("Nikadalupotha", width / 2, y, { align: 'center' });
        y += 3.5;
        doc.text("Tel: 071660 0165", width / 2, y, { align: 'center' });
        doc.rect(boxX, boxStartY, boxWidth, (y - boxStartY) + 2);

        const lineDivider = is80mm ? "------------------------------------------------" : "--------------------------------";
        const rightPos = is80mm ? 75 : 53;

        y += 3;
        doc.text(lineDivider, width / 2, y, { align: 'center' });

        // Metadata grid
        doc.setFontSize(is80mm ? 8 : 7);
        y += 4;
        doc.text(`Invoice No:  ${targetSale.invoiceNo}`, 5, y);
        y += 3;
        doc.text(`Date & Time: ${new Date(targetSale.date).toLocaleString()}`, 5, y);
        y += 3;
        doc.text(`Cashier:     ${targetSale.cashier.toUpperCase()}`, 5, y);
        y += 3;
        doc.text(`Customer:    ${targetSale.customerName}`, 5, y);
        y += 3;
        doc.setFont('Sinhala', 'normal');
        doc.text(`Payment:     ${(targetSale.paymentMethod || 'CASH').toUpperCase()}`, 5, y);
        doc.setFont('Sinhala', 'normal');
        doc.setFontSize(is80mm ? 9 : 8);

        y += 3;
        doc.text(lineDivider, width / 2, y, { align: 'center' });

        // Table Header
        y += 4;
        doc.setFont('Sinhala', 'bold');
        if (is80mm) {
            doc.text("ITEM", 5, y);
            doc.text("PRICE", 43, y, { align: 'right' });
            doc.text("QTY", 56, y, { align: 'center' });
            doc.text("TOTAL", rightPos, y, { align: 'right' });
        } else {
            doc.text("ITEM", 5, y);
            doc.text("QTY", 35, y);
            doc.text("TOTAL", rightPos, y, { align: 'right' });
        }

        y += 2.5;
        doc.setFont('Sinhala', 'normal');
        doc.text(lineDivider, width / 2, y, { align: 'center' });

        // Print table rows
        doc.setFontSize(is80mm ? 11 : 10);
        doc.setFont('Sinhala', 'normal');
        targetSale.items.forEach(item => {
            y += 4.5;
            const rawName = item.P_NAME_SINAHAL || item.P_NAME;
            const maxNameLen = is80mm ? 22 : 15;
            const displayName = rawName.length > maxNameLen ? rawName.substring(0, maxNameLen - 2) + ".." : rawName;

            doc.text(displayName, 5, y);
            if (is80mm) {
                doc.text(item.unitPrice.toFixed(0), 43, y, { align: 'right' });
                doc.text(item.qty.toString(), 56, y, { align: 'center' });
            } else {
                doc.text(item.qty.toString(), 36, y);
            }

            const totalStr = `Rs.${(item.qty * item.unitPrice).toFixed(0)}`;
            doc.text(totalStr, rightPos, y, { align: 'right' });
        });

        y += 3.5;
        doc.text(lineDivider, width / 2, y, { align: 'center' });

        // Finance calculations
        y += 5;
        doc.setFontSize(is80mm ? 12 : 11);
        doc.setFont('Sinhala', 'normal');
        doc.text(`SUBTOTAL:`, 5, y);
        doc.text(`Rs. ${targetSale.subtotal.toFixed(2)}`, rightPos, y, { align: 'right' });

        if (targetSale.discount > 0) {
            y += 4.5;
            doc.text(`DISCOUNT:`, 5, y);
            doc.text(`-Rs. ${targetSale.discount.toFixed(2)}`, rightPos, y, { align: 'right' });
        }

        if (targetSale.previousBalance !== undefined && targetSale.previousBalance > 0) {
            y += 4.5;
            doc.text(`OLD BALANCE:`, 5, y);
            doc.text(`Rs. ${targetSale.previousBalance.toFixed(2)}`, rightPos, y, { align: 'right' });
        }

        y += 5;
        doc.setFontSize(is80mm ? 14 : 12.5);
        doc.setFont('Sinhala', 'bold');
        doc.text(`NET TOTAL:`, 5, y);
        doc.text(`Rs. ${((targetSale.previousBalance || 0) + targetSale.netAmount).toFixed(2)}`, rightPos, y, { align: 'right' });

        y += 3.5;
        doc.setFont('Sinhala', 'normal');

        if (targetSale.paymentMethod === 'Credit' || (targetSale.previousBalance !== undefined && targetSale.previousBalance > 0)) {
            doc.text(`AMOUNT PAID:`, 5, y);
            doc.text(`Rs. ${targetSale.amountTendered.toFixed(2)}`, rightPos, y, { align: 'right' });

            y += 4.5;
            doc.setFont('Sinhala', 'bold');
            doc.text(`NEW BALANCE:`, 5, y);
            doc.text(`Rs. ${(targetSale.newBalance || 0).toFixed(2)}`, rightPos, y, { align: 'right' });
        } else {
            doc.text(`PAID ${(targetSale.paymentMethod || 'CASH').toUpperCase()}:`, 5, y);
            doc.text(`Rs. ${targetSale.amountTendered.toFixed(2)}`, rightPos, y, { align: 'right' });

            y += 4;
            doc.setFont('Sinhala', 'bold');
            doc.text(`CHANGE:`, 5, y);
            doc.text(`Rs. ${targetSale.amountChange.toFixed(2)}`, rightPos, y, { align: 'right' });
        }



        y += 3;
        doc.setFont('Sinhala', 'normal');
        doc.text(lineDivider, width / 2, y, { align: 'center' });

        // Store slogan footer
        y += 5;
        doc.setFont('Sinhala', 'bold');
        doc.text("THANK YOU FOR SHOPPING!", width / 2, y, { align: 'center' });
        y += 3.5;
        doc.setFont('Sinhala', 'normal');

        // Save native PDF download stream
        doc.save(`Receipt_${targetSale.invoiceNo}.pdf`);
    };

    // Trigger Test Thermal Print with Mock Data
    const handleTestPrint = () => {
        const mockCompleted = {
            invoiceNo: "POS-TEST-8888",
            date: new Date(),
            cashier: user?.U_USERNAME || "Admin Test",
            customerName: "Thermal Printer Alignment Test",
            paymentMethod: "Cash",
            subtotal: 1360.00,
            discount: 60.00,
            netAmount: 1300.00,
            amountTendered: 1500.00,
            amountChange: 200.00,
            items: [
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
            ]
        };

        triggerDirectPrint(mockCompleted);
    };

    // Checkout
    const handleCheckout = async () => {
        if (cart.length === 0) {
            showNotification('Cart is empty!', 'warning');
            return;
        }

        // Validate quantities are positive numbers
        const hasInvalidQty = cart.some(item => !item.qty || isNaN(parseFloat(item.qty)) || parseFloat(item.qty) <= 0);
        if (hasInvalidQty) {
            showNotification('Please enter a valid quantity for all items.', 'warning');
            return;
        }

        const netTotal = getNetTotal();
        const tendered = parseFloat(amountTendered) || 0;

        if (paymentMethod === 'Cash' && tendered < netTotal) {
            showNotification('Tendered cash is less than the net bill amount!', 'error');
            return;
        }

        if (paymentMethod === 'Credit') {
            if (!selectedCustomer) {
                showNotification('A registered customer must be selected for Credit transactions!', 'error');
                return;
            }
            const paidUpfront = parseFloat(amountTendered) || 0;
            if (paidUpfront < 0 || paidUpfront > netTotal) {
                showNotification('Paid upfront amount must be between 0 and net total!', 'error');
                return;
            }
            const dueAmount = netTotal - paidUpfront;
            const remainingLimit = (parseFloat(selectedCustomer.PC_CREDIT_LIMIT || 0)) - (parseFloat(selectedCustomer.PC_CREDIT_BALANCE || 0));
            if (dueAmount > remainingLimit) {
                showNotification(`Credit limit exceeded! Due amount (Rs. ${dueAmount.toFixed(2)}) is greater than remaining credit limit (Rs. ${remainingLimit.toFixed(2)})`, 'error');
                return;
            }
        }

        setLoadingCheckout(true);
        try {
            const saleData = {
                items: cart.map(item => ({
                    productId: item.P_ID,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    unit: item.P_UNIT || 'Pcs'
                })),
                discountPercentage: parseFloat(discount) || 0,
                paymentMethod,
                customerName: selectedCustomer ? selectedCustomer.PC_NAME : customerName,
                PC_ID: selectedCustomer ? selectedCustomer.PC_ID : null,
                customerId: selectedCustomer ? selectedCustomer.PC_ID : null,
                paidAmount: paymentMethod === 'Credit'
                    ? (parseFloat(amountTendered) || 0)
                    : (paymentMethod === 'Cash' ? (parseFloat(amountTendered) || netTotal) : netTotal)
            };
            const response = await api.post('/pos/sales', saleData);

            const discountAmount = getSubtotal() * ((parseFloat(discount) || 0) / 100);

            const completed = {
                invoiceNo: response.data.invoiceNo,
                date: new Date(),
                cashier: user?.username || 'Admin',
                customerName: selectedCustomer ? selectedCustomer.PC_NAME : customerName,
                paymentMethod,
                subtotal: getSubtotal(),
                discount: discountAmount,
                netAmount: netTotal,
                amountTendered: paymentMethod === 'Cash' ? tendered : (paymentMethod === 'Credit' ? (parseFloat(amountTendered) || 0) : netTotal),
                amountChange: paymentMethod === 'Cash' ? Math.max(0, getChange()) : 0,
                items: [...cart],
                previousBalance: response.data.previousBalance || 0,
                newBalance: response.data.newBalance || 0
            };

            clearCart();

            // Trigger the configured checkout printing action preference
            if (checkoutAction === 'preview') {
                triggerDirectPrint(completed);
            } else if (checkoutAction === 'pdf') {
                triggerDirectPrint(completed);
                downloadReceiptPDF(completed);
            } else if (checkoutAction === 'browser') {
                triggerDirectPrint(completed);
                setTimeout(() => {
                    window.print();
                }, 350);
            }

            // Reload database products and next invoice code
            fetchInitialData();

            // Focus back on search input for next customer
            setTimeout(() => {
                document.getElementById('product-search')?.focus();
            }, 600);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Checkout failed', 'error');
        } finally {
            setLoadingCheckout(false);
        }
    };

    // View & Reprint old receipt
    const handleViewReprint = async (sale) => {
        try {
            const res = await api.get(`/pos/sales/${sale.PSH_ID}/details`);

            const completed = {
                invoiceNo: sale.PSH_INVOICE_NO,
                date: sale.PSH_DATE,
                cashier: sale.PSH_ENTERED_BY,
                customerName: sale.PSH_CUSTOMER_NAME,
                paymentMethod: sale.PSH_PAYMENT_METHOD,
                subtotal: parseFloat(sale.PSH_SUBTOTAL),
                discount: parseFloat(sale.PSH_DISCOUNT),
                netAmount: parseFloat(sale.PSH_NET_AMOUNT),
                amountTendered: parseFloat(sale.PSH_NET_AMOUNT),
                amountChange: 0,
                items: res.data.map(d => ({
                    P_NAME: d.product_name,
                    qty: parseFloat(d.PSD_QTY),
                    unitPrice: parseFloat(d.PSD_UNIT_PRICE)
                }))
            };

            // Direct Print!
            triggerDirectPrint(completed);
        } catch (error) {
            showNotification('Failed to retrieve receipt details', 'error');
        }
    };

    const handleDeleteSale = async (sale) => {
        if (!window.confirm(`Are you sure you want to delete invoice ${sale.PSH_INVOICE_NO} and reverse the stock?`)) return;
        
        try {
            await api.delete(`/pos/sales/${sale.PSH_ID}`);
            showNotification('Sale deleted and stock reversed successfully', 'success');
            fetchSalesHistory();
            fetchInitialData();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to delete sale', 'error');
        }
    };

    // Auto sync cash tendered amount to today amount + credit balance unless manually customized
    useEffect(() => {
        if (paymentMethod === 'Cash' && !isTenderedManuallyEdited) {
            const net = getNetTotal();
            const prevBal = selectedCustomer ? parseFloat(selectedCustomer.PC_CREDIT_BALANCE || 0) : 0;
            setAmountTendered((net + prevBal).toFixed(2));
        } else if (paymentMethod === 'Credit' && !isTenderedManuallyEdited) {
            setAmountTendered('0.00');
        } else if (paymentMethod !== 'Cash' && paymentMethod !== 'Credit' && !isTenderedManuallyEdited) {
            setAmountTendered('');
        }
    }, [cart, discount, selectedCustomer, paymentMethod, isTenderedManuallyEdited]);

    // Keyboard Shortcuts Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F4') {
                e.preventDefault();
                document.getElementById('product-search')?.focus();
                showNotification('Search focused', 'info');
                return;
            }

            if (e.key === 'F2') {
                e.preventDefault();
                handleCheckout();
                return;
            }

            if (e.key === 'F9') {
                e.preventDefault();
                clearCart();
                showNotification('Cart cleared', 'info');
                return;
            }

            if (e.key === 'F7') {
                e.preventDefault();
                setPaymentMethod('Cash');
                showNotification('Payment: Cash', 'info');
                return;
            }

            if (e.key === 'F8') {
                e.preventDefault();
                setPaymentMethod('Card');
                showNotification('Payment: Card', 'info');
                return;
            }

            if (e.key === 'F10') {
                e.preventDefault();
                setPaymentMethod('Credit');
                showNotification('Payment: Credit', 'info');
                return;
            }

            if (e.key === 'F6') {
                e.preventDefault();
                setPaymentMethod('Online Transfer');
                showNotification('Payment: Online Transfer', 'info');
                return;
            }

            if (e.key === 'Escape') {
                if (completedSale) {
                    setCompletedSale(null);
                } else if (searchQuery) {
                    setSearchQuery('');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, discount, paymentMethod, customerName, amountTendered, completedSale, searchQuery, products, filteredProducts]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 p-6">

            {/* Inline CSS styling for print size configuration (80mm width default, auto height, horizontally centered on roll) */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @page {
                    margin: 0 !important;
                }
                @media print {
                    /* Hide specific structural layouts but NOT #root itself so the DOM stays active */
                    header, aside, nav, button, footer, .no-print {
                        display: none !important;
                    }
                    /* Reset structural parent layouts to zero height constraints, padding, and margins to print at absolute top edge */
                    main, .max-w-7xl, #root, .min-h-screen, [class*="min-h-"] {
                        height: auto !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        margin-left: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                    }
                    /* Configure page and body for roll exact fit without pagination breaks */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: #fff !important;
                        overflow: visible !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: flex-start !important;
                        
                        /* Absolutely force whole html/body flow to avoid breaking */
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-before: avoid !important;
                        break-before: avoid !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    /* Force only the designated thermal receipt container and its children to be visible */
                    #direct-thermal-receipt, #direct-thermal-receipt * {
                        visibility: visible !important;
                        box-shadow: none !important;
                        outline: none !important;
                    }
                    #direct-thermal-receipt {
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        margin: 0 auto !important;
                        display: block !important;
                        width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
                        max-width: 100% !important;
                        height: auto !important;
                        padding: 2mm 2mm 0 2mm !important;
                        padding-top: 2mm !important;
                        margin-top: 0 !important;
                        box-sizing: border-box !important;
                        background: white !important;
                        color: black !important;
                        border: none !important;
                        outline: none !important;
                        box-shadow: none !important;
                        
                        /* Prevent any random vertical page breaking inside receipt content */
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    #direct-thermal-receipt img {
                        display: block !important;
                        margin: 0 auto 4px auto !important;
                        max-width: 50mm !important;
                        height: 40px !important;
                        width: auto !important;
                        visibility: visible !important;
                        filter: none !important;
                        -webkit-filter: none !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        opacity: 1 !important;
                    }
                }
                @media screen {
                    #direct-thermal-receipt {
                        display: none !important; /* Hidden completely on cashier screen */
                    }
                }
            `}} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/30 text-white">
                            <Receipt className="w-6 h-6" />
                        </div>
                        Storefront POS Counter
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Deducting finished product stock directly from storefront inventory.
                    </p>
                </div>

                {/* Tab Switcher & Cashier badges */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Test Print Button */}
                    {/* <button
                        onClick={handleTestPrint}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Test Thermal Print
                    </button> */}

                    {/* Tab Navigation */}
                    <div className="flex bg-white dark:bg-[#1e293b] p-1 border border-slate-200 dark:border-[#334155] rounded-xl shadow-sm">
                        <button
                            onClick={() => setActiveTab('register')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'register'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                        >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Register Terminal
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('history');
                                fetchSalesHistory();
                            }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'history'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                        >
                            <History className="w-3.5 h-3.5" />
                            Recent Receipts
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('credit');
                                fetchCustomers();
                            }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'credit'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            Credit Ledger & Payments
                        </button>
                    </div>

                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Active Bill:</span>
                        <span className="text-sm font-black text-blue-800 dark:text-blue-300">{invoiceNo || '---'}</span>
                    </div>
                    <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 capitalize">{user?.username || 'Cashier'}</span>
                    </div>
                </div>
            </div>

            {/* Grid Layout */}
            {activeTab === 'credit' ? (
                /* Full width Credit Ledger & Payments view */
                <div className="no-print">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        
                        {/* Left Panel: Customer Summary & Payments */}
                        <div className="md:col-span-4 border-r border-slate-200 dark:border-[#334155] pr-6 flex flex-col gap-4">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-rose-500" />
                                Credit Payments & Settle
                            </h3>

                            {/* Select Customer for Ledger */}
                            <div className="flex flex-col gap-1 relative">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Customer</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={selectedLedgerCustomer ? selectedLedgerCustomer.PC_NAME : ledgerCustomerSearchQuery}
                                        onChange={(e) => {
                                            setLedgerCustomerSearchQuery(e.target.value);
                                            if (selectedLedgerCustomer) {
                                                setSelectedLedgerCustomer(null);
                                                setCreditLog([]);
                                            }
                                            setShowLedgerCustomerDropdown(true);
                                        }}
                                        onFocus={() => setShowLedgerCustomerDropdown(true)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all font-semibold text-slate-800 dark:text-white"
                                        placeholder="Search customer name..."
                                    />
                                    {selectedLedgerCustomer && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedLedgerCustomer(null);
                                                setLedgerCustomerSearchQuery('');
                                                setCreditLog([]);
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                {showLedgerCustomerDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowLedgerCustomerDropdown(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-lg shadow-lg z-20 custom-scrollbar">
                                            {customers
                                                .filter(c => (c.PC_NAME || '').toLowerCase().includes(ledgerCustomerSearchQuery.toLowerCase()))
                                                .map(c => (
                                                    <div
                                                        key={c.PC_ID}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setSelectedLedgerCustomer(c);
                                                            setShowLedgerCustomerDropdown(false);
                                                            fetchCreditLog(c.PC_ID);
                                                        }}
                                                        className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer text-slate-800 dark:text-white flex justify-between"
                                                    >
                                                        <span>{c.PC_NAME}</span>
                                                        <span className="text-[10px] text-rose-500 font-bold">LKR {parseFloat(c.PC_CREDIT_BALANCE || 0).toFixed(0)}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {selectedLedgerCustomer ? (
                                <>
                                    {/* Credit Profile Summary */}
                                    <div className="bg-slate-50 dark:bg-[#0f172a]/40 border border-slate-200 dark:border-[#334155] p-4 rounded-2xl flex flex-col gap-2.5">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-500">Credit Limit:</span>
                                            <span className="text-slate-800 dark:text-slate-200 font-black">Rs. {parseFloat(selectedLedgerCustomer.PC_CREDIT_LIMIT || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-500">Current Balance:</span>
                                            <span className="text-rose-500 font-black">Rs. {parseFloat(selectedLedgerCustomer.PC_CREDIT_BALANCE || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold border-t border-slate-200 dark:border-slate-800 pt-2">
                                            <span className="text-slate-500">Remaining Limit:</span>
                                            <span className="text-emerald-500 font-black">Rs. {Math.max(0, (parseFloat(selectedLedgerCustomer.PC_CREDIT_LIMIT || 0)) - (parseFloat(selectedLedgerCustomer.PC_CREDIT_BALANCE || 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>

                                    {/* Record Payment Form */}
                                    <form onSubmit={handleRecordPayment} className="flex flex-col gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Record Credit Payment</h4>
                                        
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Payment Amount (LKR)</label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                required
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-white"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Payment Mode</label>
                                            <select
                                                value={paymentMode}
                                                onChange={(e) => setPaymentMode(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-white"
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="Card">Card</option>
                                                <option value="Online Transfer">Online Transfer</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Remarks / Reference</label>
                                            <input
                                                type="text"
                                                value={paymentRemarks}
                                                onChange={(e) => setPaymentRemarks(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-white"
                                                placeholder="e.g. Bank slip reference, check number"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmittingPayment || parseFloat(paymentAmount || 0) <= 0}
                                            className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${isSubmittingPayment || parseFloat(paymentAmount || 0) <= 0
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10'
                                                }`}
                                        >
                                            {isSubmittingPayment ? 'Recording...' : 'Receive Credit Payment'}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#0f172a]/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center">
                                    <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2 animate-bounce" />
                                    <p className="text-xs text-slate-400 font-semibold">Select a customer above to view credit profiles and settle dues.</p>
                                </div>
                            )}
                        </div>

                        {/* Right Panel: Transaction Ledger History */}
                        <div className="md:col-span-8 flex flex-col gap-4 pl-0 md:pl-2">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" />
                                Transaction Ledger
                            </h3>

                            {selectedLedgerCustomer ? (
                                loadingLedger ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                                        <span className="text-xs text-slate-400 font-semibold">Loading transaction logs...</span>
                                    </div>
                                ) : creditLog.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 font-semibold text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                                        <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                                        No credit ledger entries found for {selectedLedgerCustomer.C_NAME}.
                                    </div>
                                ) : (
                                    <div className="overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-[#334155] text-slate-400 font-black uppercase tracking-wider pb-3">
                                                    <th className="pb-3 pt-1">Date</th>
                                                    <th className="pb-3 pt-1">Type</th>
                                                    <th className="pb-3 pt-1">Ref / Invoice</th>
                                                    <th className="pb-3 pt-1 text-right">Debit (+Sale)</th>
                                                    <th className="pb-3 pt-1 text-right">Credit (-Paid)</th>
                                                    <th className="pb-3 pt-1 text-right">Balance</th>
                                                    <th className="pb-3 pt-1 pl-4">Remarks & Cashier</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-[#334155] font-semibold text-slate-700 dark:text-slate-300">
                                                {creditLog.map((log) => (
                                                    <tr key={log.PCL_ID} className="hover:bg-slate-50 dark:hover:bg-[#0f172a]/30 transition-colors">
                                                        <td className="py-3 text-slate-500">
                                                            {new Date(log.PCL_DATE).toLocaleDateString()} {new Date(log.PCL_DATE).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="py-3">
                                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${log.PCL_TYPE === 'Purchase'
                                                                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                                                                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                                                                }`}>
                                                                {log.PCL_TYPE}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-blue-600 dark:text-blue-400 font-bold">
                                                            {log.PSH_INVOICE_NO || '---'}
                                                        </td>
                                                        <td className="py-3 text-right font-black text-rose-500">
                                                            {parseFloat(log.PCL_DEBIT) > 0 ? `Rs. ${parseFloat(log.PCL_DEBIT).toFixed(2)}` : '---'}
                                                        </td>
                                                        <td className="py-3 text-right font-black text-emerald-500">
                                                            {parseFloat(log.PCL_CREDIT) > 0 ? `Rs. ${parseFloat(log.PCL_CREDIT).toFixed(2)}` : '---'}
                                                        </td>
                                                        <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                                                            Rs. {parseFloat(log.PCL_BALANCE).toFixed(2)}
                                                        </td>
                                                        <td className="py-3 pl-4 text-slate-500 text-[11px] leading-tight font-medium">
                                                            <div>{log.PCL_REMARKS}</div>
                                                            <div className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">By: {log.PCL_ENTERED_BY}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 bg-slate-50 dark:bg-[#0f172a]/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center">
                                    <History className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
                                    <h4 className="font-extrabold text-sm text-slate-500 dark:text-slate-400">Ledger Statement Sheet</h4>
                                    <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto">Select a customer on the left to see their ledger log statement of accounts, bills, and payment entries.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 no-print">

                    {/* Left Column: Product Picker OR Sales History */}
                <div className={`flex flex-col gap-4 ${activeTab === 'register' ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
                    {activeTab === 'register' ? (
                        <>
                            {/* Search and Categories bar */}
                            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        id="product-search"
                                        type="text"
                                        placeholder="Search by name or code (Enter to add)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                                    />
                                </div>

                                {/* Category list */}
                                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
                                    <button
                                        onClick={() => setSelectedCategory('All')}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedCategory === 'All'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-[#1e293b]'
                                            }`}
                                    >
                                        All Products
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.C_ID}
                                            onClick={() => setSelectedCategory(cat.C_NAME)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedCategory === cat.C_NAME
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-[#1e293b]'
                                                }`}
                                        >
                                            {cat.C_NAME}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Products Grid */}
                            {loadingProducts ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-[#334155]">
                                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <span className="font-semibold text-slate-500">Loading catalog items...</span>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-[#334155] text-center">
                                    <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
                                    <h3 className="text-xl font-extrabold">No Products Found</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mt-2">Try adjusting your filters or search query.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                                    {filteredProducts.map((prod) => {
                                        const stock = parseFloat(prod.stock_balance) || 0;
                                        const price = parseFloat(prod.last_sale_price) || 0;
                                        return (
                                            <motion.div
                                                whileHover={{ y: -4 }}
                                                key={prod.P_ID}
                                                onClick={() => stock > 0 && setSelectedProductForPrice(prod)}
                                                className={`bg-white dark:bg-[#1e293b] rounded-2xl border p-4 shadow-sm transition-all flex flex-col justify-between ${stock > 0
                                                    ? 'cursor-pointer hover:shadow-lg border-slate-200 dark:border-[#334155]'
                                                    : 'opacity-60 border-red-200 dark:border-red-950 bg-red-50/10 dark:bg-red-950/5'
                                                    }`}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                            {prod.P_CODE}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${stock > 10
                                                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                                                            : stock > 0
                                                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                                                : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                                                            }`}>
                                                            {stock > 0 ? `Stock: ${stock}` : 'Sold Out'}
                                                        </span>
                                                    </div>

                                                    <h4 className="font-extrabold text-sm line-clamp-2 text-slate-900 dark:text-white mt-1">
                                                        {prod.P_NAME}
                                                    </h4>
                                                    {prod.P_NAME_SINAHAL && (
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            {prod.P_NAME_SINAHAL}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-end justify-between mt-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400">Retail Price</span>
                                                        <span className="text-base font-black text-blue-600 dark:text-blue-400">
                                                            Rs. {price.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className={`p-2 rounded-xl text-white ${stock > 0 ? 'bg-blue-600' : 'bg-slate-400'}`}>
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Sales History Table View */
                        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-center gap-4 flex-wrap">
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <History className="w-5 h-5 text-blue-600" />
                                    Recent Counter Invoices
                                </h3>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="relative w-full sm:w-72">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search by Bill No or Cashier..."
                                            value={searchHistoryQuery}
                                            onChange={(e) => setSearchHistoryQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-semibold transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('register')}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors shrink-0"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {loadingHistory ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                                    <span className="font-semibold text-slate-400 text-sm">Loading receipt logs...</span>
                                </div>
                            ) : filteredHistory.length === 0 ? (
                                <div className="py-20 text-center text-slate-400 font-semibold flex flex-col items-center gap-3">
                                    <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                                    No completed receipt logs found matching filters.
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-[#334155] text-slate-400 font-black uppercase tracking-wider">
                                                    <th className="pb-3 pt-1">Bill No</th>
                                                    <th className="pb-3 pt-1">Date & Time</th>
                                                    <th className="pb-3 pt-1">Customer</th>
                                                    <th className="pb-3 pt-1">Cashier</th>
                                                    <th className="pb-3 pt-1">Method</th>
                                                    <th className="pb-3 pt-1 text-right">Net Amount</th>
                                                    <th className="pb-3 pt-1 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-[#334155] font-semibold text-slate-700 dark:text-slate-300">
                                                {filteredHistory.slice((historyCurrentPage - 1) * historyItemsPerPage, historyCurrentPage * historyItemsPerPage).map((sale) => (
                                                    <tr key={sale.PSH_ID} className="hover:bg-slate-50 dark:hover:bg-[#0f172a]/30 transition-colors">
                                                        <td className="py-3.5 text-blue-600 dark:text-blue-400 font-black">{sale.PSH_INVOICE_NO}</td>
                                                        <td className="py-3.5 text-slate-500">
                                                            {new Date(sale.PSH_DATE).toLocaleDateString()} {new Date(sale.PSH_DATE).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="py-3.5 truncate max-w-[120px]">{sale.PSH_CUSTOMER_NAME}</td>
                                                        <td className="py-3.5 capitalize">{sale.PSH_ENTERED_BY}</td>
                                                        <td className="py-3.5">
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${sale.PSH_PAYMENT_METHOD === 'Cash'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                                                                : sale.PSH_PAYMENT_METHOD === 'Card'
                                                                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600'
                                                                    : sale.PSH_PAYMENT_METHOD === 'Credit'
                                                                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                                                                        : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600'
                                                                }`}>
                                                                {sale.PSH_PAYMENT_METHOD}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 text-right font-black text-slate-900 dark:text-white">
                                                            Rs. {parseFloat(sale.PSH_NET_AMOUNT).toFixed(2)}
                                                        </td>
                                                        <td className="py-3.5 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleViewReprint(sale)}
                                                                    className="px-3 py-1 bg-slate-100 dark:bg-[#0f172a] hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-[#334155] rounded-lg transition-all flex items-center gap-1 text-[10px]"
                                                                    title="Reprint"
                                                                >
                                                                    <Printer className="w-3 h-3" />
                                                                    Reprint
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSale(sale)}
                                                                    className="px-3 py-1 bg-slate-100 dark:bg-[#0f172a] hover:bg-red-600 dark:hover:bg-red-600 hover:text-white border border-slate-200 dark:border-[#334155] rounded-lg transition-all flex items-center gap-1 text-[10px] text-red-500"
                                                                    title="Delete Sale"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {filteredHistory.length > historyItemsPerPage && (
                                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4 mt-4 rounded-2xl">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                Showing {Math.min(filteredHistory.length, (historyCurrentPage - 1) * historyItemsPerPage + 1)} to {Math.min(filteredHistory.length, historyCurrentPage * historyItemsPerPage)} of {filteredHistory.length} entries
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    disabled={historyCurrentPage === 1}
                                                    onClick={() => setHistoryCurrentPage(prev => Math.max(1, prev - 1))}
                                                    className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                                                >
                                                    Previous
                                                </button>
                                                <div className="flex items-center space-x-1">
                                                    {[...Array(Math.ceil(filteredHistory.length / historyItemsPerPage))].map((_, i) => (
                                                        <button
                                                            key={i + 1}
                                                            onClick={() => setHistoryCurrentPage(i + 1)}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${historyCurrentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                                        >
                                                            {i + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    disabled={historyCurrentPage === Math.ceil(filteredHistory.length / historyItemsPerPage)}
                                                    onClick={() => setHistoryCurrentPage(prev => Math.min(Math.ceil(filteredHistory.length / historyItemsPerPage), prev + 1))}
                                                    className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Register Sidebar Cart */}
                {activeTab === 'register' && (
                    <div className="xl:col-span-5 bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-[#334155] shadow-lg flex flex-col justify-between overflow-hidden no-print">
                        {/* Cart Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-[#334155] flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            <span className="font-extrabold text-base text-slate-900 dark:text-white">Active Order</span>
                            {cart.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-black">
                                    {cart.length} {cart.length === 1 ? 'item' : 'items'}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={clearCart}
                            className="px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-all text-xs font-bold flex items-center gap-1"
                            title="Clear Cart">
                            <Trash2 className="w-4 h-4" />
                            Clear
                        </button>
                    </div>

                    {/* Cart Items Area */}
                    <div className="flex-1 p-3 overflow-y-auto min-h-[130px] max-h-[25vh] 2xl:max-h-[32vh] custom-scrollbar flex flex-col gap-2 relative">
                        {cart.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col items-center justify-center py-6 text-center"
                            >
                                <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1 animate-pulse" />
                                <p className="font-bold text-slate-500 text-xs">Cart is currently empty.</p>
                                <p className="text-[10px] text-slate-400">Select items to begin billing.</p>
                            </motion.div>
                        ) : (
                            <AnimatePresence>
                                {cart.map((item) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                        transition={{ duration: 0.2 }}
                                        key={item.P_ID}
                                        className="flex justify-between items-center gap-2 bg-slate-50 dark:bg-[#0f172a]/60 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-[#334155]/60 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                {item.P_NAME}
                                            </h5>
                                            <span className="text-[10px] text-slate-400">Rs. {item.unitPrice.toFixed(2)}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800/80 px-1 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                                                <button
                                                    onClick={() => updateQty(item.P_ID, -1)}
                                                    className="p-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={parseFloat(products.find(p => p.P_ID === item.P_ID)?.stock_balance) || 999}
                                                    value={item.qty}
                                                    onChange={(e) => handleQtyChange(item.P_ID, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-7 text-center text-xs font-black bg-transparent border-none focus:outline-none py-0 text-slate-800 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    onClick={() => updateQty(item.P_ID, 1)}
                                                    className="p-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>

                                            <div className="text-right min-w-[60px]">
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">
                                                    Rs. {(item.qty * item.unitPrice).toFixed(2)}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => removeFromCart(item.P_ID)}
                                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Checkout Billing Settings */}
                    <div className="p-3 border-t border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-slate-900/40 flex flex-col gap-2">
                        {/* Customer & Discount Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-0.5 relative">
                                <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Customer</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={selectedCustomer ? selectedCustomer.PC_NAME : customerSearchQuery}
                                        onChange={(e) => {
                                            setCustomerSearchQuery(e.target.value);
                                            if (selectedCustomer) {
                                                setSelectedCustomer(null);
                                                setCustomerName('Walking Customer');
                                            }
                                            setShowCustomerDropdown(true);
                                        }}
                                        onFocus={(e) => {
                                            e.target.select();
                                            setShowCustomerDropdown(true);
                                        }}
                                        className="w-full px-2 py-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all font-semibold text-slate-800 dark:text-white"
                                        placeholder="Search/Select Customer"
                                    />
                                    {customerSearchQuery !== 'Walking Customer' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedCustomer(null);
                                                setCustomerSearchQuery('Walking Customer');
                                                setCustomerName('Walking Customer');
                                                setIsTenderedManuallyEdited(false);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                {showCustomerDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setShowCustomerDropdown(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-lg shadow-lg z-[70] custom-scrollbar">
                                            <div
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setSelectedCustomer(null);
                                                    setCustomerName('Walking Customer');
                                                    setCustomerSearchQuery('Walking Customer');
                                                    setShowCustomerDropdown(false);
                                                    setIsTenderedManuallyEdited(false);
                                                }}
                                                className="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer text-slate-500"
                                            >
                                                Walking Customer (Default)
                                            </div>
                                            {customers
                                                .filter(c => {
                                                    const query = (customerSearchQuery === 'Walking Customer') ? '' : customerSearchQuery;
                                                    return (c.PC_NAME || '').toLowerCase().includes(query.toLowerCase());
                                                })
                                                .map(c => (
                                                    <div
                                                        key={c.PC_ID}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setSelectedCustomer(c);
                                                            setCustomerName(c.PC_NAME);
                                                            setCustomerSearchQuery(c.PC_NAME);
                                                            setShowCustomerDropdown(false);
                                                            setIsTenderedManuallyEdited(false);
                                                        }}
                                                        className="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer text-slate-800 dark:text-white flex justify-between"
                                                    >
                                                        <span>{c.PC_NAME}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">Bal: {parseFloat(c.PC_CREDIT_BALANCE || 0).toFixed(0)}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Discount (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discount || ''}
                                    onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full px-2 py-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all font-semibold text-right text-slate-800 dark:text-white"
                                    placeholder="0%"
                                />
                            </div>
                        </div>

                        {selectedCustomer && (
                            <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex flex-col gap-1.5 text-[10px]">
                                <div className="flex justify-between font-semibold">
                                    <span className="text-slate-500">Credit Limit:</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-bold">Rs. {parseFloat(selectedCustomer.PC_CREDIT_LIMIT || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span className="text-slate-500">Current Balance:</span>
                                    <span className="text-rose-500 font-bold">Rs. {parseFloat(selectedCustomer.PC_CREDIT_BALANCE || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t border-blue-100/50 dark:border-blue-900/20 pt-1">
                                    <span className="text-slate-500">Remaining Limit:</span>
                                    <span className="text-emerald-500">Rs. {Math.max(0, (parseFloat(selectedCustomer.PC_CREDIT_LIMIT || 0)) - (parseFloat(selectedCustomer.PC_CREDIT_BALANCE || 0))).toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        {/* Payment Selector */}
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Payment Method</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {[
                                    { mode: 'Cash', icon: DollarSign, color: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
                                    { mode: 'Card', icon: CreditCard, color: 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10' },
                                    { mode: 'Credit', icon: CreditCard, color: 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10' },
                                    { mode: 'Online Transfer', icon: Smartphone, color: 'border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
                                ].map((item) => (
                                    <button
                                        key={item.mode}
                                        onClick={() => {
                                            setPaymentMethod(item.mode);
                                            setIsTenderedManuallyEdited(false);
                                        }}
                                        className={`flex items-center justify-center gap-1 py-1 border rounded-lg font-bold transition-all text-xs ${paymentMethod === item.mode
                                            ? `${item.color} ring-1 ring-blue-500 shadow-sm`
                                            : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e293b]'
                                            }`}
                                    >
                                        <item.icon className="w-3.5 h-3.5" />
                                        {item.mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cash drawer drawer reconciler */}
                        {paymentMethod === 'Cash' && (
                            <div className="flex flex-col gap-1.5 p-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-xl shadow-sm">
                                <div className="grid grid-cols-2 gap-2 items-center">
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Cash Tendered (Rs)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={amountTendered}
                                            onChange={(e) => {
                                                setAmountTendered(e.target.value);
                                                setIsTenderedManuallyEdited(true);
                                            }}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full px-2 py-0.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-md text-xs font-bold text-right text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-0.5 justify-center">
                                        <span className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Change (Rs)</span>
                                        <span className={`text-xs font-black text-right pr-1 ${getChange() >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-500 animate-pulse'
                                            }`}>
                                            Rs. {cart.length > 0 ? getChange().toFixed(2) : '0.00'}
                                        </span>
                                    </div>
                                </div>

                                {/* Quick Cash Buttons */}
                                <div className="flex flex-wrap gap-1 border-t border-slate-100 dark:border-slate-800 pt-1">
                                    <button
                                        onClick={() => handleQuickCash('exact')}
                                        type="button"
                                        className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-extrabold transition-all"
                                    >
                                        Exact
                                    </button>
                                    {[100, 200, 500, 1000, 5000].map((val) => {
                                        const net = getNetTotal();
                                        const isSuggested = val >= net && val <= net + 1000;
                                        return (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => handleQuickCash(val)}
                                                className={`px-1 py-0.5 rounded text-[9px] font-bold transition-all border ${isSuggested
                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                                    : 'bg-slate-50 dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            >
                                                Rs. {val}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedCustomer && parseFloat(selectedCustomer.PC_CREDIT_BALANCE || 0) > 0 && (
                                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1">
                                        <span>Debt Settle Suggestion:</span>
                                        <button
                                            type="button"
                                            onClick={() => setAmountTendered((getNetTotal() + parseFloat(selectedCustomer.PC_CREDIT_BALANCE || 0)).toFixed(2))}
                                            className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded transition-colors text-[8px] font-extrabold"
                                        >
                                            Pay All (Rs. {(getNetTotal() + parseFloat(selectedCustomer.PC_CREDIT_BALANCE || 0)).toFixed(2)})
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {paymentMethod === 'Credit' && (
                            <div className="flex flex-col gap-1.5 p-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-xl shadow-sm">
                                <div className="grid grid-cols-2 gap-2 items-center">
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Paid Upfront (Rs)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={getNetTotal()}
                                            value={amountTendered}
                                            onChange={(e) => {
                                                setAmountTendered(e.target.value);
                                                setIsTenderedManuallyEdited(true);
                                            }}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full px-2 py-0.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-md text-xs font-bold text-right text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="text-right flex flex-col gap-0.5">
                                        <span className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Credit Due</span>
                                        <span className="text-xs font-black text-rose-500 pr-1">
                                            Rs. {Math.max(0, getNetTotal() - (parseFloat(amountTendered) || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Financial Summaries Panel */}
                        <div className="bg-[#0f172a] rounded-xl p-2.5 text-white flex flex-col gap-1 font-mono border border-[#334155] shadow-inner">
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                <span>SUBTOTAL:</span>
                                <span>Rs. {getSubtotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-red-400 font-bold border-b border-[#334155] pb-1">
                                <span>DISCOUNT ({parseFloat(discount || 0)}%):</span>
                                <span>- Rs. {(getSubtotal() * ((parseFloat(discount) || 0) / 100)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-black text-emerald-400 pt-0.5">
                                <span>NET TOTAL:</span>
                                <span className="text-base">Rs. {getNetTotal().toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Collapsible Configurations Accordion */}
                        <div className="border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-100 dark:bg-slate-900/30 overflow-hidden">
                            <details className="group">
                                <summary className="flex items-center justify-between p-2 cursor-pointer select-none font-bold text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900/50">
                                    <span className="flex items-center gap-1">
                                        ⚙️ Print & Checkout Prefs
                                    </span>
                                    <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-slate-400" />
                                </summary>
                                <div className="p-2.5 border-t border-slate-200 dark:border-[#334155] flex flex-col gap-2.5 bg-white dark:bg-[#1e293b]">



                                    {/* Checkout Action Selector Preference */}
                                    <div className="flex flex-col gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#0f172a]/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <History className="w-3 h-3 text-blue-500" />
                                            On Checkout Action
                                        </label>
                                        <select
                                            value={checkoutAction}
                                            onChange={(e) => {
                                                setCheckoutAction(e.target.value);
                                                localStorage.setItem('pos_checkout_action', e.target.value);
                                                showNotification(`Checkout action preference set successfully!`, 'info');
                                            }}
                                            className="w-full text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded p-1 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                                        >
                                            <option value="preview">👀 Show Preview Modal Only</option>
                                            <option value="browser">🖨️ Auto Open Browser Print</option>
                                            <option value="pdf">📥 Auto Download PDF Receipt</option>
                                        </select>
                                    </div>

                                    {/* Paper Size Selector */}
                                    <div className="flex flex-col gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#0f172a]/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Printer className="w-3 h-3 text-emerald-500" />
                                            Paper Roll Width
                                        </label>
                                        <select
                                            value={paperWidth}
                                            onChange={(e) => {
                                                setPaperWidth(e.target.value);
                                                localStorage.setItem('pos_paper_width', e.target.value);
                                                showNotification(`Paper roll width set to ${e.target.value}!`, 'success');
                                            }}
                                            className="w-full text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded p-1 focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                                        >
                                            <option value="80mm">80mm Paper (Standard Thermal Roll - 3 inch)</option>
                                            <option value="58mm">58mm Paper (Small Thermal Roll - 2 inch)</option>
                                        </select>
                                    </div>

                                    {/* Receipt Font Selector */}
                                    <div className="flex flex-col gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#0f172a]/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Printer className="w-3 h-3 text-purple-500" />
                                            Receipt Font Family
                                        </label>
                                        <select
                                            value={receiptFont}
                                            onChange={(e) => {
                                                setReceiptFont(e.target.value);
                                                localStorage.setItem('pos_receipt_font', e.target.value);
                                                showNotification(`Receipt font set to ${e.target.value}!`, 'success');
                                            }}
                                            className="w-full text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded p-1 focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-200 font-bold cursor-pointer" >
                                            <option value="Segoe UI">Segoe UI (Modern Clean Sans - Highly Recommended)</option>
                                            <option value="Trebuchet MS">Trebuchet MS (Bold & Crisp Sans)</option>
                                            <option value="Consolas">Consolas (Dark Monospace)</option>
                                            <option value="Courier New">Courier New (Classic Monospace)</option>
                                            <option value="Arial">Arial (Standard Sans-Serif)</option>
                                        </select>
                                    </div>
                                </div>
                            </details>
                        </div>

                        {/* Checkout Trigger */}
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || loadingCheckout}
                            className={`w-full py-3.5 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all ${cart.length === 0 || loadingCheckout
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                                }`}
                        >
                            {loadingCheckout ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Complete Checkout
                                </>
                            )}
                        </button>
                    </div>
                </div>
                )}
            </div>
        )}

            {/* Direct Printable Thermal Receipt (Completely hidden on screen, formatted to paperWidth - 80mm default) */}
            {completedSale && (
                <div id="direct-thermal-receipt" style={{ fontFamily: getReceiptFontFamily(), fontSize: paperWidth === '80mm' ? '12px' : '11px', lineHeight: '1.25', color: 'black', background: 'white', width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', boxShadow: 'none', padding: '2mm 2mm 0 2mm', margin: '0 auto', pageBreakInside: 'avoid', breakInside: 'avoid' }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginTop: '0', paddingTop: '0', marginBottom: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ border: '1.5px solid black', padding: '8px 12px', borderRadius: '4px', margin: '2mm 3px 6px 3px', textAlign: 'center' }}>
                            <img src={logoBase64} alt="Logo" style={{ height: '42px', width: 'auto', margin: '0 auto 4px auto', display: 'block', objectFit: 'contain' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 3px 0', letterSpacing: '1px' }}>INDIKA BAKERS</h3>
                            <span style={{ fontSize: '13px', fontWeight: 'normal', display: 'block', lineHeight: '1.3' }}>Mehiellagama, Hiripitiya, Nikadalupotha</span>
                            <span style={{ fontSize: '12.5px', fontWeight: 'normal', display: 'block', marginTop: '2px' }}>Tel: 071660 0165</span>
                        </div>
                        <div style={{ borderBottom: '1px dashed black', margin: '8px 0' }}></div>
                    </div>

                    {/* Metadata */}
                    <div style={{ fontSize: paperWidth === '80mm' ? '12px' : '11px', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Invoice No:</span>
                            <span style={{ fontWeight: 'bold' }}>{completedSale.invoiceNo}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Date & Time:</span>
                            <span>{new Date(completedSale.date).toLocaleDateString()} {new Date(completedSale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Cashier:</span>
                            <span style={{ textTransform: 'capitalize' }}>{completedSale.cashier}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Customer:</span>
                            <span>{completedSale.customerName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Payment Method:</span>
                            <span style={{ fontWeight: 'bold' }}>{completedSale.paymentMethod}</span>
                        </div>
                    </div>

                    <div style={{ borderBottom: '1px dashed black', margin: '6px 0' }}></div>

                    {/* Items Grid Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', fontWeight: 'bold', fontSize: paperWidth === '80mm' ? '11px' : '10.5px', marginBottom: '4px', width: '100%', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <span style={{ gridColumn: paperWidth === '80mm' ? 'span 5' : 'span 7' }}>ITEM</span>
                        {paperWidth === '80mm' && <span style={{ gridColumn: 'span 2', textAlign: 'right' }}>PRICE</span>}
                        <span style={{ gridColumn: 'span 2', textAlign: 'center' }}>QTY</span>
                        <span style={{ gridColumn: 'span 3', textAlign: 'right' }}>TOTAL</span>
                    </div>

                    {/* Items Table */}
                    <div style={{ fontSize: paperWidth === '80mm' ? '12px' : '11px', fontWeight: 'normal', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        {completedSale.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', width: '100%', alignItems: 'center', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                <span style={{ gridColumn: paperWidth === '80mm' ? 'span 5' : 'span 7', textAlign: 'left', wordBreak: 'break-word', paddingRight: '2px', fontSize: paperWidth === '80mm' ? '12px' : '11px' }}>{item.P_NAME_SINAHAL || item.P_NAME}</span>
                                {paperWidth === '80mm' && (
                                    <span style={{ gridColumn: 'span 2', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>{item.unitPrice.toFixed(0)}</span>
                                )}
                                <span style={{ gridColumn: 'span 2', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>{item.qty}</span>
                                <span style={{ gridColumn: 'span 3', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>Rs.{(item.qty * item.unitPrice).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ borderBottom: '1px dashed black', margin: '6px 0' }}></div>

                    {/* Totals Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '80mm' ? '14.5px' : '13px', fontWeight: '500' }}>
                            <span>SUBTOTAL:</span>
                            <span>Rs. {completedSale.subtotal.toFixed(2)}</span>
                        </div>
                        {completedSale.discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '80mm' ? '13.5px' : '12px', color: 'red' }}>
                                <span>FLAT DISCOUNT:</span>
                                <span>- Rs. {completedSale.discount.toFixed(2)}</span>
                            </div>
                        )}
                        {completedSale.previousBalance !== undefined && completedSale.previousBalance > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '80mm' ? '14.5px' : '13px', fontWeight: '500' }}>
                                <span>OLD BALANCE:</span>
                                <span>Rs. {completedSale.previousBalance.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '80mm' ? '17px' : '15px', fontWeight: 'bold', borderTop: '1px dashed black', paddingTop: '4px', marginTop: '3px' }}>
                            <span>NET TOTAL:</span>
                            <span>Rs. {((completedSale.previousBalance || 0) + completedSale.netAmount).toFixed(2)}</span>
                        </div>
                    </div>

                    <div style={{ borderBottom: '1px dashed black', margin: '6px 0' }}></div>

                    {/* Reconcile payment details */}
                    <div style={{ fontSize: paperWidth === '80mm' ? '11px' : '10px', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: 'normal', pageBreakInside: 'avoid', breakInside: 'avoid' }}>

                        {completedSale.paymentMethod !== 'Credit' && !(completedSale.previousBalance !== undefined && completedSale.previousBalance > 0) && completedSale.amountTendered > 0 && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>CASH TENDERED:</span>
                                    <span>Rs. {completedSale.amountTendered.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>CHANGE RETURNED:</span>
                                    <span>Rs. {completedSale.amountChange.toFixed(2)}</span>
                                </div>
                            </>
                        )}

                        {(completedSale.paymentMethod === 'Credit' || (completedSale.previousBalance !== undefined && completedSale.previousBalance > 0)) && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>AMOUNT PAID:</span>
                                    <span>Rs. {completedSale.amountTendered.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                    <span>NEW BALANCE:</span>
                                    <span>Rs. {(completedSale.newBalance || 0).toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer note */}
                    <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '3px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>THANK YOU FOR SHOPPING!</span>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#333' }}>Powered By KryptonicTec - +94 71 749 6207</span>
                    </div>

                </div>
            )}

            {/* Visual Receipt Roll Preview Modal */}
            {completedSale && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
                    <div className={`bg-slate-100 dark:bg-slate-900 rounded-3xl p-6 shadow-2xl ${paperWidth === '80mm' ? 'max-w-lg' : 'max-w-md'} w-full border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200`}>

                        {/* Header instructions */}
                        <div className="w-full text-center">
                            <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center justify-center gap-2">
                                <Printer className="w-4 h-4 text-emerald-500 animate-pulse" />
                                Virtual Receipt Roll ({paperWidth})
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1">Visualizing continuous roll alignment on screen</p>
                        </div>

                        {/* Interactive Receipt Roll Viewport */}
                        <div style={{ width: paperWidth === '80mm' ? '80mm' : '58mm', fontFamily: getReceiptFontFamily() }} className="max-h-[420px] overflow-y-auto px-4 py-3 bg-white shadow-md border-none rounded-xl relative flex flex-col gap-1 text-[11px] text-black">
                            {/* Realistic Paper Jagged Torn Header */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%)] bg-[size:6px_6px]"></div>

                            <div className="text-center font-bold mb-2 pt-1 flex flex-col items-center w-full">
                                <div className="border-[1.5px] border-black rounded-md px-4 py-2.5 mt-2 mb-1 mx-1 text-center flex flex-col items-center w-full">
                                    <img id="receipt-logo-img" src={logoBase64} alt="Logo" className="h-10 w-auto mb-1.5 mx-auto block object-contain" />
                                    <span className="text-[17px] font-black tracking-wide block text-black">INDIKA BAKERS</span>
                                    <span className="text-[12.5px] font-normal block text-black leading-snug">Mehiellagama, Hiripitiya,</span>
                                    <span className="text-[12.5px] font-normal block text-black leading-snug">Nikadalupotha</span>
                                    <span className="text-[12px] font-normal block text-black mt-0.5">Tel: 071660 0165</span>
                                </div>
                                <div className="border-b border-dashed border-black my-2 w-full"></div>
                            </div>

                            <div className="flex flex-col gap-1 text-[11.5px] leading-tight font-semibold">
                                <div className="flex justify-between"><span>Invoice:</span><strong>{completedSale.invoiceNo}</strong></div>
                                <div className="flex justify-between"><span>Date:</span><span>{new Date(completedSale.date).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Cashier:</span><span className="capitalize">{completedSale.cashier}</span></div>
                                <div className="flex justify-between"><span>Customer:</span><span>{completedSale.customerName}</span></div>
                                <div className="flex justify-between"><span>Payment:</span><span className="font-bold text-slate-800 dark:text-white uppercase">{completedSale.paymentMethod || 'CASH'}</span></div>
                            </div>

                            <div className="border-b border-dashed border-black my-1.5"></div>

                            {/* Table Header */}
                            <div className="grid grid-cols-12 font-bold mb-1 text-[10px]">
                                <span className={paperWidth === '80mm' ? "col-span-5" : "col-span-7"}>ITEM</span>
                                {paperWidth === '80mm' && <span className="col-span-2 text-right">PRICE</span>}
                                <span className="col-span-2 text-center">QTY</span>
                                <span className="col-span-3 text-right">TOTAL</span>
                            </div>

                            {/* Table rows */}
                            <div className="flex flex-col gap-1 text.12px">
                                {completedSale.items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 leading-tight items-center">
                                        <span className={`${paperWidth === '80mm' ? 'col-span-5' : 'col-span-7'} truncate pr-1 text-[11.5px]`}>
                                            {item.P_NAME_SINAHAL || item.P_NAME}
                                        </span>
                                        {paperWidth === '80mm' && (
                                            <span className="col-span-2 text-right text-[13.5px] font-medium">{item.unitPrice.toFixed(0)}</span>
                                        )}
                                        <span className="col-span-2 text-center text-[13.5px] font-medium">{item.qty}</span>
                                        <span className="col-span-3 text-right text-[13.5px] font-medium">Rs.{(item.qty * item.unitPrice).toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-b border-dashed border-black my-1.5"></div>

                            {/* Totals */}
                            <div className="flex flex-col gap-1 text-right">
                                <div className="flex justify-between text-[13.5px] font-medium"><span>SUBTOTAL:</span><span>Rs. {completedSale.subtotal.toFixed(2)}</span></div>
                                {completedSale.discount > 0 && <div className="flex justify-between text-red-600 text-[12.5px]"><span>DISCOUNT:</span><span>-Rs. {completedSale.discount.toFixed(2)}</span></div>}
                                {completedSale.previousBalance !== undefined && completedSale.previousBalance > 0 && (
                                    <div className="flex justify-between text-[13.5px] font-medium"><span>OLD BALANCE:</span><span>Rs. {completedSale.previousBalance.toFixed(2)}</span></div>
                                )}
                                <div className="flex justify-between font-bold text-[16px] pt-1 border-t border-dashed border-black">
                                    <span>NET TOTAL:</span>
                                    <span>Rs. {((completedSale.previousBalance || 0) + completedSale.netAmount).toFixed(2)}</span>
                                </div>
                                {(completedSale.paymentMethod === 'Credit' || (completedSale.previousBalance !== undefined && completedSale.previousBalance > 0)) ? (
                                    <>
                                        <div className="flex justify-between text-[12px]"><span>AMOUNT PAID:</span><span>Rs. {completedSale.amountTendered.toFixed(2)}</span></div>
                                        <div className="flex justify-between font-bold text-[12px] text-slate-800 dark:text-white"><span>NEW BALANCE:</span><span>Rs. {(completedSale.newBalance || 0).toFixed(2)}</span></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between text-[12px]"><span>PAID {(completedSale.paymentMethod || 'CASH').toUpperCase()}:</span><span>Rs. {completedSale.amountTendered.toFixed(2)}</span></div>
                                        <div className="flex justify-between font-medium text-[12px] text-emerald-600"><span>CHANGE:</span><span>Rs. {completedSale.amountChange.toFixed(2)}</span></div>
                                    </>
                                )}
                            </div>

                            <div className="border-b border-dashed border-black my-1.5"></div>

                            <div className="text-center font-bold mt-1 text-[11px] leading-tight">
                                <span>THANK YOU FOR SHOPPING!</span>
                                <span className="block text-[10.5px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">Powered By KryptonicTec - +94 71 749 6207</span>
                            </div>
                        </div>

                        {/* Control buttons */}
                        <div className="flex flex-col gap-2.5 w-full">
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => downloadReceiptPDF(completedSale)}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Download PDF
                                </button>
                                <button
                                    onClick={() => {
                                        window.print();
                                    }}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Save as PDF / Print
                                </button>
                            </div>

                            <button
                                onClick={() => setCompletedSale(null)}
                                className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyboard Shortcuts Help Bar */}
            {/* <div className="mt-6 p-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm flex flex-wrap gap-4 items-center justify-center text-xs text-slate-500 dark:text-slate-400 no-print">
                <span className="font-extrabold uppercase text-[10px] tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Keyboard className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                    Cashier Hotkeys:
                </span>
                <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">F4</kbd> <span>Focus Search</span></div>
                <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">Enter</kbd> <span>Add Item</span></div>
                <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">F7</kbd> <span>Set Cash</span></div>
                <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">F8</kbd> <span>Set Card</span></div>
                <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">F10</kbd> <span>Set Credit</span></div>
                <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">F6</kbd> <span>Set Online</span></div>
                <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">F2</kbd> <span>Complete Checkout</span></div>
                <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">F9</kbd> <span>Clear Order</span></div>
                <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-[#334155] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">Esc</kbd> <span>Close Preview</span></div>
            </div> */}
            {/* Price Selection Modal */}
            <AnimatePresence>
                {selectedProductForPrice && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm"
                        >
                            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white line-clamp-2">
                                {selectedProductForPrice.P_NAME}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                                Select the pricing tier to apply:
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        addToCart(selectedProductForPrice, selectedProductForPrice.last_sale_price);
                                        setSelectedProductForPrice(null);
                                    }}
                                    className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left group"
                                >
                                    <div className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">Retail Price</div>
                                    <div className="text-blue-600 dark:text-blue-400 font-black text-lg">Rs. {(parseFloat(selectedProductForPrice.last_sale_price) || 0).toFixed(2)}</div>
                                </button>

                                <button
                                    onClick={() => {
                                        addToCart(selectedProductForPrice, selectedProductForPrice.last_wholesale_price);
                                        setSelectedProductForPrice(null);
                                    }}
                                    className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-left group"
                                >
                                    <div className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">Wholesale</div>
                                    <div className="text-emerald-600 dark:text-emerald-400 font-black text-lg">Rs. {(parseFloat(selectedProductForPrice.last_wholesale_price) || 0).toFixed(2)}</div>
                                </button>

                                <button
                                    onClick={() => {
                                        addToCart(selectedProductForPrice, selectedProductForPrice.last_selling_price);
                                        setSelectedProductForPrice(null);
                                    }}
                                    className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-500 dark:hover:border-purple-500 transition-colors text-left group"
                                >
                                    <div className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-purple-700 dark:group-hover:text-purple-400">Selling Price</div>
                                    <div className="text-purple-600 dark:text-purple-400 font-black text-lg">Rs. {(parseFloat(selectedProductForPrice.last_selling_price) || 0).toFixed(2)}</div>
                                </button>
                            </div>

                            <button
                                onClick={() => setSelectedProductForPrice(null)}
                                className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default POSPage;
