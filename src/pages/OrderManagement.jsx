import { AnimatePresence, motion } from 'framer-motion';
import JsBarcode from 'jsbarcode';
import {
    ArrowRight,
    Calculator,
    Calendar,
    CheckCircle,
    ChevronLeft,
    Clock,
    DollarSign,
    Eye,
    FileText,
    Layers,
    Loader2,
    Minus,
    Package,
    Plus,
    Printer,
    Save,
    Search,
    ShoppingBag,
    ShoppingCart,
    Trash2,
    X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import ProductLabelPrintContainer from '../components/ProductLabelPrintContainer';


const getSriLankaDate = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    if (isNaN(d.getTime())) {
        const now = new Date();
        const colomboOffset = 5.5 * 60 * 60 * 1000;
        const colomboTime = new Date(now.getTime() + colomboOffset);
        return colomboTime.toISOString().split('T')[0];
    }
    const colomboOffset = 5.5 * 60 * 60 * 1000;
    const colomboTime = new Date(d.getTime() + colomboOffset);
    return colomboTime.toISOString().split('T')[0];
};

const OrderManagement = () => {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();

    // Helper to prevent entering negative numbers, 'e', and '+' in number inputs
    const preventMinus = (e) => {
        if (["-", "+", "e", "E"].includes(e.key)) {
            e.preventDefault();
        }
    };

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
    const [isEditingItem, setIsEditingItem] = useState(null); // Track which item is being edited
    const [itemStock, setItemStock] = useState([]);
    const [isStockLoading, setIsStockLoading] = useState(false);

    // Print States
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [batchesToPrint, setBatchesToPrint] = useState([]);
    const [isRePrintMode, setIsRePrintMode] = useState(false);
    const [printFormat, setPrintFormat] = useState('50x50');
    const [editingOrder, setEditingOrder] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [showPreview, setShowPreview] = useState(false);
    const printRef = useRef();
    const productionSheetPrintRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => {
            console.log('Print completed or cancelled');
            if (!isRePrintMode) setShowPrintModal(false);
        }
    });

    const handlePrintProductionSheet = useReactToPrint({
        contentRef: productionSheetPrintRef,
        onAfterPrint: () => {
            console.log('Production sheet print completed');
        }
    });

    const executePrint = () => {
        console.log('Triggering print dialog...');
        handlePrint();
    };

    const fetchOrderBatches = async (id, isRePrint = false) => {
        try {
            const res = await api.get(`/orders/${id}/batches`);
            console.log('Production Batches Data:', res.data);
            if (res.data && res.data.length > 0) {
                setIsRePrintMode(isRePrint);

                const batchesWithQuantities = res.data.map(b => ({
                    ...b,
                    original_quantity: b.quantity,
                    print_quantity: b.quantity
                }));

                setBatchesToPrint(batchesWithQuantities);
                setShowPreview(!isRePrint); // Show preview immediately for approval, wait for confirm for re-print
                setShowPrintModal(true);
            } else {
                showNotification('No batches found for this order', 'info');
            }
        } catch (error) {
            showNotification('Failed to load barcodes', 'error');
        }
    };

    // Auth & Permissions
    const perms = currentUser?.permissions?.split(',') || [];
    const roles_list = currentUser?.roles?.toLowerCase() || '';
    const hasOrderManage = perms.includes('order-manage');
    const isSystemAdmin = roles_list.includes('admin') || roles_list.includes('super admin');

    const formatToLocalDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatPrice = (val) => {
        return parseFloat(val || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // New Order State
    const [newOrder, setNewOrder] = useState({
        OR_DATE: getSriLankaDate(),
        OR_REFFERENCE: '',
        items: []
    });

    // Bulk Entry Table States
    const [modalItems, setModalItems] = useState({});
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const [globalLocation, setGlobalLocation] = useState('');
    const [modalPage, setModalPage] = useState(1);
    const modalItemsPerPage = 10;

    // Stock & Recipe & Bag Shortages States
    const [shortageModalOpen, setShortageModalOpen] = useState(false);
    const [shortagesList, setShortagesList] = useState({ products: [], rawMaterials: [], bags: [] });
    const [pendingPayload, setPendingPayload] = useState(null);
    const [shortageProductIds, setShortageProductIds] = useState([]);
    const [shortageRecipeProductIds, setShortageRecipeProductIds] = useState([]);
    const [shortageBagProductIds, setShortageBagProductIds] = useState([]);

    // Single Product Shortage Preview States
    const [productShortageModalOpen, setProductShortageModalOpen] = useState(false);
    const [productShortageProduct, setProductShortageProduct] = useState(null);
    const [productShortageQty, setProductShortageQty] = useState(0);
    const [productShortageData, setProductShortageData] = useState(null);
    const [isProductShortageLoading, setIsProductShortageLoading] = useState(false);

    // Production Batch Sheet States
    const [productionSheetOpen, setProductionSheetOpen] = useState(false);
    const [productionSheetData, setProductionSheetData] = useState(null);
    const [isProductionSheetLoading, setIsProductionSheetLoading] = useState(false);

    useEffect(() => {
        if (isAddModalOpen) {
            const initial = {};
            const existingItemsMap = {};

            if (editingOrder && newOrder.items) {
                newOrder.items.forEach(item => {
                    existingItemsMap[item.OD_PRODUCT_ID.toString()] = {
                        checked: true,
                        OD_PRODUCT_ID: item.OD_PRODUCT_ID.toString(),
                        OD_QTY: item.OD_QTY.toString(),
                        OD_UNIT_SALE_PRICE: item.OD_UNIT_SALE_PRICE.toString(),
                        OD_UNIT_WHOLE_SALE_PRICE: (item.OD_UNIT_WHOLE_SALE_PRICE || 0).toString(),
                        OD_UNIT_COST_PRICE: (item.OD_UNIT_COST_PRICE || 0).toString(),
                        LOCATIONID: (item.LOCATIONID || locations[0]?.L_ID || '').toString(),
                        BAG_ISSUED: item.BAG_ISSUED || 0,
                        BAG_RM_ID: item.BAG_RM_ID?.toString() || '',
                        BAG_SIZE: item.BAG_SIZE || '',
                        BAG_QTY: (item.BAG_QTY || 1).toString(),
                        OD_MFG_DATE: formatToLocalDate(item.OD_MFG_DATE),
                        OD_EXP_DATE: formatToLocalDate(item.OD_EXP_DATE),
                        OD_UNIT_SELLING_PRICE: (item.OD_UNIT_SELLING_PRICE || 0).toString(),
                        OD_UNIT_SHOP_PRICE: (item.OD_UNIT_SHOP_PRICE || 0).toString(),
                        OD_UNIT_LIMIT_PRICE: (item.OD_UNIT_LIMIT_PRICE || 0).toString()
                    };
                });
            }

            products.forEach(p => {
                const pIdStr = p.P_ID.toString();
                if (existingItemsMap[pIdStr]) {
                    initial[pIdStr] = existingItemsMap[pIdStr];
                } else {
                    const nowSL = new Date(getSriLankaDate());
                    const mfgDate = new Date(nowSL.getTime() + 24 * 60 * 60 * 1000);
                    const mfgDateStr = getSriLankaDate(mfgDate);

                    let expDateStr = '';
                    if (p.P_ITEM_STORED_DAYS) {
                        const expDate = new Date(mfgDate.getTime() + parseInt(p.P_ITEM_STORED_DAYS) * 24 * 60 * 60 * 1000);
                        expDateStr = getSriLankaDate(expDate);
                    }

                    initial[pIdStr] = {
                        checked: false,
                        OD_PRODUCT_ID: pIdStr,
                        OD_QTY: '',
                        OD_UNIT_SALE_PRICE: (p.last_sale_price || p.P_SALE_PRICE || '').toString(),
                        OD_UNIT_WHOLE_SALE_PRICE: (p.last_wholesale_price || p.P_WHOLE_SALE_PRICE || '').toString(),
                        OD_UNIT_COST_PRICE: (p.P_COST_PRICE || '').toString(),
                        LOCATIONID: (globalLocation || locations[0]?.L_ID || '').toString(),
                        BAG_ISSUED: 0,
                        BAG_RM_ID: '',
                        BAG_SIZE: '',
                        BAG_QTY: '1',
                        OD_MFG_DATE: mfgDateStr,
                        OD_EXP_DATE: expDateStr,
                        OD_UNIT_SELLING_PRICE: (p.last_selling_price || '').toString(),
                        OD_UNIT_SHOP_PRICE: (p.last_shop_price || '').toString(),
                        OD_UNIT_LIMIT_PRICE: (p.last_limit_price || '').toString()
                    };
                }
            });
            setModalItems(initial);
        } else {
            setModalItems({});
            setModalSearchTerm('');
            setModalPage(1);
        }
    }, [isAddModalOpen, editingOrder, products, locations, globalLocation]);

    // New Item State
    const [newItem, setNewItem] = useState({
        OD_PRODUCT_ID: '',
        OD_QTY: '',
        OD_UNIT_SALE_PRICE: '',
        OD_UNIT_WHOLE_SALE_PRICE: '',
        OD_UNIT_COST_PRICE: '',
        LOCATIONID: '',
        BAG_ISSUED: 0,
        BAG_RM_ID: '',
        BAG_SIZE: '',
        BAG_QTY: 1,
        OD_EXP_DATE: '',
        OD_MFG_DATE: ''
    });

    const [costPreview, setCostPreview] = useState(null);
    const [isPrevewing, setIsPreviewing] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [orderRes, prodRes, locRes, rmRes] = await Promise.all([
                api.get('/orders'),
                api.get('/product/items'),
                api.get('/warehouse/locations'),
                api.get('/raw-material')
            ]);
            setOrders(orderRes.data);
            setProducts(prodRes.data);
            setLocations(locRes.data);
            setRawMaterials(rmRes.data);

            if (locRes.data.length > 0) {
                setNewItem(prev => ({ ...prev, LOCATIONID: locRes.data[0].L_ID }));
            }
        } catch (error) {
            showNotification('Failed to load order data', 'error');
        } finally {
            setIsLoading(false);
        }
    };



    const editItem = (item) => {
        setIsEditingItem(item.id);
        setNewItem({
            OD_PRODUCT_ID: item.OD_PRODUCT_ID.toString(),
            OD_QTY: item.OD_QTY,
            OD_UNIT_SALE_PRICE: item.OD_UNIT_SALE_PRICE,
            OD_UNIT_WHOLE_SALE_PRICE: item.OD_UNIT_WHOLE_SALE_PRICE,
            OD_UNIT_COST_PRICE: item.OD_UNIT_COST_PRICE,
            LOCATIONID: item.LOCATIONID || 1,
            BAG_ISSUED: item.BAG_ISSUED || 0,
            BAG_RM_ID: item.BAG_RM_ID || '',
            BAG_SIZE: item.BAG_SIZE || '',
            BAG_QTY: item.BAG_QTY || 1,
            OD_MFG_DATE: formatToLocalDate(item.OD_MFG_DATE),
            OD_EXP_DATE: formatToLocalDate(item.OD_EXP_DATE)
        });
        setCostPreview({
            hasRecipe: true,
            totalCost: item.estimated_cost || (item.estimated_unit_cost * item.OD_QTY),
            unitCost: item.estimated_unit_cost,
            breakdown: []
        });
    };

    const removeItem = (id) => {
        if (isEditingItem === id) {
            setIsEditingItem(null);
            setNewItem(prev => ({ ...prev, OD_PRODUCT_ID: '', OD_QTY: '' }));
        }
        setNewOrder({ ...newOrder, items: newOrder.items.filter(item => item.id !== id) });
    };

    useEffect(() => {
        if (newItem.OD_PRODUCT_ID && newItem.OD_QTY && parseFloat(newItem.OD_QTY) > 0) {
            fetchCostPreview();
        } else {
            setCostPreview(null);
        }
    }, [newItem.OD_PRODUCT_ID, newItem.OD_QTY]);

    const fetchCostPreview = async () => {
        setIsPreviewing(true);
        setPreviewError(null);
        try {
            const res = await api.get(`/orders/preview-cost?productId=${newItem.OD_PRODUCT_ID}&qty=${newItem.OD_QTY}`);
            setCostPreview(res.data);
        } catch (error) {
            console.error('Preview failed', error);
            setPreviewError(error.response?.data?.message || 'Connection error');
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleViewProductShortage = async (product, qty) => {
        setProductShortageProduct(product);
        const quantity = parseFloat(qty) || 1;
        setProductShortageQty(quantity);
        setProductShortageModalOpen(true);
        setIsProductShortageLoading(true);
        setProductShortageData(null);
        try {
            const res = await api.get(`/orders/preview-cost?productId=${product.P_ID}&qty=${quantity}`);
            setProductShortageData(res.data);
        } catch (error) {
            console.error('Failed to fetch product shortage details:', error);
            showNotification('Failed to load raw material shortage details', 'error');
        } finally {
            setIsProductShortageLoading(false);
        }
    };

    const handleViewProductionSheet = async (orderId) => {
        setProductionSheetOpen(true);
        setIsProductionSheetLoading(true);
        setProductionSheetData(null);
        try {
            const res = await api.get(`/orders/${orderId}/production-sheet`);
            setProductionSheetData(res.data);
        } catch (error) {
            console.error('Failed to fetch production batch sheet:', error);
            showNotification('Failed to load production batch sheet details', 'error');
        } finally {
            setIsProductionSheetLoading(false);
        }
    };

    const handleSaveOrder = async (e, forceSave = false) => {
        if (e && e.preventDefault) e.preventDefault();

        if (!globalLocation) {
            showNotification('Please select a Global Warehouse Location at the top', 'error');
            return;
        }

        const selectedItems = [];
        const errors = [];

        Object.keys(modalItems).forEach(pId => {
            const row = modalItems[pId];
            if (row && row.checked) {
                const product = products.find(p => p.P_ID === parseInt(pId));

                // Validate Qty
                if (!row.OD_QTY || parseFloat(row.OD_QTY) <= 0) {
                    errors.push(`Please enter a valid quantity for ${product?.P_NAME}`);
                }

                const sellingPrice = parseFloat(row.OD_UNIT_SELLING_PRICE || 0);
                const shopPrice = parseFloat(row.OD_UNIT_SHOP_PRICE || 0);
                const limitPrice = parseFloat(row.OD_UNIT_LIMIT_PRICE || 0);
                const wholesalePrice = parseFloat(row.OD_UNIT_WHOLE_SALE_PRICE || 0);
                const retailPrice = parseFloat(row.OD_UNIT_SALE_PRICE || 0);

                // Validate Selling Price
                if (sellingPrice <= 0) {
                    errors.push(`Please enter a valid Selling Price for ${product?.P_NAME}`);
                }
                // Validate Shop Price
                if (shopPrice < sellingPrice) {
                    errors.push(`Shop Price cannot be less than Selling Price for ${product?.P_NAME}`);
                }
                // Validate W.Sale vs Retail Price
                if (wholesalePrice > retailPrice) {
                    errors.push(`W.Sale price cannot be greater than retail price for ${product?.P_NAME}`);
                }

                // Validate Bags
                if (row.BAG_ISSUED === 1 && !row.BAG_RM_ID) {
                    errors.push(`Please select a bag for ${product?.P_NAME}`);
                }

                const location = locations.find(l => l.L_ID === parseInt(globalLocation));

                selectedItems.push({
                    OD_PRODUCT_ID: parseInt(row.OD_PRODUCT_ID),
                    OD_QTY: parseFloat(row.OD_QTY),
                    OD_UNIT_SALE_PRICE: retailPrice,
                    OD_UNIT_WHOLE_SALE_PRICE: wholesalePrice,
                    OD_UNIT_COST_PRICE: parseFloat(row.OD_UNIT_COST_PRICE || 0),
                    LOCATIONID: parseInt(globalLocation),
                    BAG_ISSUED: row.BAG_ISSUED,
                    BAG_RM_ID: row.BAG_RM_ID ? parseInt(row.BAG_RM_ID) : null,
                    BAG_SIZE: row.BAG_SIZE || '',
                    BAG_QTY: row.BAG_ISSUED === 1 ? parseFloat(row.BAG_QTY || 1) : 0,
                    OD_EXP_DATE: row.OD_EXP_DATE || null,
                    OD_MFG_DATE: row.OD_MFG_DATE || null,
                    OD_UNIT_SELLING_PRICE: sellingPrice,
                    OD_UNIT_SHOP_PRICE: shopPrice,
                    OD_UNIT_LIMIT_PRICE: limitPrice,
                    product_name: product?.P_NAME,
                    product_code: product?.P_CODE,
                    location_name: location?.L_NAME || 'Default',
                    OD_UNIT: product?.P_UNIT || 'Unit',
                    total: parseFloat(row.OD_QTY) * retailPrice
                });
            }
        });

        if (errors.length > 0) {
            showNotification(errors[0], 'error');
            return;
        }

        if (selectedItems.length === 0) {
            showNotification('Please select at least one product using the checkboxes', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Check for shortages before saving if not forced
            if (!forceSave) {
                const checkRes = await api.post('/orders/check-shortages', { items: selectedItems });
                if (checkRes.data.hasShortage) {
                    setShortagesList({
                        products: checkRes.data.productShortages || [],
                        rawMaterials: checkRes.data.rawMaterialShortages || [],
                        bags: checkRes.data.bagShortages || []
                    });
                    setShortageProductIds((checkRes.data.productShortages || []).map(p => p.id));
                    setShortageRecipeProductIds(checkRes.data.shortageRecipeProductIds || []);
                    setShortageBagProductIds(checkRes.data.shortageBagProductIds || []);
                    setPendingPayload(selectedItems);
                    setShortageModalOpen(true);
                    setIsSaving(false);
                    showNotification('Warning: Stock is not enough! Please review the shortages details.', 'error');
                    return;
                }
            }

            const payload = {
                ...newOrder,
                items: selectedItems
            };

            let savedOrderId = null;
            if (editingOrder) {
                await api.put(`/orders/${editingOrder.OR_ID}`, payload);
                showNotification('Order updated successfully', 'success');
                savedOrderId = editingOrder.OR_ID;
            } else {
                const res = await api.post('/orders', payload);
                showNotification('Order created successfully', 'success');
                savedOrderId = res.data?.id || null;
            }
            setIsAddModalOpen(false);
            setEditingOrder(null);
            setNewOrder({
                OR_DATE: getSriLankaDate(),
                OR_REFFERENCE: '',
                items: []
            });
            setShortageModalOpen(false);
            setShortagesList({ products: [], rawMaterials: [], bags: [] });
            setShortageProductIds([]);
            setShortageRecipeProductIds([]);
            setShortageBagProductIds([]);
            setPendingPayload(null);
            fetchInitialData();

            // Automatic report modal popup on save has been disabled as requested by the user. 
            // Users can still view and print the production sheet later from the order table.
            /*
            if (isSystemAdmin && savedOrderId) {
                handleViewProductionSheet(savedOrderId);
            }
            */
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to save order', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditClick = async (order) => {
        try {
            const res = await api.get(`/orders/${order.OR_ID}`);
            const itemsWithTotals = res.data.map(item => {
                const loc = locations.find(l => l.L_ID === parseInt(item.LOCATIONID));
                return {
                    ...item,
                    location_name: loc?.L_NAME || 'Default',
                    total: parseFloat(item.OD_TOTAL_SALE) || 0,
                    OD_MFG_DATE: formatToLocalDate(item.OD_MFG_DATE),
                    OD_EXP_DATE: formatToLocalDate(item.OD_EXP_DATE),
                    id: Math.random().toString(36).substr(2, 9) // Local ID for UI mapping
                };
            });

            const initialLocId = itemsWithTotals[0]?.LOCATIONID?.toString() || locations[0]?.L_ID?.toString() || '';
            setGlobalLocation(initialLocId);

            setNewOrder({
                OR_DATE: new Date(order.OR_DATE).toISOString().split('T')[0],
                OR_REFFERENCE: order.OR_REFFERENCE || '',
                items: itemsWithTotals
            });
            setEditingOrder(order);
            setIsAddModalOpen(true);
        } catch (error) {
            showNotification('Failed to fetch order details for editing', 'error');
        }
    };

    const handleApproveOrder = async (orderId) => {
        setIsProcessing(true);
        try {
            // 1. Fetch order details to check raw material / bag requirements
            const detailRes = await api.get(`/orders/${orderId}`);
            const items = detailRes.data;

            const selectedItems = items.map(item => ({
                OD_PRODUCT_ID: item.OD_PRODUCT_ID,
                OD_QTY: parseFloat(item.OD_QTY),
                BAG_ISSUED: item.BAG_ISSUED,
                BAG_RM_ID: item.BAG_RM_ID,
                BAG_QTY: parseFloat(item.BAG_QTY || 0)
            }));

            // 2. Perform frontend stock shortage pre-check
            const checkRes = await api.post('/orders/check-shortages', { items: selectedItems });
            if (checkRes.data.hasShortage) {
                setShortagesList({
                    products: checkRes.data.productShortages || [],
                    rawMaterials: checkRes.data.rawMaterialShortages || [],
                    bags: checkRes.data.bagShortages || []
                });
                setShortageProductIds((checkRes.data.productShortages || []).map(p => p.id));
                setShortageRecipeProductIds(checkRes.data.shortageRecipeProductIds || []);
                setShortageBagProductIds(checkRes.data.shortageBagProductIds || []);
                
                // Open shortage warning modal
                setShortageModalOpen(true);
                showNotification('Warning: Cannot approve! Stock is not enough. Please review raw materials and bags shortages.', 'error');
                return;
            }

            // 3. Confirm and approve order
            if (!window.confirm('Approve this order? This will deduct raw materials from stock and update finished goods inventory.')) return;
            
            await api.post(`/orders/${orderId}/approve`);
            showNotification('Order approved and inventory updated!', 'success');
            setViewingOrder(null);
            fetchInitialData();

            // Automatically trigger barcode printing (NOT re-print)
            // fetchOrderBatches(orderId, false);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to approve order', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteOrder = async (id) => {
        if (!window.confirm('Are you sure you want to delete this pending order?')) return;
        try {
            await api.delete(`/orders/${id}`);
            showNotification('Order deleted successfully', 'success');
            fetchInitialData();
        } catch (error) {
            showNotification('Failed to delete order', 'error');
        }
    };

    const handleViewDetails = async (order) => {
        setViewingOrder(order);
        try {
            const res = await api.get(`/orders/${order.OR_ID}`);
            const items = res.data;

            // If pending, try to fetch estimated costs for all items to show in the list
            if (parseInt(order.OR_STATUS) === 0) {
                const updatedItems = await Promise.all(items.map(async (item) => {
                    try {
                        const costRes = await api.get(`/orders/preview-cost?productId=${item.OD_PRODUCT_ID}&qty=${item.OD_QTY}`);
                        return { ...item, estimated_unit_cost: costRes.data.unitCost };
                    } catch (e) {
                        return item;
                    }
                }));
                setOrderDetails(updatedItems);
            } else {
                setOrderDetails(items);
            }
        } catch (error) {
            showNotification('Failed to load order details', 'error');
        }
    };

    const filteredOrders = orders
        .filter(o => {
            const matchesSearch =
                o.OR_NO?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.OR_REFFERENCE?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (activeTab === 'history') {
                return parseInt(o.OR_STATUS) === 2;
            } else {
                return parseInt(o.OR_STATUS) !== 2;
            }
        })
        .sort((a, b) => b.OR_ID - a.OR_ID);

    const getStatusBadge = (status) => {
        const isApproved = parseInt(status) === 2;
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {isApproved ? <CheckCircle className="w-3 h-3 mr-1.5" /> : <Clock className="w-3 h-3 mr-1.5" />}
                {isApproved ? 'Approved' : 'Pending'}
            </span>
        );
    };

    if (isAddModalOpen) {
        return (
            <>
                <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Beautiful Back Button header */}
                    <div className="mb-8 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => { setIsAddModalOpen(false); setEditingOrder(null); }}
                            className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-all font-black uppercase tracking-widest text-[10px] bg-slate-100 dark:bg-slate-800 py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md active:scale-95"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Back to Orders List</span>
                        </button>
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-blue-500/10 px-4 py-2 rounded-xl">
                            {editingOrder ? `Updating Order #${editingOrder.OR_NO}` : 'New Order Mode'}
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
                            {editingOrder ? `Edit Order #${editingOrder.OR_NO}` : 'Create New Order'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {editingOrder ? 'Modify pending sales order details and product allocations.' : 'Select products from the catalog, specify quantities, dates, and warehouse details.'}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-200 dark:border-[#334155] shadow-xl overflow-hidden p-8">
                        <form onSubmit={handleSaveOrder} className="space-y-10">
                            {/* Order Metadata */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-[#0f172a]/30 p-8 rounded-3xl border border-slate-200 dark:border-[#334155]">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Order Date</label>
                                    <input type="date" required value={newOrder.OR_DATE} onChange={(e) => setNewOrder({ ...newOrder, OR_DATE: e.target.value })} className="w-full bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Reference / Remarks</label>
                                    <input type="text" value={newOrder.OR_REFFERENCE} onChange={(e) => setNewOrder({ ...newOrder, OR_REFFERENCE: e.target.value })} placeholder="Reference (Optional)" className="w-full bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                                </div>
                            </div>

                            {/* Bulk Product Selection and Details Table */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                                    <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
                                    Select Products and Enter Quantities / Details
                                </h4>

                                {/* Filters & Preselectors */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-[#0f172a]/30 p-6 rounded-3xl border border-slate-200 dark:border-[#334155] items-center">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Search Products</label>
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Filter products by name or code..."
                                                value={modalSearchTerm}
                                                onChange={(e) => {
                                                    setModalSearchTerm(e.target.value);
                                                    setModalPage(1);
                                                }}
                                                className="w-full pl-11 pr-6 py-3 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl outline-none text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Global Warehouse Location (Auto-apply to checked)</label>
                                        <select
                                            value={globalLocation}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setGlobalLocation(val);
                                                setModalItems(prev => {
                                                    const next = { ...prev };
                                                    Object.keys(next).forEach(pId => {
                                                        next[pId] = { ...next[pId], LOCATIONID: val };
                                                    });
                                                    return next;
                                                });
                                            }}
                                            className="w-full bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-[#334155] rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        >
                                            <option value="">Select Warehouse Location</option>
                                            {locations.map(loc => (
                                                <option key={loc.L_ID} value={loc.L_ID}>{loc.L_NAME}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Products Table */}

                                {(() => {
                                    const filteredProducts = products.filter(p =>
                                        p.P_NAME?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                                        p.P_CODE?.toLowerCase().includes(modalSearchTerm.toLowerCase())
                                    );
                                    const totalModalPages = Math.ceil(filteredProducts.length / modalItemsPerPage);
                                    const startIndex = (modalPage - 1) * modalItemsPerPage;
                                    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + modalItemsPerPage);

                                    return (
                                        <>
                                            <div className="border border-slate-200 dark:border-[#334155] rounded-3xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-[#334155]">
                                                            <tr>
                                                                <th className="px-6 py-5 text-center w-14">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={products.length > 0 && products.every(p => modalItems[p.P_ID.toString()]?.checked)}
                                                                        onChange={(e) => {
                                                                            const checked = e.target.checked;
                                                                            setModalItems(prev => {
                                                                                const next = { ...prev };
                                                                                products.forEach(p => {
                                                                                    const pId = p.P_ID.toString();
                                                                                    if (next[pId]) {
                                                                                        next[pId].checked = checked;
                                                                                    }
                                                                                });
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                                                                    />
                                                                </th>
                                                                <th className="px-6 py-5 text-sm font-black">Product</th>
                                                                <th className="px-6 py-5 text-sm font-black w-24">Qty</th>
                                                                <th className="px-6 py-5 text-sm font-black w-48">Base Tiers (LKR)</th>
                                                                <th className="px-6 py-5 text-sm font-black w-40">Order Price (LKR)</th>
                                                                <th className="px-6 py-5 text-sm font-black w-44">Dates (Mfg & Exp)</th>
                                                                <th className="px-6 py-5 text-sm font-black w-24">Bag?</th>
                                                                <th className="px-6 py-5 text-sm font-black w-44">Bag Details</th>
                                                                <th className="px-6 py-5 text-sm font-black w-36">Total (LKR)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                                                            {paginatedProducts.map(p => {
                                                                const pId = p.P_ID.toString();
                                                                const row = modalItems[pId] || {};
                                                                const isChecked = !!row.checked;

                                                                return (
                                                                    <tr key={pId} className={`transition-all text-sm ${isChecked ? 'bg-blue-50/40 dark:bg-blue-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                                                                        {/* Checkbox */}
                                                                        <td className="px-6 py-4.5 text-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={(e) => {
                                                                                    setModalItems(prev => ({
                                                                                        ...prev,
                                                                                        [pId]: {
                                                                                            ...prev[pId],
                                                                                            checked: e.target.checked
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                                                                            />
                                                                        </td>

                                                                        {/* Product Info */}
                                                                        <td className="px-6 py-4.5">
                                                                            <div className="font-extrabold text-slate-800 dark:text-white leading-tight text-sm">{p.P_NAME}</div>
                                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                                <span className="text-xs font-mono text-slate-400">{p.P_CODE} ({p.P_UNIT || 'Unit'})</span>

                                                                                {shortageProductIds.includes(p.P_ID) && (
                                                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white flex items-center gap-1">
                                                                                        ⚠️ Out of Stock
                                                                                    </span>
                                                                                )}
                                                                                {shortageRecipeProductIds.includes(p.P_ID) && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleViewProductShortage(p, row.OD_QTY)}
                                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50 cursor-pointer transition-all active:scale-95 shadow-sm"
                                                                                        title="Click to view shortage details table"
                                                                                    >
                                                                                        Raw Material Short (View details)
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </td>

                                                                        {/* Qty */}
                                                                        <td className="px-6 py-4.5">
                                                                            <div className="flex flex-col">
                                                                                <input
                                                                                    type="number"
                                                                                    disabled={!isChecked}
                                                                                    placeholder="0.00"
                                                                                    min="0"
                                                                                    step="any"
                                                                                    value={row.OD_QTY || ''}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        setModalItems(prev => {
                                                                                            const updatedRow = { ...prev[pId], OD_QTY: val };
                                                                                            if (updatedRow.BAG_ISSUED === 1) {
                                                                                                updatedRow.BAG_QTY = val;
                                                                                            }
                                                                                            return { ...prev, [pId]: updatedRow };
                                                                                        });
                                                                                    }}
                                                                                    className={`w-28 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl py-2 px-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${!isChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                />
                                                                                {isChecked && parseFloat(row.OD_QTY || 0) > parseFloat(p.stock_balance || 0) && (
                                                                                    <span className="text-[10px] font-black text-rose-500 mt-1 animate-pulse">
                                                                                        ⚠️ Exceeds Stock
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>

                                                                        {/* Base Tiers (LKR) */}
                                                                        <td className="px-6 py-4.5">
                                                                            <div className="flex flex-col gap-2 w-44">
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase w-14">Selling</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        disabled={!isChecked}
                                                                                        placeholder="Selling"
                                                                                        min="0"
                                                                                        step="any"
                                                                                        value={row.OD_UNIT_SELLING_PRICE || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            setModalItems(prev => ({
                                                                                                ...prev,
                                                                                                [pId]: { ...prev[pId], OD_UNIT_SELLING_PRICE: val }
                                                                                            }));
                                                                                        }}
                                                                                        className={`bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-1 px-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/50 w-24 ${!isChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase w-14">Shop</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        disabled={!isChecked}
                                                                                        placeholder="Shop"
                                                                                        min="0"
                                                                                        step="any"
                                                                                        value={row.OD_UNIT_SHOP_PRICE || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            setModalItems(prev => ({
                                                                                                ...prev,
                                                                                                [pId]: { ...prev[pId], OD_UNIT_SHOP_PRICE: val }
                                                                                            }));
                                                                                        }}
                                                                                        className={`bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-1 px-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/50 w-24 ${!isChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase w-14">Limit</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        disabled={!isChecked}
                                                                                        placeholder="Limit"
                                                                                        min="0"
                                                                                        step="any"
                                                                                        value={row.OD_UNIT_LIMIT_PRICE || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            setModalItems(prev => ({
                                                                                                ...prev,
                                                                                                [pId]: { ...prev[pId], OD_UNIT_LIMIT_PRICE: val }
                                                                                            }));
                                                                                        }}
                                                                                        className={`bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-1 px-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/50 w-24 ${!isChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </td>

                                                                        {/* Order Price (LKR) */}
                                                                        <td className="px-6 py-4.5">
                                                                            <div className="flex flex-col gap-2 w-32">
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase w-8">R.Sale</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        disabled={!isChecked}
                                                                                        placeholder="0.00"
                                                                                        min="0"
                                                                                        step="any"
                                                                                        value={row.OD_UNIT_SALE_PRICE || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            setModalItems(prev => ({
                                                                                                ...prev,
                                                                                                [pId]: { ...prev[pId], OD_UNIT_SALE_PRICE: val }
                                                                                            }));
                                                                                        }}
                                                                                        className={`bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-1.5 px-2.5 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/50 w-20 ${!isChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase w-8">W.Sale</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        disabled={!isChecked}
                                                                                        placeholder="0.00"
                                                                                        min="0"
                                                                                        step="any"
                                                                                        value={row.OD_UNIT_WHOLE_SALE_PRICE || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            setModalItems(prev => ({
                                                                                                ...prev,
                                                                                                [pId]: { ...prev[pId], OD_UNIT_WHOLE_SALE_PRICE: val }
                                                                                            }));
                                                                                        }}
                                                                                        className={`bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-1.5 px-2.5 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/50 w-20 ${!isChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </td>

                                                                        {/* Dates (Mfg & Exp) */}
                                                                        <td className="px-6 py-4.5">
                                                                            <div className="flex flex-col gap-2 w-36">
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase w-8">MFG</span>
                                                                                    <input
                                                                                        type="date"
                                                                                        disabled={!isChecked}
                                                                                        value={row.OD_MFG_DATE || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            setModalItems(prev => {
                                                                                                const updatedRow = { ...prev[pId], OD_MFG_DATE: val };
                                                                                                if (p.P_ITEM_STORED_DAYS && val) {
                                                                                                    const mfgDate = new Date(val);
                                                                                                    const expDate = new Date(mfgDate);
                                                                                                    expDate.setDate(expDate.getDate() + parseInt(p.P_ITEM_STORED_DAYS));
                                                                                                    updatedRow.OD_EXP_DATE = expDate.toISOString().split('T')[0];
                                                                                                }
                                                                                                return { ...prev, [pId]: updatedRow };
                                                                                            });
                                                                                        }}
                                                                                        className={`bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-1.5 px-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/50 ${!isChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase w-8">EXP</span>
                                                                                    <input
                                                                                        type="date"
                                                                                        disabled={!isChecked}
                                                                                        value={row.OD_EXP_DATE || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            setModalItems(prev => ({
                                                                                                ...prev,
                                                                                                [pId]: { ...prev[pId], OD_EXP_DATE: val }
                                                                                            }));
                                                                                        }}
                                                                                        className={`bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-1.5 px-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/50 ${!isChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </td>

                                                                        {/* Bag Issued */}
                                                                        <td className="px-6 py-4.5">
                                                                            <div className="flex items-center space-x-2">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    disabled={!isChecked}
                                                                                    checked={row.BAG_ISSUED === 1}
                                                                                    onChange={(e) => {
                                                                                        const checked = e.target.checked;
                                                                                        setModalItems(prev => ({
                                                                                            ...prev,
                                                                                            [pId]: {
                                                                                                ...prev[pId],
                                                                                                BAG_ISSUED: checked ? 1 : 0,
                                                                                                BAG_QTY: checked ? (prev[pId]?.OD_QTY || '1') : '1'
                                                                                            }
                                                                                        }));
                                                                                    }}
                                                                                    className={`w-5 h-5 accent-indigo-600 rounded cursor-pointer ${!isChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                />
                                                                                <span className="text-xs font-bold text-slate-500 uppercase">Yes</span>
                                                                            </div>
                                                                        </td>

                                                                        {/* Bag Details */}
                                                                        <td className="px-6 py-4.5">
                                                                            {row.BAG_ISSUED === 1 && isChecked ? (
                                                                                <div className="flex flex-col gap-2 w-36">
                                                                                    <select
                                                                                        value={row.BAG_RM_ID || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            const selectedRM = rawMaterials.find(rm => rm.RM_ID === parseInt(val));
                                                                                            setModalItems(prev => ({
                                                                                                ...prev,
                                                                                                [pId]: {
                                                                                                    ...prev[pId],
                                                                                                    BAG_RM_ID: val,
                                                                                                    BAG_SIZE: selectedRM?.RM_NAME || ''
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                        className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-1.5 px-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/50"
                                                                                    >
                                                                                        <option value="">Select Bag</option>
                                                                                        {rawMaterials.filter(rm => rm.RM_MATERIAL_TYPE === 'Packaging').map(rm => (
                                                                                            <option key={rm.RM_ID} value={rm.RM_ID}>
                                                                                                {rm.RM_NAME} ({parseFloat(rm.total_stock || 0)} avail)
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                    <input
                                                                                        type="number"
                                                                                        placeholder="Bag Qty"
                                                                                        min="1"
                                                                                        value={row.BAG_QTY || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            setModalItems(prev => ({
                                                                                                ...prev,
                                                                                                [pId]: { ...prev[pId], BAG_QTY: val }
                                                                                            }));
                                                                                        }}
                                                                                        className="bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-lg py-1.5 px-2.5 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500/50"
                                                                                    />
                                                                                    {row.BAG_RM_ID && parseFloat(row.BAG_QTY || 0) > parseFloat(rawMaterials.find(rm => rm.RM_ID === parseInt(row.BAG_RM_ID))?.total_stock || 0) && (
                                                                                        <span className="text-[9px] font-black text-rose-500 animate-pulse mt-0.5">
                                                                                            ⚠️ Exceeds Bag Stock
                                                                                        </span>
                                                                                    )}
                                                                                    {shortageBagProductIds.includes(p.P_ID) && (
                                                                                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse mt-1 text-center flex items-center justify-center gap-1">
                                                                                            ⚠️ Bag Shortage
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">N/A</span>
                                                                            )}
                                                                        </td>

                                                                        {/* Total */}
                                                                        <td className="px-6 py-4.5 font-black text-blue-600 text-sm">
                                                                            {isChecked && row.OD_QTY && row.OD_UNIT_SALE_PRICE ? (
                                                                                <span>LKR {formatPrice(parseFloat(row.OD_QTY) * parseFloat(row.OD_UNIT_SALE_PRICE))}</span>
                                                                            ) : (
                                                                                <span>LKR 0.00</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        <tfoot className="bg-slate-50/50 dark:bg-[#0f172a]/30">
                                                            <tr className="font-black text-slate-800 dark:text-white border-t border-slate-200 dark:border-[#334155]">
                                                                <td colSpan="7" className="px-6 py-5 text-right uppercase tracking-[0.2em] text-xs">Gross Total Sale</td>
                                                                <td className="px-6 py-5 text-sm text-blue-600">
                                                                    LKR {formatPrice(
                                                                        Object.keys(modalItems).reduce((sum, pId) => {
                                                                            const row = modalItems[pId];
                                                                            if (row?.checked && row?.OD_QTY && row?.OD_UNIT_SALE_PRICE) {
                                                                                return sum + (parseFloat(row.OD_QTY) * parseFloat(row.OD_UNIT_SALE_PRICE));
                                                                            }
                                                                            return sum;
                                                                        }, 0)
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Premium Pagination Panel */}
                                            {totalModalPages > 1 && (
                                                <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50 dark:bg-[#0f172a]/30 px-6 py-4 rounded-3xl border border-slate-200 dark:border-[#334155] gap-4">
                                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        Showing <span className="font-black text-slate-800 dark:text-white">{startIndex + 1}</span> to{' '}
                                                        <span className="font-black text-slate-800 dark:text-white">
                                                            {Math.min(startIndex + modalItemsPerPage, filteredProducts.length)}
                                                        </span>{' '}
                                                        of <span className="font-black text-slate-800 dark:text-white">{filteredProducts.length}</span> products
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            type="button"
                                                            disabled={modalPage === 1}
                                                            onClick={() => setModalPage(prev => Math.max(prev - 1, 1))}
                                                            className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:scale-105 active:scale-95"
                                                        >
                                                            Previous
                                                        </button>

                                                        {Array.from({ length: totalModalPages }, (_, i) => i + 1)
                                                            .filter(page => page === 1 || page === totalModalPages || Math.abs(page - modalPage) <= 1)
                                                            .map((page, idx, arr) => {
                                                                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                                                                return (
                                                                    <React.Fragment key={page}>
                                                                        {showEllipsis && <span className="text-slate-400 font-bold px-1 text-xs">...</span>}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setModalPage(page)}
                                                                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${modalPage === page
                                                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                                                                : 'bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                                                                                }`}
                                                                        >
                                                                            {page}
                                                                        </button>
                                                                    </React.Fragment>
                                                                );
                                                            })}

                                                        <button
                                                            type="button"
                                                            disabled={modalPage === totalModalPages}
                                                            onClick={() => setModalPage(prev => Math.min(prev + 1, totalModalPages))}
                                                            className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:scale-105 active:scale-95"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex gap-4 pt-6 mt-8 pb-4 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingOrder(null); }} className="flex-1 px-8 py-4 bg-slate-100 dark:bg-[#334155] text-slate-700 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-[#404e63] transition-all">Cancel</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                    <span>{isSaving ? 'Saving Order...' : (editingOrder ? 'Update Order' : 'Submit Pending Order')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Stock & Recipe & Bag Shortages Warning Modal */}
                <AnimatePresence>
                    {shortageModalOpen && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShortageModalOpen(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            >
                                {/* Modal Header */}
                                <div className="p-8 border-b border-slate-200 dark:border-[#334155] bg-amber-500/10 flex items-center space-x-4">
                                    <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400">
                                        <ShoppingBag className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Inventory Shortages Warning</h3>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Some elements do not have enough stock to fulfill this order. Please review the details below.</p>
                                    </div>
                                </div>

                                {/* Modal Content */}
                                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 dark:bg-[#0f172a]/20">

                                    {/* Finished Goods Shortages */}
                                    {shortagesList.products.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                                                <Package size={16} className="stroke-[3]" />
                                                <h4 className="text-xs font-black uppercase tracking-wider">Finished Goods Stock Shortages</h4>
                                            </div>
                                            <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-[#334155]">
                                                        <tr>
                                                            <th className="px-6 py-4">Product Name</th>
                                                            <th className="px-6 py-4 text-right">Requested</th>
                                                            <th className="px-6 py-4 text-right">Available</th>
                                                            <th className="px-6 py-4 text-right text-rose-500">Shortage</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-xs font-bold">
                                                        {shortagesList.products.map((p, idx) => (
                                                            <tr key={idx}>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-extrabold text-slate-800 dark:text-white">{p.name}</div>
                                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.code}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">{p.requested} {p.unit}</td>
                                                                <td className="px-6 py-4 text-right text-emerald-600">{p.available} {p.unit}</td>
                                                                <td className="px-6 py-4 text-right text-rose-600 font-black">-{p.shortage.toFixed(2)} {p.unit}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Raw Material Recipe Shortages */}
                                    {shortagesList.rawMaterials.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                                                <FileText size={16} className="stroke-[3]" />
                                                <h4 className="text-xs font-black uppercase tracking-wider">Raw Material Recipe Shortages</h4>
                                            </div>
                                            <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-[#334155]">
                                                        <tr>
                                                            <th className="px-6 py-4">Ingredient Raw Material</th>
                                                            <th className="px-6 py-4 text-right">Required</th>
                                                            <th className="px-6 py-4 text-right">Available</th>
                                                            <th className="px-6 py-4 text-right text-rose-500">Shortage</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-xs font-bold">
                                                        {shortagesList.rawMaterials.map((r, idx) => (
                                                            <tr key={idx}>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-extrabold text-slate-800 dark:text-white">{r.name}</div>
                                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.code}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">{r.requested.toFixed(3)} {r.unit}</td>
                                                                <td className="px-6 py-4 text-right text-emerald-600">{r.available.toFixed(3)} {r.unit}</td>
                                                                <td className="px-6 py-4 text-right text-rose-600 font-black">-{r.shortage.toFixed(3)} {r.unit}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Packaging Bags Shortages */}
                                    {shortagesList.bags.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                                                <ShoppingCart size={16} className="stroke-[3]" />
                                                <h4 className="text-xs font-black uppercase tracking-wider">Packaging Bags Shortages</h4>
                                            </div>
                                            <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-[#334155]">
                                                        <tr>
                                                            <th className="px-6 py-4">Bag Raw Material Name</th>
                                                            <th className="px-6 py-4 text-right">Requested</th>
                                                            <th className="px-6 py-4 text-right">Available</th>
                                                            <th className="px-6 py-4 text-right text-rose-500">Shortage</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-xs font-bold">
                                                        {shortagesList.bags.map((b, idx) => (
                                                            <tr key={idx}>
                                                                <td className="px-6 py-4 text-slate-800 dark:text-white font-extrabold">{b.name}</td>
                                                                <td className="px-6 py-4 text-right">{b.requested} {b.unit}</td>
                                                                <td className="px-6 py-4 text-right text-emerald-600">{b.available} {b.unit}</td>
                                                                <td className="px-6 py-4 text-right text-rose-600 font-black">-{b.shortage.toFixed(2)} {b.unit}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* Modal Footer */}
                                <div className="p-8 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-end gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                                    <button
                                        type="button"
                                        onClick={() => setShortageModalOpen(false)}
                                        className="px-8 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all border border-slate-300/50 dark:border-slate-700"
                                    >
                                        Cancel & Adjust
                                    </button>
                                    {/* <button
                                        type="button"
                                        onClick={() => handleSaveOrder(null, true)}
                                        className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl shadow-amber-500/30 active:scale-95 transition-all flex items-center gap-2 border border-amber-600"
                                    >
                                        <CheckCircle size={14} />
                                        Proceed & Save Anyway
                                    </button> */}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Single Product Raw Material Shortage Details Modal */}
                <AnimatePresence>
                    {productShortageModalOpen && productShortageProduct && (
                        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setProductShortageModalOpen(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-3xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            >
                                {/* Modal Header */}
                                <div className="p-8 border-b border-slate-200 dark:border-[#334155] bg-rose-500/10 flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400">
                                            <Layers className="w-8 h-8 animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white">
                                                {productShortageProduct.P_NAME} - Raw Material Stock
                                            </h3>
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                                                Recipe Stock Breakdown for Quantity:{' '}
                                                <span className="text-rose-500 font-black">{productShortageQty}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setProductShortageModalOpen(false)}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-[#0f172a]/20">
                                    {isProductShortageLoading ? (
                                        <div className="py-20 text-center text-slate-400 font-bold">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-rose-500" />
                                            Analyzing recipe stock requirements...
                                        </div>
                                    ) : productShortageData ? (
                                        <div className="space-y-6">
                                            {productShortageData.hasRecipe ? (
                                                <div className="border border-slate-200 dark:border-[#334155] rounded-3xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-[#334155]">
                                                            <tr>
                                                                <th className="px-6 py-4">Raw Material / Ingredient</th>
                                                                <th className="px-6 py-4 text-right">Required</th>
                                                                <th className="px-6 py-4 text-right">Available Stock</th>
                                                                <th className="px-6 py-4 text-right">Status</th>
                                                                <th className="px-6 py-4 text-right text-rose-500">Shortage</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-xs font-bold">
                                                            {productShortageData.breakdown.map((ing, idx) => (
                                                                <tr key={idx} className={ing.isShortage ? 'bg-rose-500/5' : ''}>
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-extrabold text-slate-800 dark:text-white">{ing.name}</div>
                                                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{ing.code}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">{Number(ing.required).toFixed(3)} {ing.unit || 'Units'}</td>
                                                                    <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">{Number(ing.available).toFixed(3)} {ing.unit || 'Units'}</td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${ing.isShortage ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                                            {ing.isShortage ? 'Shortage' : 'In Stock'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right text-rose-600 dark:text-rose-400 font-black">
                                                                        {ing.isShortage ? `-${(ing.required - ing.available).toFixed(3)} ${ing.unit || 'Units'}` : '0.000'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="py-16 bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-200 dark:border-[#334155] text-center">
                                                    <div className="text-slate-400 font-bold uppercase tracking-widest text-sm">No Manufacturing Recipe Found</div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">This product does not have an active recipe configured in the system.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center text-slate-400">
                                            No shortage data available.
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="p-8 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-end shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                                    <button
                                        type="button"
                                        onClick={() => setProductShortageModalOpen(false)}
                                        className="px-8 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all border border-slate-300/50 dark:border-slate-700"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Order Management</h1>
                    <p className="text-slate-600 dark:text-[#94a3b8]">Track production orders and automate inventory deduction.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingOrder(null);
                        setNewOrder({
                            OR_DATE: getSriLankaDate(),
                            OR_REFFERENCE: '',
                            items: []
                        });
                        setIsAddModalOpen(true);
                    }}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-xs"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create New Order</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Orders" value={orders.length} icon={<ShoppingCart className="text-blue-500" />} />
                <StatCard title="Pending" value={orders.filter(o => parseInt(o.OR_STATUS) !== 2).length} icon={<Clock className="text-amber-500" />} />
                <StatCard title="Processed" value={orders.filter(o => parseInt(o.OR_STATUS) === 2).length} icon={<CheckCircle className="text-emerald-500" />} />
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-200 dark:border-[#334155] shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-[#334155] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                            Pending Approval
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                            History
                        </button>
                    </div>
                    <div className="relative group max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by Order # or Reference..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-6 py-3 bg-slate-50 dark:bg-[#0f172a]/50 border-none rounded-xl outline-none text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-[#94a3b8] text-[10px] uppercase tracking-widest font-black border-b border-slate-200 dark:border-[#334155]">
                                <th className="px-6 py-4 text-center">Order #</th>
                                <th className="px-6 py-4">Date & Reference</th>
                                <th className="px-6 py-4">Financials (Sale)</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                            {isLoading ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" /> Loading Orders...</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">No orders found.</td></tr>
                            ) : filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(order => (
                                <tr key={order.OR_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#0f172a]/30 transition-colors group">
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black font-mono">
                                            {order.OR_NO}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-700 dark:text-white">{new Date(order.OR_DATE).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{order.OR_REFFERENCE}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-black text-slate-800 dark:text-white">LKR {formatPrice(order.OR_TOTAL_SALE)}</div>
                                        {isSystemAdmin && (
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Cost: {formatPrice(order.OR_TOTAL_COST)}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <Package className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{order.item_count} Items</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(order.OR_STATUS)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button onClick={() => handleViewDetails(order)} className="p-3 text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all shadow-sm"><Eye className="w-4 h-4" /></button>
                                            {/* {parseInt(order.OR_STATUS) === 2 && (
                                                <button onClick={() => fetchOrderBatches(order.OR_ID, true)} className="p-3 text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all shadow-sm" title="Re-print Barcodes"><Printer className="w-4 h-4" /></button>
                                            )} */}
                                            {parseInt(order.OR_STATUS) === 0 && (
                                                <>
                                                    <button onClick={() => handleEditClick(order)} className="p-3 text-amber-500 hover:bg-amber-500/10 rounded-2xl transition-all shadow-sm" title="Edit Order"><FileText className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteOrder(order.OR_ID)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all shadow-sm" title="Delete Order"><Trash2 className="w-4 h-4" /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredOrders.length > itemsPerPage && (
                    <div className="px-8 py-6 bg-slate-50/50 dark:bg-[#0f172a]/50 border-t border-slate-200 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {Math.min(filteredOrders.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredOrders.length, currentPage * itemsPerPage)} of {filteredOrders.length} records
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex items-center space-x-1">
                                {[...Array(Math.ceil(filteredOrders.length / itemsPerPage))].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                disabled={currentPage === Math.ceil(filteredOrders.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / itemsPerPage), prev + 1))}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>



            {/* View Details Modal */}
            <AnimatePresence>
                {viewingOrder && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingOrder(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[3rem] border border-slate-300 dark:border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" >
                            <div className="px-10 py-8 bg-slate-50/50 dark:bg-[#0f172a]/30 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
                                    <DetailField label="Order Date" value={new Date(viewingOrder.OR_DATE).toLocaleDateString()} icon={<Calendar className="w-3.5 h-3.5" />} />
                                    <DetailField label="Reference" value={viewingOrder.OR_REFFERENCE || 'N/A'} icon={<FileText className="w-3.5 h-3.5" />} />
                                    <DetailField label="Total Revenue" value={`LKR ${formatPrice(viewingOrder.OR_TOTAL_SALE)}`} icon={<DollarSign className="w-3.5 h-3.5 text-emerald-500" />} color="emerald" />
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Order Status</label>
                                        {getStatusBadge(viewingOrder.OR_STATUS)}
                                    </div>
                                </div>
                                <button onClick={() => setViewingOrder(null)} className="ml-8 w-14 h-14 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-500 rounded-2xl shadow-xl active:scale-90 transition-all border border-slate-200 dark:border-slate-700"><X className="w-8 h-8" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-transparent">
                                <div className="p-10 space-y-10">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] flex items-center">
                                            <ShoppingBag className="w-5 h-5 mr-3 text-blue-500" />
                                            Production Item List
                                        </h4>
                                        <span className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 uppercase tracking-widest">
                                            {orderDetails.length} Products Included
                                        </span>
                                    </div>

                                    <div className="space-y-8">
                                        {orderDetails.map((detail, idx) => (
                                            <div key={idx} className="group relative animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                                <div className="bg-white dark:bg-slate-800/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden transition-all hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/5">
                                                    {/* Item Header */}
                                                    <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex items-center space-x-5">
                                                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 font-black text-slate-400 text-sm shadow-sm">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <h5 className="font-black text-slate-800 dark:text-white text-lg tracking-tight leading-none mb-1.5">{detail.product_name}</h5>
                                                                <div className="flex items-center space-x-3">
                                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest font-mono">{detail.product_code}</span>
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{detail.OD_UNIT} Base</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 ${detail.BAG_ISSUED === 1 ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${detail.BAG_ISSUED === 1 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
                                                                <span>Bag: {detail.BAG_ISSUED === 1 ? 'Issued' : 'Pending'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Item Pricing Grid */}
                                                    <div className="p-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 bg-white dark:bg-transparent">
                                                        <DetailSubField label="Quantity" value={detail.OD_QTY} icon={<Layers className="w-3.5 h-3.5" />} />

                                                        {/* Revenue Totals */}
                                                        <DetailSubField label="Retail Total" value={`LKR ${formatPrice(detail.OD_TOTAL_SALE)}`} icon={<DollarSign className="w-3.5 h-3.5 text-blue-600" />} color="blue" />
                                                        <DetailSubField label="Wholesale Total" value={`LKR ${formatPrice(detail.OD_TOTAL_WHOLE_SALE || 0)}`} icon={<DollarSign className="w-3.5 h-3.5 text-indigo-600" />} color="blue" />

                                                        {/* Cost & Margin Analysis - Only show for Admins */}
                                                        {isSystemAdmin && (
                                                            <>
                                                                <DetailSubField
                                                                    label={parseInt(viewingOrder.OR_STATUS) === 0 ? "Est. Unit Cost" : "Unit Cost"}
                                                                    value={`LKR ${formatPrice(detail.OD_UNIT_COST_PRICE > 0 ? detail.OD_UNIT_COST_PRICE : (detail.estimated_unit_cost || 0))}`}
                                                                    icon={<Clock className={`w-3.5 h-3.5 ${parseInt(viewingOrder.OR_STATUS) === 0 ? 'text-amber-400' : 'text-amber-600'}`} />}
                                                                    color="amber"
                                                                />

                                                                <DetailSubField
                                                                    label="Total Production Cost"
                                                                    value={`LKR ${formatPrice((detail.OD_UNIT_COST_PRICE > 0 ? detail.OD_UNIT_COST_PRICE : (detail.estimated_unit_cost || 0)) * detail.OD_QTY)}`}
                                                                    icon={<Calculator className="w-3.5 h-3.5 text-amber-600" />}
                                                                    color="amber"
                                                                />

                                                                <div className="bg-emerald-50 dark:bg-emerald-500/5 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 self-center">
                                                                    <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center">Net Margin (Retail)</div>
                                                                    <div className="text-sm font-black text-emerald-700 text-center">
                                                                        {(() => {
                                                                            const cost = detail.OD_UNIT_COST_PRICE > 0 ? detail.OD_UNIT_COST_PRICE : (detail.estimated_unit_cost || 0);
                                                                            const sale = detail.OD_UNIT_SALE_PRICE;
                                                                            const margin = (sale * detail.OD_QTY) - (cost * detail.OD_QTY);
                                                                            const percent = cost > 0 ? ((sale - cost) / cost * 100) : 0;
                                                                            return `LKR ${formatPrice(margin)} (${percent.toFixed(1)}%)`;
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Manufacturing Meta */}
                                                    <div className="px-8 py-5 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-6 items-center justify-between">
                                                        <div className="flex items-center space-x-8">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Mfg Date</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 italic">{detail.OD_MFG_DATE ? new Date(detail.OD_MFG_DATE).toLocaleDateString() : 'Not Set'}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em] mb-1 text-rose-500/70">Exp Date</span>
                                                                <span className="text-xs font-bold text-rose-500 italic">{detail.OD_EXP_DATE ? new Date(detail.OD_EXP_DATE).toLocaleDateString() : 'Not Set'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Material Breakdown Trigger */}
                                                        <div className="flex-1 md:flex-none">
                                                            <MaterialBreakdown productId={detail.OD_PRODUCT_ID} qty={detail.OD_QTY} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-end gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                                <button onClick={() => setViewingOrder(null)} className="px-10 py-5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[10px] tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all border border-slate-300/50 dark:border-slate-700">Close Panel</button>
                                {isSystemAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => handleViewProductionSheet(viewingOrder.OR_ID)}
                                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-3xl font-black transition-all uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-500/30 active:scale-95"
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span>View Production Sheet</span>
                                    </button>
                                )}
                                {isSystemAdmin && parseInt(viewingOrder.OR_STATUS) === 0 && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const order = viewingOrder;
                                                setViewingOrder(null);
                                                handleEditClick(order);
                                            }}
                                            className="flex items-center space-x-3 bg-amber-500 hover:bg-amber-400 text-white py-5 px-10 rounded-3xl font-black transition-all uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-amber-500/30 active:scale-95"
                                        >
                                            <FileText className="w-5 h-5" />
                                            <span>Edit Content</span>
                                        </button>
                                        <button
                                            onClick={() => handleApproveOrder(viewingOrder.OR_ID)}
                                            disabled={isProcessing}
                                            className="flex items-center space-x-3 bg-blue-600 hover:bg-blue-500 text-white py-5 px-12 rounded-3xl font-black transition-all uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-blue-500/30 active:scale-95 disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                            <span>Authorize Production</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Barcode Print Modal */}
            <AnimatePresence>
                {showPrintModal && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-8 border-b border-slate-200 dark:border-[#334155] flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Print Production Labels</h3>
                                    <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                        <button
                                            onClick={() => setPrintFormat('50x50')}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${printFormat === '50x50' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            50mm x 50mm
                                        </button>
                                        <button
                                            onClick={() => setPrintFormat('34x25')}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${printFormat === '34x25' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            34mm x 25mm
                                        </button>
                                        <button
                                            onClick={() => setPrintFormat('30x15')}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${printFormat === '30x15' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            30mm x 15mm
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => setShowPrintModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 bg-slate-50 dark:bg-[#0f172a]/50">
                                {/* Step 1: Print Configuration Area - Only show for re-prints and when preview is NOT yet shown */}
                                {isRePrintMode && !showPreview && (
                                    <div className="space-y-8">
                                        <div className="bg-blue-500/5 p-8 rounded-[2.5rem] border border-blue-500/10">
                                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6 px-2">Step 1: Adjust Re-print Quantities</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {batchesToPrint.map((batch, idx) => (
                                                    <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xs">{idx + 1}</div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[150px]" title={batch.product_name}>{batch.product_name}</div>
                                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Ordered: {batch.original_quantity} Units</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <div className="flex items-center bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-all w-full">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase mr-2 whitespace-nowrap">Qty:</span>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    max={batch.original_quantity}
                                                                    min="0"
                                                                    onKeyDown={preventMinus}
                                                                    className="w-20 bg-transparent text-sm font-black text-blue-600 dark:text-blue-400 outline-none text-right"
                                                                    value={batch.print_quantity}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const max = batch.original_quantity;
                                                                        if (val >= 0 && val <= max) {
                                                                            const newBatches = [...batchesToPrint];
                                                                            newBatches[idx].print_quantity = val;
                                                                            setBatchesToPrint(newBatches);
                                                                        } else if (val > max) {
                                                                            showNotification(`Cannot exceed original quantity of ${max}`, 'warning');
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowPreview(true)}
                                            className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2rem] uppercase text-xs tracking-[0.3em] shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center space-x-3"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            <span>Confirm & Generate Preview</span>
                                        </button>
                                    </div>
                                )}
                                {/* Step 2: Production Preview */}
                                {showPreview && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Step 2: Production Preview</h4>
                                            {isRePrintMode && (
                                                <button
                                                    onClick={() => setShowPreview(false)}
                                                    className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                                                >
                                                    Back to Adjust
                                                </button>
                                            )}
                                        </div>

                                        <div className={`p-10 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-inner ${!isRePrintMode ? 'mt-0' : ''}`}>
                                            <ProductLabelPrintContainer ref={printRef} printFormat={printFormat} batchesToPrint={batchesToPrint} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 border-t border-slate-200 dark:border-[#334155] flex justify-end gap-4">
                                <button onClick={() => setShowPrintModal(false)} className="px-8 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs uppercase tracking-widest">Cancel</button>
                                <button
                                    onClick={() => executePrint()}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 flex items-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print Now
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Stock & Recipe & Bag Shortages Warning Modal */}
            <AnimatePresence>
                {shortageModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShortageModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-4xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-200 dark:border-[#334155] bg-amber-500/10 flex items-center space-x-4">
                                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400">
                                    <ShoppingBag className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Inventory Shortages Warning</h3>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Some elements do not have enough stock to fulfill this order. Please review the details below.</p>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 dark:bg-[#0f172a]/20">

                                {/* Finished Goods Shortages */}
                                {shortagesList.products.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                                            <Package size={16} className="stroke-[3]" />
                                            <h4 className="text-xs font-black uppercase tracking-wider">Finished Goods Stock Shortages</h4>
                                        </div>
                                        <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-[#334155]">
                                                    <tr>
                                                        <th className="px-6 py-4">Product Name</th>
                                                        <th className="px-6 py-4 text-right">Requested</th>
                                                        <th className="px-6 py-4 text-right">Available</th>
                                                        <th className="px-6 py-4 text-right text-rose-500">Shortage</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-xs font-bold">
                                                    {shortagesList.products.map((p, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-6 py-4">
                                                                <div className="font-extrabold text-slate-800 dark:text-white">{p.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.code}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">{p.requested} {p.unit}</td>
                                                            <td className="px-6 py-4 text-right text-emerald-600">{p.available} {p.unit}</td>
                                                            <td className="px-6 py-4 text-right text-rose-600 font-black">-{p.shortage.toFixed(2)} {p.unit}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Raw Material Recipe Shortages */}
                                {shortagesList.rawMaterials.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                                            <FileText size={16} className="stroke-[3]" />
                                            <h4 className="text-xs font-black uppercase tracking-wider">Raw Material Recipe Shortages</h4>
                                        </div>
                                        <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-[#334155]">
                                                    <tr>
                                                        <th className="px-6 py-4">Ingredient Raw Material</th>
                                                        <th className="px-6 py-4 text-right">Required</th>
                                                        <th className="px-6 py-4 text-right">Available</th>
                                                        <th className="px-6 py-4 text-right text-rose-500">Shortage</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-xs font-bold">
                                                    {shortagesList.rawMaterials.map((r, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-6 py-4">
                                                                <div className="font-extrabold text-slate-800 dark:text-white">{r.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.code}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">{r.requested.toFixed(3)} {r.unit}</td>
                                                            <td className="px-6 py-4 text-right text-emerald-600">{r.available.toFixed(3)} {r.unit}</td>
                                                            <td className="px-6 py-4 text-right text-rose-600 font-black">-{r.shortage.toFixed(3)} {r.unit}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Packaging Bags Shortages */}
                                {shortagesList.bags.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                                            <ShoppingCart size={16} className="stroke-[3]" />
                                            <h4 className="text-xs font-black uppercase tracking-wider">Packaging Bags Shortages</h4>
                                        </div>
                                        <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-[#334155]">
                                                    <tr>
                                                        <th className="px-6 py-4">Bag Raw Material Name</th>
                                                        <th className="px-6 py-4 text-right">Requested</th>
                                                        <th className="px-6 py-4 text-right">Available</th>
                                                        <th className="px-6 py-4 text-right text-rose-500">Shortage</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-xs font-bold">
                                                    {shortagesList.bags.map((b, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-6 py-4 text-slate-800 dark:text-white font-extrabold">{b.name}</td>
                                                            <td className="px-6 py-4 text-right">{b.requested} {b.unit}</td>
                                                            <td className="px-6 py-4 text-right text-emerald-600">{b.available} {b.unit}</td>
                                                            <td className="px-6 py-4 text-right text-rose-600 font-black">-{b.shortage.toFixed(2)} {b.unit}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-end gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                                <button
                                    onClick={() => setShortageModalOpen(false)}
                                    className="px-8 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all border border-slate-300/50 dark:border-slate-700"
                                >
                                    Cancel & Adjust
                                </button>
                                <button
                                    onClick={() => handleSaveOrder(null, true)}
                                    className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle size={14} />
                                    Proceed & Save Anyway
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Single Product Raw Material Shortage Details Modal */}
            <AnimatePresence>
                {productShortageModalOpen && productShortageProduct && (
                    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setProductShortageModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-3xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-200 dark:border-[#334155] bg-rose-500/10 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400">
                                        <Layers className="w-8 h-8 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white">
                                            {productShortageProduct.P_NAME} - Raw Material Stock
                                        </h3>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                                            Recipe Stock Breakdown for Quantity:{' '}
                                            <span className="text-rose-500 font-black">{productShortageQty}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setProductShortageModalOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-[#0f172a]/20">
                                {isProductShortageLoading ? (
                                    <div className="py-20 text-center text-slate-400 font-bold">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-rose-500" />
                                        Analyzing recipe stock requirements...
                                    </div>
                                ) : productShortageData ? (
                                    <div className="space-y-6">
                                        {productShortageData.hasRecipe ? (
                                            <div className="border border-slate-200 dark:border-[#334155] rounded-3xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-50 dark:bg-[#0f172a]/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-[#334155]">
                                                        <tr>
                                                            <th className="px-6 py-4">Raw Material / Ingredient</th>
                                                            <th className="px-6 py-4 text-right">Required</th>
                                                            <th className="px-6 py-4 text-right">Available Stock</th>
                                                            <th className="px-6 py-4 text-right">Status</th>
                                                            <th className="px-6 py-4 text-right text-rose-500">Shortage</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-xs font-bold">
                                                        {productShortageData.breakdown.map((ing, idx) => (
                                                            <tr key={idx} className={ing.isShortage ? 'bg-rose-500/5' : ''}>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-extrabold text-slate-800 dark:text-white">{ing.name}</div>
                                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{ing.code}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">{Number(ing.required).toFixed(3)} {ing.unit || 'Units'}</td>
                                                                <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">{Number(ing.available).toFixed(3)} {ing.unit || 'Units'}</td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${ing.isShortage ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                                        {ing.isShortage ? 'Shortage' : 'In Stock'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right text-rose-600 dark:text-rose-400 font-black">
                                                                    {ing.isShortage ? `-${(ing.required - ing.available).toFixed(3)} ${ing.unit || 'Units'}` : '0.000'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="py-16 bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-200 dark:border-[#334155] text-center">
                                                <div className="text-slate-400 font-bold uppercase tracking-widest text-sm">No Manufacturing Recipe Found</div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">This product does not have an active recipe configured in the system.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-slate-400">
                                        No shortage data available.
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-end shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                                <button
                                    type="button"
                                    onClick={() => setProductShortageModalOpen(false)}
                                    className="px-8 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all border border-slate-300/50 dark:border-slate-700"
                                >
                                    Close Details
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Production Batch Sheet PDF Preview Modal */}
            <AnimatePresence>
                {productionSheetOpen && (
                    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setProductionSheetOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-5xl bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-200 dark:border-[#334155] bg-indigo-500/10 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                        <Layers className="w-8 h-8 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white">
                                            Production Batch Sheet (PDF Preview)
                                        </h3>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                                            FIFO Raw Material & Bag Batch Allocations for Order
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {productionSheetData && (
                                        <button
                                            type="button"
                                            onClick={handlePrintProductionSheet}
                                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Print / Save PDF
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setProductionSheetOpen(false)}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-all cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-[#0f172a]/40">
                                {isProductionSheetLoading ? (
                                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Aggregating FIFO stock batches...</p>
                                    </div>
                                ) : productionSheetData ? (
                                    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                                        {/* Document Printable View */}
                                        <div
                                            ref={productionSheetPrintRef}
                                            className="production-print-sheet bg-white text-slate-800 p-12 rounded-[2rem] border border-slate-100 shadow-xl print:p-0 print:m-0 print:border-none print:shadow-none print:text-black print:bg-white"
                                        >
                                            {/* CSS styles to guarantee flawless PDF print output */}
                                            <style dangerouslySetInnerHTML={{
                                                __html: `
                                                @media print {
                                                    @page {
                                                        margin: 15mm !important;
                                                    }
                                                    html, body {
                                                        margin: 0 !important;
                                                        padding: 0 !important;
                                                        width: 100% !important;
                                                        background-color: white !important;
                                                        color: black !important;
                                                    }
                                                    .production-print-sheet {
                                                        width: 100% !important;
                                                        margin: 0 !important;
                                                        padding: 0 !important;
                                                        box-shadow: none !important;
                                                        border: none !important;
                                                    }
                                                    table {
                                                        page-break-inside: avoid;
                                                    }
                                                    tr {
                                                        page-break-inside: avoid;
                                                        page-break-after: auto;
                                                    }
                                                    thead {
                                                        display: table-header-group;
                                                    }
                                                    .no-print {
                                                        display: none !important;
                                                    }
                                                }
                                            `}} />

                                            {/* Print Branding Header */}
                                            <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-start">
                                                <div>
                                                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Indika Bakery (Pvt) Ltd.</h1>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Bakery Production & Inventory ERP</p>
                                                </div>
                                                <div className="text-right">
                                                    <h2 className="text-xl font-black text-indigo-600 uppercase tracking-wider">Production Batch Sheet</h2>
                                                    <p className="text-xs font-bold text-slate-400 mt-1">Confidential Internal Document</p>
                                                </div>
                                            </div>

                                            {/* Meta Details Grid */}
                                            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200/60 mb-8 text-xs">
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="font-black text-slate-400 uppercase tracking-wider block">Order ID / Ref</span>
                                                        <span className="font-bold text-slate-800 text-sm">#ORD-{productionSheetData.order.OR_ID} ({productionSheetData.order.OR_REFFERENCE || 'N/A'})</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-slate-400 uppercase tracking-wider block">Order Date</span>
                                                        <span className="font-bold text-slate-800">{new Date(productionSheetData.order.OR_DATE).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <div>
                                                        <span className="font-black text-slate-400 uppercase tracking-wider block">Generated By</span>
                                                        <span className="font-bold text-slate-800">{currentUser?.username || 'Admin'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-slate-400 uppercase tracking-wider block">Sheet Generated On</span>
                                                        <span className="font-bold text-slate-800">{new Date().toLocaleString()}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-slate-400 uppercase tracking-wider block">Status</span>
                                                        <span className="font-black text-indigo-600 uppercase">{productionSheetData.order.OR_STATUS === 0 ? 'Pending Authorize' : 'Authorized & Deducted'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Product Items Loop */}
                                            <div className="space-y-8">
                                                {productionSheetData.items.map((item, index) => {
                                                    let itemIngredientsCost = 0;
                                                    let itemBagsCost = 0;

                                                    return (
                                                        <div key={index} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all">
                                                            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                                                                <div>
                                                                    <h3 className="text-base font-black text-slate-900">{item.productName}</h3>
                                                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider font-mono">{item.productCode}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ordered Qty</span>
                                                                    <span className="font-black text-slate-800">{item.qty} {item.unit}</span>
                                                                </div>
                                                            </div>

                                                            {/* Ingredients Table */}
                                                            {item.hasRecipe && item.recipeCostPreview ? (
                                                                <div className="space-y-4">
                                                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Recipe Batch Allocations (FIFO)</h4>
                                                                    <table className="w-full text-xs text-left border-collapse">
                                                                        <thead>
                                                                            <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] tracking-wider">
                                                                                <th className="p-3 rounded-l-lg">Raw Material</th>
                                                                                <th className="p-3 text-right">Required</th>
                                                                                <th className="p-3">Batch Consumptions (FIFO)</th>
                                                                                <th className="p-3 text-right rounded-r-lg">Sub Cost</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {item.recipeCostPreview.breakdown.map((ing, ingIdx) => {
                                                                                const ingTotalCost = ing.batches.reduce((sum, b) => sum + (parseFloat(b.batchCost) || 0), 0);
                                                                                itemIngredientsCost += ingTotalCost;

                                                                                return (
                                                                                    <tr key={ingIdx} className="border-b border-slate-100 last:border-none hover:bg-slate-50/50">
                                                                                        <td className="p-3 font-bold text-slate-800">
                                                                                            {ing.name}
                                                                                            <span className="text-[9px] font-bold text-slate-400 block font-mono">{ing.code}</span>
                                                                                        </td>
                                                                                        <td className="p-3 text-right font-semibold text-slate-700">{Number(ing.required).toFixed(3)}</td>
                                                                                        <td className="p-3">
                                                                                            <div className="flex flex-col gap-1.5 py-1">
                                                                                                {ing.batches && ing.batches.length > 0 ? (
                                                                                                    ing.batches.map((b, bIdx) => (
                                                                                                        <span key={bIdx} className="inline-flex items-center text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 gap-1.5">
                                                                                                            <strong className="text-indigo-600">Seq #{b.batchNo}</strong>: Taken {Number(b.qtyTaken).toFixed(3)} @ LKR {Number(b.unitPrice).toFixed(2)}
                                                                                                        </span>
                                                                                                    ))
                                                                                                ) : (
                                                                                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded">⚠️ Shortage - No Batches Available</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="p-3 text-right font-black text-slate-800">LKR {formatPrice(ingTotalCost)}</td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <div className="p-4 bg-amber-50 rounded-2xl text-center border border-amber-100">
                                                                    <p className="text-xs font-bold text-amber-700">⚠️ No manufacturing recipe configured for this product. Batch allocation cannot be calculated.</p>
                                                                </div>
                                                            )}

                                                            {/* Packaging Bags Table */}
                                                            {item.bagAllocation && (
                                                                <div className="space-y-4 mt-6 pt-6 border-t border-dashed border-slate-200">
                                                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Packaging Bag Allocations</h4>
                                                                    <table className="w-full text-xs text-left border-collapse">
                                                                        <thead>
                                                                            <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] tracking-wider">
                                                                                <th className="p-3 rounded-l-lg">Bag Material</th>
                                                                                <th className="p-3 text-right">Required</th>
                                                                                <th className="p-3">Batch Consumptions (FIFO)</th>
                                                                                <th className="p-3 text-right rounded-r-lg">Sub Cost</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {(() => {
                                                                                const bag = item.bagAllocation;
                                                                                const bagTotalCost = bag.batches.reduce((sum, b) => sum + (parseFloat(b.batchCost) || 0), 0);
                                                                                itemBagsCost += bagTotalCost;

                                                                                return (
                                                                                    <tr className="hover:bg-slate-50/50">
                                                                                        <td className="p-3 font-bold text-slate-800">
                                                                                            {bag.name}
                                                                                            <span className="text-[9px] font-bold text-slate-400 block font-mono">{bag.code}</span>
                                                                                        </td>
                                                                                        <td className="p-3 text-right font-semibold text-slate-700">{Number(bag.required).toFixed(0)} Pcs</td>
                                                                                        <td className="p-3">
                                                                                            <div className="flex flex-col gap-1.5 py-1">
                                                                                                {bag.batches && bag.batches.length > 0 ? (
                                                                                                    bag.batches.map((b, bIdx) => (
                                                                                                        <span key={bIdx} className="inline-flex items-center text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 gap-1.5">
                                                                                                            <strong className="text-indigo-600">Seq #{b.batchNo}</strong>: Taken {Number(b.qtyTaken).toFixed(0)} Pcs @ LKR {Number(b.unitPrice).toFixed(2)}
                                                                                                        </span>
                                                                                                    ))
                                                                                                ) : (
                                                                                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded">⚠️ Bag Shortage - No Batches Available</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="p-3 text-right font-black text-slate-800">LKR {formatPrice(bagTotalCost)}</td>
                                                                                    </tr>
                                                                                );
                                                                            })()}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}

                                                            {/* Item Cost subtotal */}
                                                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                                                <p className="text-xs font-bold text-slate-500">
                                                                    Estimated Production Cost: <span className="font-black text-slate-900 text-sm">LKR {formatPrice(itemIngredientsCost + itemBagsCost)}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Order Summarized Footer */}
                                            <div className="mt-10 pt-8 border-t-2 border-slate-800 grid grid-cols-2 gap-8">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Signatures / Approvals</h4>
                                                    <div className="space-y-6 pt-4 text-xs font-bold text-slate-700">
                                                        <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
                                                            <span>Prepared By:</span>
                                                            <span className="font-mono text-slate-400">________________________</span>
                                                        </div>
                                                        <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
                                                            <span>Authorized Administrator:</span>
                                                            <span className="font-mono text-slate-400">________________________</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
                                                    <div className="space-y-2 text-xs">
                                                        <div className="flex justify-between font-bold text-slate-500">
                                                            <span>Total Ingredients Cost:</span>
                                                            <span>LKR {formatPrice(productionSheetData.items.reduce((sum, item) => {
                                                                const recipeCost = item.recipeCostPreview?.totalCost || 0;
                                                                return sum + recipeCost;
                                                            }, 0))}</span>
                                                        </div>
                                                        <div className="flex justify-between font-bold text-slate-500">
                                                            <span>Total Packaging Bags Cost:</span>
                                                            <span>LKR {formatPrice(productionSheetData.items.reduce((sum, item) => {
                                                                if (!item.bagAllocation) return sum;
                                                                return sum + item.bagAllocation.batches.reduce((bSum, b) => bSum + parseFloat(b.batchCost), 0);
                                                            }, 0))}</span>
                                                        </div>
                                                    </div>
                                                    <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-center">
                                                        <span className="text-xs font-black text-slate-900 uppercase">Grand Production Cost:</span>
                                                        <span className="text-lg font-black text-indigo-600">
                                                            LKR {formatPrice(
                                                                productionSheetData.items.reduce((sum, item) => {
                                                                    const recipeCost = item.recipeCostPreview?.totalCost || 0;
                                                                    const bagCost = item.bagAllocation ? item.bagAllocation.batches.reduce((bSum, b) => bSum + parseFloat(b.batchCost), 0) : 0;
                                                                    return sum + recipeCost + bagCost;
                                                                }, 0)
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Confidential Notice */}
                                            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest mt-12 pt-4 border-t border-slate-100">
                                                CONFIDENTIAL INTERNAL DOCUMENT. UNAUTHORIZED SHARING IS STRICTLY PROHIBITED.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-slate-400">
                                        No production batch sheet details available.
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 border-t border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#0f172a]/50 flex justify-end shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                                <button
                                    type="button"
                                    onClick={() => setProductionSheetOpen(false)}
                                    className="px-8 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all border border-slate-300/50 dark:border-slate-700 cursor-pointer"
                                >
                                    Close Sheet
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StatCard = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-sm flex items-center justify-between">
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
            <p className="text-3xl font-black text-slate-800 dark:text-white">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center border border-slate-100 dark:border-slate-800">
            {icon}
        </div>
    </div>
);

const DetailField = ({ label, value, icon, color = 'blue' }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
            <span className={`mr-1.5 ${color === 'emerald' ? 'text-emerald-500' : 'text-blue-500'}`}>{icon}</span>
            {label}
        </label>
        <div className={`text-sm font-black tracking-tight ${color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
            {value}
        </div>
    </div>
);

const DetailSubField = ({ label, value, icon, color = 'slate' }) => (
    <div className="space-y-1.5">
        <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color === 'blue' ? 'bg-blue-50 text-blue-500' :
                color === 'amber' ? 'bg-amber-50 text-amber-500' :
                    'bg-slate-50 text-slate-400'
                } dark:bg-slate-800`}>
                {icon}
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <div className={`text-sm font-black ${color === 'blue' ? 'text-blue-600' :
            color === 'amber' ? 'text-amber-600' :
                'text-slate-700 dark:text-slate-200'
            } tracking-tight`}>
            {value}
        </div>
    </div>
);

// Helper Component for Material Breakdown in View Modal
const MaterialBreakdown = ({ productId, qty }) => {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchPreview = async () => {
        if (!isOpen) {
            setLoading(true);
            try {
                const res = await api.get(`/orders/preview-cost?productId=${productId}&qty=${qty}`);
                setPreview(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="mt-6 border-t-2 border-dashed border-slate-100 dark:border-slate-800 pt-6">
            <button
                onClick={fetchPreview}
                className="w-full py-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-xs font-black uppercase tracking-[0.25em] text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 flex items-center justify-center space-x-3 transition-all"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                <span>{isOpen ? 'Hide Batch Audit Log' : 'Review Ingredient & Batch Allocation'}</span>
            </button>

            {isOpen && preview && (
                <div className="mt-6 grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    {preview.hasRecipe ? preview.breakdown.map((ing, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                                <div>
                                    <div className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{ing.name}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Requirement: <span className="text-indigo-500">{Number(ing.required).toFixed(3)} Units</span></div>
                                </div>
                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border ${ing.isShortage ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-emerald-50 border-emerald-200 text-emerald-500'}`}>
                                    {ing.isShortage ? 'Stock Shortage' : 'Stock Verified'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ing.batches.map((b, bi) => (
                                    <div key={bi} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200 dark:border-slate-700">#{b.batchNo}</div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Batch Log</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-black text-indigo-600">-{Number(b.qtyTaken).toFixed(3)}</div>
                                            <div className="text-[9px] font-bold text-slate-400">@ LKR {Number(b.unitPrice).toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="py-12 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No Manufacturing Recipe Available</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};



export default OrderManagement;
