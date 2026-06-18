import qz from 'qz-tray';

class QZPrintService {
    constructor() {
        this.isConnected = false;
        this.printerName = 'ReceiptPrinter'; // Default shared name in Windows
    }


    async connect() {
        if (this.isConnected && qz.websocket.isActive()) {
            return true;
        }
        try {
            // Connect to local secure websocket loopback
            await qz.websocket.connect();
            this.isConnected = true;
            console.log('[QZ Tray] Secure loopback connection established successfully.');
            return true;
        } catch (err) {
            console.error('[QZ Tray] Connection failed. Is QZ Tray running in the system tray?', err);
            this.isConnected = false;
            throw new Error('QZ Tray is not running. Please launch QZ Tray on this PC.');
        }
    }


    async getAvailablePrinters() {
        await this.connect();
        return await qz.printers.find();
    }


    async printReceipt(sale, customPrinterName = null) {
        try {
            // 1. Ensure connected to local service
            await this.connect();

            // Select active printer name: priority 1 is custom UI selection, priority 2 is local keyword match
            let activePrinterName = customPrinterName || localStorage.getItem('qz_selected_printer');

            if (!activePrinterName) {
                activePrinterName = this.printerName; // Fallback to 'ReceiptPrinter'
                try {
                    const printerList = await qz.printers.find();
                    console.log('[QZ Tray] Available printers on this system:', printerList);
                    const matchedPrinter = printerList.find(p => {
                        const name = p.toLowerCase();
                        return name.includes('receipt') ||
                            name.includes('thermal') ||
                            name.includes('tsp') ||
                            name.includes('pos') ||
                            name.includes('xprinter') ||
                            name.includes('xp-');
                    });
                    if (matchedPrinter) {
                        activePrinterName = matchedPrinter;
                        console.log('[QZ Tray] Smart matched printer to use:', activePrinterName);
                    } else {
                        console.log('[QZ Tray] No keyword match. Using default shared name:', activePrinterName);
                    }
                } catch (findErr) {
                    console.warn('[QZ Tray] Dynamic printer search failed:', findErr);
                }
            }

            const config = qz.configs.create(activePrinterName, {
                margins: { top: 0, right: 0, bottom: 0, left: 0 },
                colorType: 'grayscale',
                density: 203 // Standard thermal printer DPI
            });

            // Generate HTML string for the receipt
            let htmlContent = `
                <html>
                <head>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700&display=swap');
                        body { 
                            font-family: 'Noto Sans Sinhala', sans-serif, Arial; 
                            margin: 0; 
                            padding: 10px 5px; 
                            width: 58mm; /* 2 inch roll */
                            font-size: 11px;
                            color: black;
                            background: white;
                        }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                        .text-lg { font-size: 16px; }
                        .text-sm { font-size: 9px; }
                        .flex-between { display: flex; justify-content: space-between; margin-bottom: 2px; }
                        .divider { border-bottom: 1px dashed black; margin: 5px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 5px 0; }
                        th, td { text-align: left; vertical-align: top; padding: 2px 0; }
                        th:nth-child(2), td:nth-child(2) { text-align: center; }
                        th:last-child, td:last-child { text-align: right; }
                        .item-name { max-width: 35mm; overflow: hidden; }
                    </style>
                </head>
                <body>
                    <div class="text-center font-bold text-lg">INDIKA BAKERS</div>
                    <div class="text-center text-sm">Mehiellagama, Hiripitiya,</div>
                    <div class="text-center text-sm">Nikadalupotha</div>
                    <div class="text-center text-sm">Tel: 071660 0165</div>
                    
                    <div class="divider"></div>
                    
                    <div class="text-sm">
                        <div class="flex-between"><span>Invoice:</span><span class="font-bold">${sale.invoiceNo}</span></div>
                        <div class="flex-between"><span>Date:</span><span>${new Date(sale.date).toLocaleString()}</span></div>
                        <div class="flex-between"><span>Cashier:</span><span>${sale.cashier.toUpperCase()}</span></div>
                        <div class="flex-between"><span>Customer:</span><span>${sale.customerName}</span></div>
                        <div class="flex-between"><span>Payment:</span><span class="font-bold">${(sale.paymentMethod || 'CASH').toUpperCase()}</span></div>
                    </div>

                    <div class="divider"></div>

                    <table>
                        <thead>
                            <tr class="font-bold">
                                <th>ITEM</th>
                                <th>QTY</th>
                                <th>TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            const items = sale.items || [];
            items.forEach(item => {
                const name = item.P_NAME_SINAHAL || item.P_NAME || item.product_name || 'Bakery Item';
                htmlContent += `
                    <tr>
                        <td class="item-name">${name}</td>
                        <td>${item.qty}</td>
                        <td>Rs.${(item.qty * item.unitPrice).toFixed(0)}</td>
                    </tr>
                `;
            });

            htmlContent += `
                        </tbody>
                    </table>

                    <div class="divider"></div>

                    <div class="flex-between"><span>SUBTOTAL:</span><span>Rs. ${sale.subtotal.toFixed(2)}</span></div>
                    ${sale.discount > 0 ? `<div class="flex-between"><span>DISCOUNT:</span><span>-Rs. ${sale.discount.toFixed(2)}</span></div>` : ''}
                    <div class="flex-between font-bold"><span>NET TOTAL:</span><span>Rs. ${sale.netAmount.toFixed(2)}</span></div>
                    <div class="flex-between"><span>PAID ${(sale.paymentMethod || 'CASH').toUpperCase()}:</span><span>Rs. ${sale.amountTendered.toFixed(2)}</span></div>
                    <div class="flex-between font-bold"><span>CHANGE:</span><span>Rs. ${sale.amountChange.toFixed(2)}</span></div>

                    <div class="divider"></div>

                    <div class="text-center font-bold text-sm">THANK YOU FOR SHOPPING!</div>
                    <div class="text-center text-sm" style="margin-bottom: 20px;">Indika Bakers - Sweetening Your Day!</div>
                </body>
                </html>
            `;

            const data = [
                {
                    type: 'pixel',
                    format: 'html',
                    flavor: 'plain',
                    data: htmlContent
                }
            ];

            // 4. Send binary spool block silently to local printer via QZ Tray loopback
            await qz.print(config, data);
            console.log('[QZ Tray] Printed successfully.');
            return true;
        } catch (err) {
            console.error('[QZ Tray] Spooling print job failed:', err);
            throw err;
        }
    }
}

export default new QZPrintService();
