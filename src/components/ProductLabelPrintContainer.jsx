import { QRCodeSVG } from 'qrcode.react';
import { forwardRef, useState } from 'react';

// Exclusively 31mm x 15mm Label Component matching C# .NET print coordinates exactly
const BarcodeItem = ({
    value,
    name,
    sinhalaName,
    batchNo,
    price
}) => {
    return (
        <div
            className="label-sticker-inner"
            style={{
                position: 'relative',
                width: '31mm',
                height: '15mm',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                fontFamily: 'Arial, sans-serif',
                overflow: 'hidden',
                color: 'black',
                lineHeight: '1.0'
            }}
        >
            {/* QR Code Container (left: 0mm, top: 0.508mm, size: 8.89mm) */}
            <div style={{
                position: 'absolute',
                left: '0mm',
                top: '0.508mm', // startY = 2 hundredths of an inch (0.508mm)
                width: '8.89mm', // 35 hundredths of an inch (8.89mm)
                height: '8.89mm',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <QRCodeSVG
                    value={value || ''}
                    size={128} // Crisp SVG internal resolution
                    style={{
                        width: '8.89mm',
                        height: '8.89mm',
                        display: 'block'
                    }}
                    level="L" // Matches ZXing default low correction for micro QR
                    marginSize={0}
                />
            </div>

            {/* Text lines placed at absolute positions to match .NET DrawString */}

            {/* Line 1: Name */}
            <div
                className="label-text-line label-text-name"
                style={{
                    position: 'absolute',
                    left: '9.652mm', // x + 38 hundredths of an inch (9.652mm)
                    top: '1.016mm',  // y + 2 hundredths of an inch (0.508 + 0.508 = 1.016mm)
                    width: '21.348mm', // 31mm - 9.652mm
                    fontWeight: 'bold',
                    fontSize: '6pt', // Arial 6 Bold
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'left'
                }}
            >
                {name || ''}
            </div>

            {/* Line 2: Sinhala Name */}
            <div
                className="label-text-line label-text-sinhala"
                style={{
                    position: 'absolute',
                    left: '9.652mm',
                    top: '3.048mm',  // y + 10 hundredths of an inch (0.508 + 2.540 = 3.048mm)
                    width: '21.348mm',
                    fontWeight: 'bold',
                    fontSize: '6pt',
                    fontFamily: '"Noto Sans Sinhala", Arial, sans-serif',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'left'
                }}
            >
                {sinhalaName || ''}
            </div>

            {/* Line 3: Batch */}
            <div
                className="label-text-line label-text-batch"
                style={{
                    position: 'absolute',
                    left: '9.652mm',
                    top: '5.080mm',  // y + 18 hundredths of an inch (0.508 + 4.572 = 5.080mm)
                    width: '21.348mm',
                    fontWeight: 'bold',
                    fontSize: '6pt',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'left'
                }}
            >
                Batch: {batchNo || ''}
            </div>

            {/* Line 4: Price */}
            <div
                className="label-text-line label-text-price"
                style={{
                    position: 'absolute',
                    left: '9.652mm',
                    top: '7.112mm',  // y + 26 hundredths of an inch (0.508 + 6.604 = 7.112mm)
                    width: '21.348mm',
                    fontWeight: 'bold',
                    fontSize: '6pt',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'left'
                }}
            >
                Price: {price || ''}
            </div>

            {/* Line 5: Value */}
            <div
                className="label-text-line label-text-value"
                style={{
                    position: 'absolute',
                    left: '9.652mm',
                    top: '9.144mm',  // y + 34 hundredths of an inch (0.508 + 8.636 = 9.144mm)
                    width: '21.348mm',
                    fontWeight: 'bold',
                    fontSize: '6pt',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'left'
                }}
            >
                {value || ''}
            </div>
        </div>
    );
};

// Main Component — prints 3 labels per row (matching 3-column sticker layout)
const ProductLabelPrintContainer = forwardRef(({ batchesToPrint, addressInfo }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');

    const getLabelsList = () => {
        if (batchesToPrint && batchesToPrint.length > 0) {
            return batchesToPrint.flatMap((batch) => {
                const labelsCount = Math.min(Math.ceil(parseFloat(batch.print_quantity || 1)), 100);
                if (labelsCount <= 0) return [];
                return Array.from({ length: labelsCount }).map((_, idx) => ({
                    id: `${batch.PB_BATCH_NO}-${idx}`,
                    value: batch.actual_barcode || batch.PB_BARCODE_NO || '1343',
                    name: batch.product_name,
                    sinhalaName: batch.product_name_sinhala,
                    batchNo: batch.PB_BATCH_NO,
                    mfgDate: batch.mfg_date,
                    expDate: batch.exp_date,
                    price: batch.retail_price
                }));
            });
        }

        // High fidelity test cases for premium screen preview
        return [
            { id: 'test-1', value: '8901234567890', name: 'SANDWICH BREAD (L)', sinhalaName: 'සැන්ඩ්විච් පාන් (ලොකු)', batchNo: 'B2605-01', mfgDate: '2026-05-20', expDate: '2026-05-31', price: '220.00' },
            { id: 'test-2', value: '8901234567891', name: 'BUTTER BUN', sinhalaName: 'බටර් බන්', batchNo: 'B2605-01', mfgDate: '2026-05-20', expDate: '2026-05-31', price: '90.00' },
            { id: 'test-3', value: '8901234567892', name: 'KITHUL SWEEET ROLL', sinhalaName: 'කිතුල් රෝල්', batchNo: 'B2605-01', mfgDate: '2026-05-20', expDate: '2026-05-31', price: '150.00' },
            { id: 'test-4', value: '8901234567893', name: 'SPICY FISH BUN', sinhalaName: 'මාළු බන්', batchNo: 'B2605-02', mfgDate: '2026-05-21', expDate: '2026-06-01', price: '180.00' }
        ];
    };

    const allLabels = getLabelsList();

    // Group labels into rows of exactly 3 labels
    const labelRows = [];
    for (let i = 0; i < allLabels.length; i += 3) {
        labelRows.push(allLabels.slice(i, i + 3));
    }

    const handlePrint = async () => {
        setIsLoading(true);
        setStatus('Preparing print...');
        try {
            await new Promise(resolve => setTimeout(resolve, 150));
            window.print();
            setStatus('✅ Print dialog opened successfully!');
        } catch (error) {
            setStatus('❌ Failed: ' + error.message);
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatus(''), 4000);
        }
    };

    return (
        <div>
            {/* Premium Control Panel (Hidden during Print) */}
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800/40 no-print shadow-sm transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-md font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                            <span>🖨️</span> 3-Column QR Label Printer (99mm × 15mm)
                        </h4>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Translated from C# .NET print system. Columns strictly mapped to 3mm, 34mm, 65mm.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full">
                            Total Labels: {allLabels.length} ({labelRows.length} Rows)
                        </span>
                        <button
                            onClick={handlePrint}
                            disabled={isLoading}
                            className="py-2 px-5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? 'Preparing...' : 'Print Labels'}
                        </button>
                    </div>
                </div>
                {status && (
                    <p className={`text-xs mt-2 font-medium ${status.includes('❌') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                        {status}
                    </p>
                )}
            </div>

            {/* Interactive Premium Backing Paper Roll Area */}
            <div className="preview-workspace no-print">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-3 font-semibold uppercase tracking-wider">
                    Sticker Roll Preview (Yellow Thermal Backing)
                </div>

                <div className="print-container" ref={ref}>
                    {/* Exact Print Stylesheets & Screen Previews */}
                    <style>{`
                        @media print {
                            * {
                                box-sizing: border-box !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }

                            @page {
                                margin: 0 !important;
                                size: 99mm 15mm !important;
                            }

                            html, body {
                                margin: 0 !important;
                                padding: 0 !important;
                                background: white !important;
                                width: 99mm !important;
                                height: auto !important;
                            }

                            .print-container {
                                display: block !important;
                                width: 99mm !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                background: white !important;
                            }

                            .print-row {
                                position: relative !important;
                                display: block !important;
                                width: 99mm !important;
                                height: 15mm !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                                background: white !important;
                                overflow: hidden !important;
                            }

                            .label-item {
                                position: absolute !important;
                                width: 31mm !important;
                                height: 15mm !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                box-sizing: border-box !important;
                            }

                            .label-item-col-1 {
                                left: 3mm !important;
                            }

                            .label-item-col-2 {
                                left: 34mm !important;
                            }

                            .label-item-col-3 {
                                left: 65mm !important;
                            }

                            .label-item.empty-label {
                                display: none !important;
                            }

                            .label-sticker-inner {
                                border: none !important;
                                box-shadow: none !important;
                            }

                            .no-print {
                                display: none !important;
                            }
                        }

                        /* Premium Screen Preview Styling */
                        .preview-workspace {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            background: #f8fafc;
                            padding: 28px;
                            border-radius: 14px;
                            border: 1px dashed #cbd5e1;
                            overflow-x: auto;
                            width: 100%;
                        }

                        .dark .preview-workspace {
                            background: #0f172a;
                            border-color: #334155;
                        }

                        .print-container {
                            background: #fef08a; /* Classic yellow thermal lining */
                            padding: 12px 0;
                            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
                            border-radius: 6px;
                            display: flex;
                            flex-direction: column;
                            gap: 4px; /* Simulates gaps between vertical rows on backing sheet */
                            border: 1px solid #eab308;
                            width: fit-content;
                        }

                        .dark .print-container {
                            background: #713f12;
                            border-color: #854d0e;
                        }

                        .print-row {
                            position: relative;
                            width: 99mm;
                            height: 15mm;
                            background: transparent;
                            overflow: hidden;
                        }

                        .label-item {
                            position: absolute;
                            width: 31mm;
                            height: 15mm;
                            box-sizing: border-box;
                        }

                        .label-item-col-1 {
                            left: 3mm;
                        }

                        .label-item-col-2 {
                            left: 34mm;
                        }

                        .label-item-col-3 {
                            left: 65mm;
                        }

                        .label-sticker-inner {
                            border: 1px solid #e2e8f0;
                            border-radius: 3px;
                            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
                            transition: all 0.2s ease-in-out;
                        }

                        .label-sticker-inner:hover {
                            border-color: #cbd5e1;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
                            transform: translateY(-0.5px);
                            z-index: 10;
                        }

                        .dark .label-sticker-inner {
                            border-color: #334155;
                            background-color: #ffffff; /* Stickers remain white for print high fidelity */
                        }

                        .label-item.empty-label {
                            visibility: hidden;
                        }
                    `}</style>

                    {labelRows.map((rowItems, rowIdx) => (
                        <div key={`row-${rowIdx}`} className="print-row">
                            {/* Render actual labels */}
                            {rowItems.map((item, itemIdx) => (
                                <div key={item.id || `item-${rowIdx}-${itemIdx}`} className={`label-item label-item-col-${itemIdx + 1}`}>
                                    <BarcodeItem
                                        value={item.value}
                                        name={item.name}
                                        sinhalaName={item.sinhalaName}
                                        batchNo={item.batchNo}
                                        price={item.price}
                                    />
                                </div>
                            ))}

                            {/* Add empty placeholder divs for incomplete rows */}
                            {rowItems.length < 3 && (
                                <>
                                    {[...Array(3 - rowItems.length)].map((_, idx) => {
                                        const emptyIdx = rowItems.length + idx;
                                        return (
                                            <div
                                                key={`empty-${rowIdx}-${idx}`}
                                                className={`label-item label-item-col-${emptyIdx + 1} empty-label`}
                                            />
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

ProductLabelPrintContainer.displayName = 'ProductLabelPrintContainer';

export default ProductLabelPrintContainer;