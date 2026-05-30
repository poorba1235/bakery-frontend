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

            // 2. Select receipt config (Standard 80mm continuous roll configurations)
            const config = qz.configs.create(activePrinterName, {
                raster: false, // Use high-speed raw ESC/POS text command codes
                encoding: 'UTF-8',
                margins: 0
            });

            // ESC/POS Command sequences
            const ESC = '\x1b';
            const GS = '\x1d';
            
            const commands = {
                INIT: ESC + '@',
                ALIGN_CENTER: ESC + 'a\x01',
                ALIGN_LEFT: ESC + 'a\x00',
                ALIGN_RIGHT: ESC + 'a\x02',
                BOLD_ON: ESC + 'E\x01',
                BOLD_OFF: ESC + 'E\x00',
                SIZE_NORMAL: GS + '!\x00',
                SIZE_DOUBLE: GS + '!\x11',
                CUT: GS + 'V\x00'
            };

            // 3. Compile receipt formatting lines
            const data = [];
            data.push(commands.INIT);
            
            // Header
            data.push(commands.ALIGN_CENTER);
            data.push(commands.BOLD_ON);
            data.push(commands.SIZE_DOUBLE);
            data.push('INDIKA BAKERS\n');
            data.push(commands.SIZE_NORMAL);
            data.push(commands.BOLD_OFF);
            data.push('Retail Outlet & Factory Store\n');
            data.push('Tel: +94 11 234 5678\n');
            data.push('--------------------------------\n');

            // Metadata
            data.push(commands.ALIGN_LEFT);
            data.push(`Invoice No : ${sale.invoiceNo}\n`);
            data.push(`Date & Time: ${new Date(sale.date).toLocaleString()}\n`);
            data.push(`Cashier    : ${sale.cashier}\n`);
            data.push(`Customer   : ${sale.customerName}\n`);
            data.push('--------------------------------\n');

            // Grid header
            data.push(commands.BOLD_ON);
            data.push('ITEM            QTY     TOTAL\n');
            data.push(commands.BOLD_OFF);

            // Loop items
            const items = sale.items || [];
            items.forEach(item => {
                const name = (item.P_NAME || item.product_name || 'Bakery Item').substring(0, 15).padEnd(15, ' ');
                const qty = item.qty.toString().padStart(3, ' ');
                const total = `Rs.${(item.qty * item.unitPrice).toFixed(0)}`.padStart(12, ' ');
                data.push(`${name} ${qty} ${total}\n`);
            });
            data.push('--------------------------------\n');

            // Totals
            data.push(commands.ALIGN_RIGHT);
            data.push(`SUBTOTAL: Rs.${sale.subtotal.toFixed(2)}\n`);
            if (sale.discount > 0) {
                data.push(`DISCOUNT: -Rs.${sale.discount.toFixed(2)}\n`);
            }
            data.push(commands.BOLD_ON);
            data.push(`NET TOTAL: Rs.${sale.netAmount.toFixed(2)}\n`);
            data.push(commands.BOLD_OFF);
            data.push(`PAID CASH: Rs.${sale.amountTendered.toFixed(2)}\n`);
            data.push(`CHANGE   : Rs.${sale.amountChange.toFixed(2)}\n`);
            data.push('--------------------------------\n');

            // Footer
            data.push(commands.ALIGN_CENTER);
            data.push(commands.BOLD_ON);
            data.push('THANK YOU FOR SHOPPING!\n');
            data.push(commands.BOLD_OFF);
            data.push('Indika Bakers - Sweetening Your Day!\n');

            // Feed & Cut commands
            data.push('\n\n\n\n');
            data.push(commands.CUT);

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
