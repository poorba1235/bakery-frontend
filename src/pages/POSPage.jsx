import { AnimatePresence, motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
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
import qzPrintService from '../services/qzPrintService';

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

    const [invoiceNo, setInvoiceNo] = useState('');
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Receipt History States
    const [salesHistory, setSalesHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Active Completed Sale State for Direct Printing
    const [completedSale, setCompletedSale] = useState(null);
    const [isSilentPrint, setIsSilentPrint] = useState(true);
    const [selectedProductForPrice, setSelectedProductForPrice] = useState(null);

    // QZ Tray Printer States
    const [qzPrinters, setQzPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('qz_selected_printer') || '');

    // Post-Checkout Print Action Selection ('preview' | 'qz' | 'pdf' | 'browser')
    const [checkoutAction, setCheckoutAction] = useState(localStorage.getItem('pos_checkout_action') || 'preview');

    // Load data on mount
    useEffect(() => {
        fetchInitialData();
        // Focus the search input on mount
        setTimeout(() => {
            document.getElementById('product-search')?.focus();
        }, 400);
    }, []);

    // Load QZ Tray Printer List on mount
    useEffect(() => {
        const loadQZPrinters = async () => {
            try {
                const list = await qzPrintService.getAvailablePrinters();
                console.log('[QZ Tray] Available local printers on boot:', list);
                setQzPrinters(list);
                if (list.length > 0) {
                    const matched = list.find(p => {
                        const name = p.toLowerCase();
                        return name.includes('receipt') ||
                            name.includes('thermal') ||
                            name.includes('tsp') ||
                            name.includes('pos') ||
                            name.includes('xprinter') ||
                            name.includes('xp-');
                    });
                    const defaultPrinter = matched || list[0];
                    if (!selectedPrinter) {
                        setSelectedPrinter(defaultPrinter);
                        localStorage.setItem('qz_selected_printer', defaultPrinter);
                    }
                }
            } catch (err) {
                console.warn('[QZ Tray] Loopback service not found or running on boot:', err.message);
            }
        };
        loadQZPrinters();
    }, []);

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
        if (amount === 'exact') {
            setAmountTendered(net.toFixed(2));
        } else {
            setAmountTendered(amount.toString());
        }
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
        return Math.max(0, getSubtotal() - parseFloat(discount || 0));
    };

    const getChange = () => {
        const tendered = parseFloat(amountTendered) || 0;
        const net = getNetTotal();
        return tendered - net;
    };

    // Trigger receipt modal display on screen
    const triggerDirectPrint = (saleData) => {
        setCompletedSale(saleData);
    };

    // Trigger QZ Tray Raw Silent Printing directly on the counter PC
    const handleQZPrint = async (saleData) => {
        const targetSale = saleData && saleData.invoiceNo ? saleData : completedSale;
        if (!targetSale) return;
        try {
            await qzPrintService.printReceipt(targetSale, selectedPrinter);
            showNotification('QZ Tray: Spooled directly to physical printer!', 'success');
        } catch (err) {
            console.error('[QZPrint] Failed:', err);
            showNotification(err.message || 'QZ Tray connection offline. Ensure the QZ application is running.', 'error');
        }
    };

    // Auto Download structured PDF receipt natively using local jsPDF (Works 100% offline!)
    const downloadReceiptPDF = (saleData) => {
        const targetSale = saleData && saleData.invoiceNo ? saleData : completedSale;
        if (!targetSale) return;

        // Set dimensions: Standard thermal paper is 80mm wide
        // Height scales dynamically: ~8mm per checkout item row + padding bounds
        const width = 80;
        const height = Math.max(120, targetSale.items.length * 8 + 90);
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [width, height]
        });

        // Use Courier (built-in monospace font) for flawless alignment
        doc.setFont('Courier', 'bold');
        doc.setFontSize(12);

        let y = 10;
        // Brand Header
        doc.text("INDIKA BAKERS", width / 2, y, { align: 'center' });

        doc.setFont('Courier', 'normal');
        doc.setFontSize(8);
        y += 4;
        doc.text("Mehiellagama, Hiripitiya, Nikadalupotha", width / 2, y, { align: 'center' });
        y += 3;
        doc.text("Tel: 071660 0165", width / 2, y, { align: 'center' });

        y += 3;
        doc.text("------------------------------------------", width / 2, y, { align: 'center' });

        // Metadata grid
        y += 4;
        doc.text(`Invoice No:  ${targetSale.invoiceNo}`, 5, y);
        y += 3.5;
        doc.text(`Date & Time: ${new Date(targetSale.date).toLocaleString()}`, 5, y);
        y += 3.5;
        doc.text(`Cashier:     ${targetSale.cashier.toUpperCase()}`, 5, y);
        y += 3.5;
        y += 3.5;
        doc.text(`Customer:    ${targetSale.customerName}`, 5, y);
        y += 3.5;
        doc.setFont('Courier', 'bold');
        doc.text(`Payment:     ${(targetSale.paymentMethod || 'CASH').toUpperCase()}`, 5, y);
        doc.setFont('Courier', 'normal');

        y += 3;
        doc.text("------------------------------------------", width / 2, y, { align: 'center' });

        // Table Header
        y += 4;
        doc.setFont('Courier', 'bold');
        doc.text("ITEM", 5, y);
        doc.text("QTY", 52, y);
        doc.text("TOTAL", 75, y, { align: 'right' });

        y += 2.5;
        doc.setFont('Courier', 'normal');
        doc.text("------------------------------------------", width / 2, y, { align: 'center' });

        // Print table rows
        targetSale.items.forEach(item => {
            y += 4;
            // Truncate item name cleanly to avoid wrapping overlaps on standard 80mm roll width
            const displayName = item.P_NAME.length > 22 ? item.P_NAME.substring(0, 20) + ".." : item.P_NAME;
            doc.text(displayName, 5, y);
            doc.text(item.qty.toString(), 53, y);

            const totalStr = `Rs.${(item.qty * item.unitPrice).toFixed(0)}`;
            doc.text(totalStr, 75, y, { align: 'right' });
        });

        y += 3;
        doc.text("------------------------------------------", width / 2, y, { align: 'center' });

        // Finance calculations
        y += 4;
        doc.text(`SUBTOTAL:`, 5, y);
        doc.text(`Rs. ${targetSale.subtotal.toFixed(2)}`, 75, y, { align: 'right' });

        if (targetSale.discount > 0) {
            y += 3.5;
            doc.text(`DISCOUNT:`, 5, y);
            doc.text(`-Rs. ${targetSale.discount.toFixed(2)}`, 75, y, { align: 'right' });
        }

        y += 4;
        doc.setFont('Courier', 'bold');
        doc.text(`NET TOTAL:`, 5, y);
        doc.text(`Rs. ${targetSale.netAmount.toFixed(2)}`, 75, y, { align: 'right' });

        y += 3.5;
        doc.setFont('Courier', 'normal');
        doc.text(`PAID CASH:`, 5, y);
        doc.text(`Rs. ${targetSale.amountTendered.toFixed(2)}`, 75, y, { align: 'right' });

        y += 4;
        doc.setFont('Courier', 'bold');
        doc.text(`CHANGE:`, 5, y);
        doc.text(`Rs. ${targetSale.amountChange.toFixed(2)}`, 75, y, { align: 'right' });

        y += 3;
        doc.setFont('Courier', 'normal');
        doc.text("------------------------------------------", width / 2, y, { align: 'center' });

        // Store slogan footer
        y += 5;
        doc.setFont('Courier', 'bold');
        doc.text("THANK YOU FOR SHOPPING!", width / 2, y, { align: 'center' });
        y += 3.5;
        doc.setFont('Courier', 'normal');
        doc.text("Indika Bakers - Sweetening Your Day!", width / 2, y, { align: 'center' });

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
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
                { P_NAME: "Butter Croissant (Fresh)", qty: 4, unitPrice: 120.00 },
                { P_NAME: "Chocolate Glazed Donut", qty: 3, unitPrice: 100.00 },
                { P_NAME: "Premium White Bread (Large)", qty: 2, unitPrice: 240.00 },
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

        setLoadingCheckout(true);
        try {
            const saleData = {
                items: cart.map(item => ({
                    productId: item.P_ID,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    unit: item.P_UNIT || 'Pcs'
                })),
                discount: parseFloat(discount) || 0,
                paymentMethod,
                customerName
            };
            // const response = await api.post('/pos/sales', saleData);
            // Mock response for frontend testing
            const response = { data: { invoiceNo: 'TEST-' + Math.floor(Math.random() * 10000) } };

            const completed = {
                invoiceNo: response.data.invoiceNo,
                date: new Date(),
                cashier: user?.username || 'Admin',
                customerName,
                paymentMethod,
                subtotal: getSubtotal(),
                discount: parseFloat(discount) || 0,
                netAmount: netTotal,
                amountTendered: paymentMethod === 'Cash' ? tendered : netTotal,
                amountChange: paymentMethod === 'Cash' ? Math.max(0, getChange()) : 0,
                items: [...cart]
            };

            showNotification('Sale completed successfully!', 'success');
            clearCart();

            // Trigger the configured checkout printing action preference
            if (checkoutAction === 'preview') {
                triggerDirectPrint(completed);
            } else if (checkoutAction === 'qz') {
                triggerDirectPrint(completed);
                // handleQZPrint(completed);
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

            {/* Inline CSS styling for print size configuration (8cm / 80mm width, auto height, no page breaks) */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @page {
                    size: 80mm auto; /* Exactly 8cm width and unlimited/auto height based on rows content */
                    margin: 0 !important;
                }
                @media print {
                    /* Hide specific structural layouts but NOT #root itself so the DOM stays active */
                    header, aside, nav, button, footer, .no-print {
                        display: none !important;
                    }
                    /* Set default visibility of body to hidden */
                    body {
                        visibility: hidden !important;
                    }
                    /* Reset structural parent layouts to zero height constraints, padding, and margins to print at absolute top edge */
                    main, .max-w-7xl, #root, .min-h-screen, [class*="min-h-"] {
                        height: auto !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        margin-left: 0 !important;
                        left: 0 !important;
                    }
                    /* Configure page and body for roll exact fit without pagination breaks */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: #fff !important;
                        overflow: visible !important;
                        
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
                    }
                    #direct-thermal-receipt {
                        position: absolute !important;
                        top: 0 !important;
                        left: 2% !important;
                        display: block !important;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 1mm !important;
                        box-sizing: border-box !important;
                        background: white !important;
                        color: black !important;
                        
                        /* Prevent any random vertical page breaking inside receipt content */
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
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
                    <button
                        onClick={handleTestPrint}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Test Thermal Print
                    </button>

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
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 no-print">

                {/* Left Column: Product Picker OR Sales History */}
                <div className="xl:col-span-8 flex flex-col gap-4">
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
                                            {filteredHistory.map((sale) => (
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
                                                        <button
                                                            onClick={() => handleViewReprint(sale)}
                                                            className="px-3 py-1 bg-slate-100 dark:bg-[#0f172a] hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-[#334155] rounded-lg transition-all flex items-center gap-1 mx-auto text-[10px]"
                                                        >
                                                            <Printer className="w-3 h-3" />
                                                            Reprint
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Register Sidebar Cart */}
                <div className="xl:col-span-4 bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-[#334155] shadow-lg flex flex-col justify-between overflow-hidden no-print">
                    {/* Cart Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-[#334155] flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            <span className="font-extrabold text-base text-slate-900 dark:text-white">Active Order</span>
                            {cart.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-black">
                                    {cart.length}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={clearCart}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-all"
                            title="Clear Cart"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Cart Items Area */}
                    <div className="flex-1 p-4 overflow-y-auto max-h-[40vh] 2xl:max-h-[50vh] custom-scrollbar flex flex-col gap-3 relative">
                        {cart.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col items-center justify-center py-10 text-center"
                            >
                                <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2 animate-pulse" />
                                <p className="font-semibold text-slate-400 text-xs">Cart is currently empty.</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Select products to begin billing.</p>
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
                                        className="flex justify-between items-center gap-3 bg-white dark:bg-[#0f172a]/60 p-2.5 rounded-xl border border-slate-200 dark:border-[#334155]/60 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                {item.P_NAME}
                                            </h5>
                                            <span className="text-[10px] text-slate-400">Rs. {item.unitPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                            <button
                                                onClick={() => updateQty(item.P_ID, -1)}
                                                className="p-1 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
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
                                                className="w-8 text-center text-xs font-black bg-transparent border-none focus:outline-none py-0.5 text-slate-800 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <button
                                                onClick={() => updateQty(item.P_ID, 1)}
                                                className="p-1 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-600 mx-0.5"></div>
                                            <button
                                                onClick={() => removeFromCart(item.P_ID)}
                                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
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
                    <div className="p-4 border-t border-slate-100 dark:border-[#334155] bg-slate-50 dark:bg-slate-900/20 flex flex-col gap-3">
                        {/* Customer & Discount Grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Customer Name</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full px-2.5 py-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all font-semibold"
                                    placeholder="Walking Customer"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Discount (Rs)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={discount || ''}
                                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full px-2.5 py-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all font-semibold text-right"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Payment Selector */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Method</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {[
                                    { mode: 'Cash', icon: DollarSign, color: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5' },
                                    { mode: 'Card', icon: CreditCard, color: 'border-blue-500/30 text-blue-600 bg-blue-500/5' },
                                    { mode: 'Credit', icon: CreditCard, color: 'border-rose-500/30 text-rose-600 bg-rose-500/5' },
                                    { mode: 'Online Transfer', icon: Smartphone, color: 'border-indigo-500/30 text-indigo-600 bg-indigo-500/5' },
                                ].map((item) => (
                                    <button
                                        key={item.mode}
                                        onClick={() => setPaymentMethod(item.mode)}
                                        className={`flex items-center justify-center gap-1 py-1.5 border rounded-lg font-bold transition-all text-xs ${paymentMethod === item.mode
                                            ? `${item.color} ring-1 ring-blue-500`
                                            : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-[#1e293b]'
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
                            <div className="flex flex-col gap-2 p-2.5 bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-xl">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Cash Tendered (Rs)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={amountTendered}
                                            onChange={(e) => setAmountTendered(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full px-2 py-0.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-md text-xs font-black text-right text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-0.5 justify-center">
                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Change (Rs)</span>
                                        <span className={`text-xs font-black text-right pr-1.5 ${getChange() >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-500 animate-pulse'
                                            }`}>
                                            Rs. {cart.length > 0 ? getChange().toFixed(2) : '0.00'}
                                        </span>
                                    </div>
                                </div>

                                {/* Quick Cash Buttons */}
                                <div className="flex flex-wrap gap-1 border-t border-slate-200/50 dark:border-slate-800/50 pt-1.5">
                                    <button
                                        onClick={() => handleQuickCash('exact')}
                                        type="button"
                                        className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[8px] font-extrabold transition-all"
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
                                                className={`px-1 py-0.5 rounded text-[8px] font-bold transition-all border ${isSuggested
                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1e293b]'}`}
                                            >
                                                Rs. {val}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Financial Summaries Panel */}
                        <div className="bg-[#0f172a] rounded-xl p-3 text-white flex flex-col gap-1.5 font-mono border border-[#334155] shadow-inner">
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                <span>SUBTOTAL:</span>
                                <span>Rs. {getSubtotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-red-400 font-bold border-b border-[#334155] pb-1.5">
                                <span>FLAT DISCOUNT:</span>
                                <span>- Rs. {parseFloat(discount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base font-black text-emerald-400 pt-0.5">
                                <span>NET TOTAL:</span>
                                <span>Rs. {getNetTotal().toFixed(2)}</span>
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
                                    {/* Silent Printing Toggle */}
                                    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 dark:bg-[#0f172a]/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Printer className="w-3 h-3 text-blue-500" />
                                            Silent Print
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={isSilentPrint}
                                                onChange={(e) => setIsSilentPrint(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-7 h-3.5 bg-slate-200 dark:bg-[#334155] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-2.5 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {/* QZ Tray Printer Selector */}
                                    <div className="flex flex-col gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#0f172a]/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Printer className="w-3 h-3 text-indigo-500" />
                                            QZ Thermal Printer
                                        </label>
                                        {qzPrinters.length > 0 ? (
                                            <select
                                                value={selectedPrinter}
                                                onChange={(e) => {
                                                    setSelectedPrinter(e.target.value);
                                                    localStorage.setItem('qz_selected_printer', e.target.value);
                                                    showNotification(`Active QZ Printer: ${e.target.value}`, 'success');
                                                }}
                                                className="w-full text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-[#334155] rounded p-1 focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                                            >
                                                {qzPrinters.map((printer, idx) => (
                                                    <option key={idx} value={printer}>
                                                        {printer}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-[9px] text-slate-400 italic">
                                                QZ offline. Launch QZ Tray.
                                            </span>
                                        )}
                                    </div>

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
                                            <option value="qz">⚡ Auto Silent Print (QZ Tray)</option>
                                            <option value="pdf">📥 Auto Download PDF Receipt</option>
                                            <option value="browser">🖨️ Auto Open Browser Print</option>
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
                                    <CheckCircle className="w-4 h-4" />
                                    Complete Checkout
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Direct Printable Thermal Receipt (Completely hidden on screen, formatted perfectly to exactly 10cm / 100mm width, auto height for thermal printers) */}
            {completedSale && (
                <div id="direct-thermal-receipt" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: '10.5px', lineHeight: '1.2', color: 'black', background: 'white', width: '100%', boxSizing: 'border-box', pageBreakInside: 'avoid', breakInside: 'avoid' }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <img src="/logo.png" alt="Logo" style={{ height: '35px', margin: '0 auto 4px auto', display: 'block', filter: 'grayscale(100%)' }} />
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 3px 0', letterSpacing: '1px' }}>INDIKA BAKERS</h3>
                        <span style={{ fontSize: '10px', display: 'block' }}>Mehiellagama, Hiripitiya, Nikadalupotha</span>
                        <span style={{ fontSize: '9px', display: 'block' }}>Tel: 071660 0165</span>
                        <div style={{ borderBottom: '1px dashed black', margin: '6px 0' }}></div>
                    </div>

                    {/* Metadata */}
                    <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '2.5px', marginBottom: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
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
                            <span>PAYMENT METHOD:</span>
                            <span style={{ fontWeight: 'bold' }}>{completedSale.paymentMethod}</span>
                        </div>
                    </div>

                    <div style={{ borderBottom: '1px dashed black', margin: '6px 0' }}></div>

                    {/* Items Grid Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', fontWeight: 'bold', fontSize: '10px', marginBottom: '4px', width: '100%', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <span style={{ gridColumn: 'span 7' }}>ITEM</span>
                        <span style={{ gridColumn: 'span 2', textAlign: 'center' }}>QTY</span>
                        <span style={{ gridColumn: 'span 3', textAlign: 'right' }}>TOTAL</span>
                    </div>

                    {/* Items Table */}
                    <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4.5px', marginBottom: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        {completedSale.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', width: '100%', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                <span style={{ gridColumn: 'span 7', textAlign: 'left', wordBreak: 'break-word', paddingRight: '2px' }}>{item.P_NAME}</span>
                                <span style={{ gridColumn: 'span 2', textAlign: 'center' }}>{item.qty}</span>
                                <span style={{ gridColumn: 'span 3', textAlign: 'right' }}>Rs.{(item.qty * item.unitPrice).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ borderBottom: '1px dashed black', margin: '6px 0' }}></div>

                    {/* Totals Summary */}
                    <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '3px', fontWeight: 'bold', marginBottom: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'normal' }}>
                            <span>SUBTOTAL:</span>
                            <span>Rs. {completedSale.subtotal.toFixed(2)}</span>
                        </div>
                        {completedSale.discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'normal', color: 'red' }}>
                                <span>FLAT DISCOUNT:</span>
                                <span>- Rs. {completedSale.discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '900', borderTop: '1px dashed black', paddingTop: '3px', marginTop: '2px' }}>
                            <span>NET TOTAL:</span>
                            <span>Rs. {completedSale.netAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    <div style={{ borderBottom: '1px dashed black', margin: '6px 0' }}></div>

                    {/* Reconcile payment details */}
                    <div style={{ fontSize: '9px', display: 'flex', flexDirection: 'column', gap: '2px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>

                        {completedSale.paymentMethod === 'Cash' && completedSale.amountTendered > 0 && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>CASH TENDERED:</span>
                                    <span>Rs. {completedSale.amountTendered.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                    <span>CHANGE RETURNED:</span>
                                    <span>Rs. {completedSale.amountChange.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer note */}
                    <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '2px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold' }}>THANK YOU FOR SHOPPING!</span>
                        <span style={{ fontSize: '9px', color: 'gray' }}>Indika Bakers - Sweetening Your Day!</span>
                    </div>

                </div>
            )}

            {/* Visual Receipt Roll Preview Modal */}
            {completedSale && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
                    <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">

                        {/* Header instructions */}
                        <div className="w-full text-center">
                            <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center justify-center gap-2">
                                <Printer className="w-4 h-4 text-emerald-500 animate-pulse" />
                                Virtual Receipt Roll (80mm)
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1">Visualizing continuous roll alignment on screen</p>
                        </div>

                        {/* Interactive Receipt Roll Viewport */}
                        <div className="w-[80mm] max-h-[400px] overflow-y-auto p-4 bg-white shadow-lg border border-slate-200 rounded-xl relative flex flex-col gap-1 font-mono text-[11px] text-black">
                            {/* Realistic Paper Jagged Torn Header */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%)] bg-[size:6px_6px]"></div>

                            <div className="text-center font-bold mb-2 pt-1 flex flex-col items-center">
                                <img src="/logo.png" alt="Logo" className="h-8 w-auto mb-1 opacity-90 grayscale" />
                                <span className="text-[14px] tracking-wide block">INDIKA BAKERS</span>
                                <span className="text-[9px] block text-slate-500">Mehiellagama, Hiripitiya, Nikadalupotha</span>
                                <span className="text-[9px] block text-slate-500">Tel: 071660 0165</span>
                                <div className="border-b border-dashed border-black my-1.5"></div>
                            </div>

                            <div className="flex flex-col gap-1 text-[9.5px]">
                                <div className="flex justify-between"><span>Invoice:</span><strong>{completedSale.invoiceNo}</strong></div>
                                <div className="flex justify-between"><span>Date:</span><span>{new Date(completedSale.date).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Cashier:</span><span className="capitalize">{completedSale.cashier}</span></div>
                                <div className="flex justify-between"><span>Customer:</span><span>{completedSale.customerName}</span></div>
                                <div className="flex justify-between"><span>Payment:</span><span className="font-bold text-slate-800 dark:text-white uppercase">{completedSale.paymentMethod || 'CASH'}</span></div>
                            </div>

                            <div className="border-b border-dashed border-black my-1.5"></div>

                            {/* Table Header */}
                            <div className="grid grid-cols-12 font-bold mb-1">
                                <span className="col-span-7">ITEM</span>
                                <span className="col-span-2 text-center">QTY</span>
                                <span className="col-span-3 text-right">TOTAL</span>
                            </div>

                            {/* Table rows */}
                            <div className="flex flex-col gap-1">
                                {completedSale.items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 leading-tight">
                                        <span className="col-span-7 truncate pr-1">{item.P_NAME}</span>
                                        <span className="col-span-2 text-center">{item.qty}</span>
                                        <span className="col-span-3 text-right">Rs.{(item.qty * item.unitPrice).toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-b border-dashed border-black my-1.5"></div>

                            {/* Totals */}
                            <div className="flex flex-col gap-1 text-right text-[10px]">
                                <div className="flex justify-between"><span>SUBTOTAL:</span><span>Rs. {completedSale.subtotal.toFixed(2)}</span></div>
                                {completedSale.discount > 0 && <div className="flex justify-between text-red-600"><span>DISCOUNT:</span><span>-Rs. {completedSale.discount.toFixed(2)}</span></div>}
                                <div className="flex justify-between font-bold text-[11px]"><span>NET TOTAL:</span><span>Rs. {completedSale.netAmount.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>PAID CASH:</span><span>Rs. {completedSale.amountTendered.toFixed(2)}</span></div>
                                <div className="flex justify-between font-bold text-emerald-600"><span>Balance:</span><span>Rs. {completedSale.amountChange.toFixed(2)}</span></div>
                            </div>

                            <div className="border-b border-dashed border-black my-1.5"></div>

                            <div className="text-center font-bold mt-1 text-[10px] leading-tight">
                                <span>THANK YOU FOR SHOPPING!</span>
                                <span className="block text-[8.5px] text-slate-500 font-normal">Indika Bakers - Sweetening Your Day!</span>
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
                                onClick={() => handleQZPrint(completedSale)}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/10 active:scale-[0.98]"
                            >
                                <Printer className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
                                ⚡ Silent Hardware Print (QZ Tray)
                            </button>

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
