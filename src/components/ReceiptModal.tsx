import React from 'react';
import { Sale } from '../types';
import { format } from 'date-fns';
import { X, Printer, Check, Building, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface ReceiptModalProps {
  sales: (Sale & { product_name?: string })[];
  businessName: string | null;
  onClose: () => void;
}

export default function ReceiptModal({ sales, businessName, onClose }: ReceiptModalProps) {
  const handlePrint = () => {
    // Derive stable receipt metadata
    const referenceSale = sales[0];
    const receiptNo = `TW-${referenceSale.id.slice(0, 8).toUpperCase()}`;
    const customerSuffix = referenceSale?.customer_name 
      ? `_${referenceSale.customer_name.replace(/[^a-zA-Z0-9]/g, '_')}` 
      : '_WalkIn';
    
    const originalTitle = document.title;
    // Set customized document title for print-to-PDF file name
    document.title = `Receipt_${receiptNo}${customerSuffix}`;
    
    window.print();
    
    // Restore original document title shortly after print dialog is triggered
    setTimeout(() => {
      document.title = originalTitle;
    }, 150);
  };

  if (!sales || sales.length === 0) return null;

  // Derive stable receipt metadata from the first transaction element
  const referenceSale = sales[0];
  const receiptNo = `TW-${referenceSale.id.slice(0, 8).toUpperCase()}`;
  const totalCharge = sales.reduce((sum, s) => sum + s.total_price, 0);

  return (
    <div className="receipt-modal-container fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 py-8 print:p-0 print:static print:bg-white bg-slate-900/40 backdrop-blur-sm">
      <style>{`
        @media print {
          /* Force page size configuration and hide other layouts */
          @page {
            size: portrait;
            margin: 0;
          }
          html, body {
            background-color: #ffffff !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #root {
            display: none !important;
          }
          /* Hide global absolute layout overheads */
          nav, footer, .print\\:hidden, button, input, select, textarea {
            display: none !important;
            height: 0 !important;
          }
          .receipt-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            visibility: visible !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
          .receipt-modal-container * {
            visibility: visible !important;
          }
          /* Center the card cleanly with no extra space/pagebreak */
          .receipt-modal-container > div {
            border: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 24px !important;
            width: 100% !important;
            max-width: 420px !important;
            height: auto !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:p-0 my-auto"
      >
        {/* Modal Controls (Hidden in print) */}
        <div className="receipt-modal-control-bar flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1">
            <FileText size={14} className="text-slate-600" />
            Invoice Receipt ({sales.length} {sales.length === 1 ? 'item' : 'items'})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-950 cursor-pointer transition-colors"
              title="Print Receipt"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-950 cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Invoice Layout */}
        <div className="p-8 space-y-6 print:p-4 print:space-y-4">
          {/* Header */}
          <div className="text-center pb-6 border-b border-dashed border-slate-200">
            <div className="inline-flex p-2.5 bg-slate-950 text-white rounded-xl mb-3">
              <Building size={20} />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {businessName || 'TrackWise Ledger'}
            </h1>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase mt-1 tracking-wider">
              {businessName ? 'Authorized Business Receipt' : 'Inventory Management Service'}
            </p>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700">
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-black">Receipt No</div>
              <div className="font-mono text-slate-900 mt-0.5">{receiptNo}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-400 uppercase font-black">Transaction Date</div>
              <div className="text-slate-900 mt-0.5">
                {format(new Date(referenceSale.created_at), 'MMM d, yyyy HH:mm')}
              </div>
            </div>
          </div>

          {/* Customer Name Section */}
          {referenceSale.customer_name && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-700">
              <span className="text-[9px] text-slate-450 uppercase font-black block tracking-wider">Customer / Client</span>
              <span className="text-slate-900 font-extrabold text-sm block mt-0.5">{referenceSale.customer_name}</span>
            </div>
          )}

          {/* Transaction Summary Line Items */}
          <div className="border-y border-slate-100 py-3 space-y-3 max-h-[220px] overflow-y-auto pr-1">
            <div className="flex justify-between items-center text-xs font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase">
              <span>Item Catalog Descr.</span>
              <span>Subtotal</span>
            </div>
            
            {sales.map((item, idx) => (
              <div key={item.id || idx} className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-extrabold text-slate-950">
                    {item.product_name || 'Deleted Product'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Quantity: {item.quantity} units @ ₦{(item.total_price / item.quantity).toFixed(2)}
                  </div>
                </div>
                <div className="text-xs font-black text-slate-900 font-mono">
                  ₦{item.total_price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center border border-slate-100">
            <div>
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Total Charge</span>
              <div className="text-[9px] text-green-700 font-extrabold flex items-center gap-1 mt-0.5">
                <Check size={10} className="stroke-[3]" /> Transaction Paid
              </div>
            </div>
            <span className="text-lg font-black text-slate-900 font-mono">
              ₦{totalCharge.toFixed(2)}
            </span>
          </div>

          {/* Footer Card */}
          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed">
              Thank you for patronage! Powered responsibly by TrackWise forecasting database systems.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
