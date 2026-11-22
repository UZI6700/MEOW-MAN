import React, { useState } from 'react';
import { X, Printer, MessageCircle, FileText, Languages, CheckCircle2 } from 'lucide-react';
import { Sale } from '../../types/pos';
import { usePos } from '../../store/PosContext';
import {
  buildWhatsAppInvoiceUrl,
  formatDateTime,
  formatPKR,
  URDU_LABELS,
} from '../../utils/format';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { state } = usePos();
  const [paperMode, setPaperMode] = useState<'80mm' | 'A4'>(state.settings.paperSize);
  const [showUrdu, setShowUrdu] = useState<boolean>(state.settings.urduReceiptLabels);
  const [rtlMode, setRtlMode] = useState<boolean>(state.settings.rtlInvoice);

  if (!sale) return null;

  const customer = state.customers.find((c) => c.id === sale.customerId);
  const whatsappUrl = buildWhatsAppInvoiceUrl(sale, state.settings);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-[24px] bg-white dark:bg-[#1B1D2E] border border-[#ECEEF5] dark:border-[#2A2D45] shadow-2xl overflow-hidden my-auto">
        {/* Top Action Bar (not printed) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-[#ECEEF5] dark:border-[#2A2D45] px-6 py-4 bg-[#FAF9FE] dark:bg-[#151726]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
            <div>
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                Invoice {sale.invoiceNo}
              </h3>
              <p className="text-xs text-[#8B8FA8]">
                Print 80mm Thermal, A4 Invoice (PDF), or share via WhatsApp
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Paper size toggle */}
            <div className="inline-flex rounded-xl bg-[#EFEBFD] dark:bg-[#24273D] p-1 text-xs font-semibold">
              <button
                onClick={() => setPaperMode('80mm')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  paperMode === '80mm'
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#5C607B] dark:text-[#A3A7C2]'
                }`}
              >
                80mm Thermal
              </button>
              <button
                onClick={() => setPaperMode('A4')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  paperMode === 'A4'
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#5C607B] dark:text-[#A3A7C2]'
                }`}
              >
                A4 Invoice
              </button>
            </div>

            <button
              onClick={() => setShowUrdu((u) => !u)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
                showUrdu
                  ? 'border-[#7C5CFC] bg-[#EFEBFD] text-[#7C5CFC] dark:bg-[#7C5CFC]/20'
                  : 'border-[#E3E6F0] dark:border-[#2E314D] text-[#5C607B]'
              }`}
            >
              <Languages className="h-3.5 w-3.5" />
              Urdu Labels
            </button>

            <button
              onClick={() => setRtlMode((r) => !r)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
                rtlMode
                  ? 'border-[#7C5CFC] bg-[#EFEBFD] text-[#7C5CFC] dark:bg-[#7C5CFC]/20'
                  : 'border-[#E3E6F0] dark:border-[#2E314D] text-[#5C607B]'
              }`}
            >
              {rtlMode ? 'RTL ON' : 'LTR'}
            </button>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-[#7C809B] hover:bg-[#ECEEF5] dark:hover:bg-[#2A2D45]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Preview */}
        <div className="max-h-[65vh] overflow-y-auto bg-[#F3F4FA] dark:bg-[#12131F] p-6 flex justify-center">
          <div
            id="printable-area"
            dir={rtlMode ? 'rtl' : 'ltr'}
            className={`bg-white text-[#111827] shadow-lg border border-gray-200 ${
              paperMode === '80mm'
                ? 'print-thermal-80mm w-[320px] p-5 text-[12px] rounded-xl'
                : 'print-a4 w-full max-w-[680px] p-8 text-[13px] rounded-xl'
            }`}
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
              <div className="text-lg font-extrabold tracking-tight text-[#1A1B2E]">
                {state.settings.businessName}
              </div>
              <div className="text-[11px] text-gray-600">{state.settings.tagline}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{state.settings.address}</div>
              <div className="text-[11px] text-gray-600 font-medium">
                Tel: {state.settings.phone}
                {state.settings.ntn ? ` • NTN: ${state.settings.ntn}` : ''}
              </div>
              {showUrdu && (
                <div className="mt-1 text-xs font-semibold text-gray-700 font-urdu">
                  پلائی ووڈ، ایم ڈی ایف اور لیمینیٹ سینٹر
                </div>
              )}
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] border-b border-dashed border-gray-300 pb-3 mb-3">
              <div>
                <span className="text-gray-500">
                  Invoice{showUrdu ? ` / ${URDU_LABELS.invoice}` : ''}:
                </span>{' '}
                <strong className="text-gray-900">{sale.invoiceNo}</strong>
              </div>
              <div className={rtlMode ? 'text-left' : 'text-right'}>
                <span className="text-gray-500">
                  Date{showUrdu ? ` / ${URDU_LABELS.date}` : ''}:
                </span>{' '}
                <span>{formatDateTime(sale.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">
                  Customer{showUrdu ? ` / ${URDU_LABELS.customer}` : ''}:
                </span>{' '}
                <strong>{sale.customerName}</strong>
              </div>
              <div className={rtlMode ? 'text-left' : 'text-right'}>
                <span className="text-gray-500">Rate Tier:</span>{' '}
                <span className="uppercase font-semibold">{sale.priceTier}</span>
              </div>
              {sale.deliveryVehicle && sale.deliveryVehicle !== 'None' && (
                <div className="col-span-2 text-gray-600">
                  Delivery Vehicle: <strong>{sale.deliveryVehicle}</strong>
                </div>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse text-[11.5px] mb-3">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600">
                  <th className={`py-1.5 font-semibold ${rtlMode ? 'text-right' : 'text-left'}`}>
                    Item {showUrdu && <span className="font-urdu">({URDU_LABELS.item})</span>}
                  </th>
                  <th className="py-1.5 text-center font-semibold">
                    Qty {showUrdu && <span className="font-urdu">({URDU_LABELS.qty})</span>}
                  </th>
                  <th className="py-1.5 text-right font-semibold">
                    Rate {showUrdu && <span className="font-urdu">({URDU_LABELS.rate})</span>}
                  </th>
                  <th className="py-1.5 text-right font-semibold">
                    Total {showUrdu && <span className="font-urdu">({URDU_LABELS.total})</span>}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-gray-200">
                {sale.items.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice - item.lineDiscount;
                  return (
                    <tr key={item.id}>
                      <td className="py-1.5 pr-1">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        {item.customCut && (
                          <div className="text-[10px] text-[#7C5CFC] font-medium">
                            Custom Cut: {item.customCut.cutLengthFt}ft × {item.customCut.cutWidthFt}
                            ft ({item.customCut.pieceCount} pc = {item.customCut.totalSqFt} sq ft)
                          </div>
                        )}
                        {item.lineDiscount > 0 && (
                          <div className="text-[10px] text-emerald-700">
                            Line Disc: -{formatPKR(item.lineDiscount)}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-center whitespace-nowrap">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        {formatPKR(item.unitPrice)}
                      </td>
                      <td className="py-1.5 text-right font-semibold whitespace-nowrap">
                        {formatPKR(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-dashed border-gray-300 pt-2.5 space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Subtotal {showUrdu && `/ ${URDU_LABELS.subtotal}`}
                </span>
                <span>{formatPKR(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount {showUrdu && `/ ${URDU_LABELS.discount}`}</span>
                  <span>-{formatPKR(sale.discountAmount)}</span>
                </div>
              )}
              {sale.cuttingCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Cutting Charge {showUrdu && `/ ${URDU_LABELS.cutting}`}
                  </span>
                  <span>{formatPKR(sale.cuttingCharge)}</span>
                </div>
              )}
              {sale.deliveryCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Delivery / Transport {showUrdu && `/ ${URDU_LABELS.delivery}`}
                  </span>
                  <span>{formatPKR(sale.deliveryCharge)}</span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    GST ({sale.taxRate}%) {showUrdu && `/ ${URDU_LABELS.tax}`}
                  </span>
                  <span>{formatPKR(sale.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold border-t border-gray-300 pt-2 mt-1">
                <span>Grand Total {showUrdu && `/ ${URDU_LABELS.grandTotal}`}</span>
                <span>{formatPKR(sale.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Paid {showUrdu && `/ ${URDU_LABELS.paid}`}</span>
                <span>{formatPKR(sale.paidAmount)}</span>
              </div>
              {sale.dueAmount > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Invoice Balance (Udhaar) {showUrdu && `/ ${URDU_LABELS.balance}`}</span>
                  <span>{formatPKR(sale.dueAmount)}</span>
                </div>
              )}
              {customer && customer.id !== 'cust-walkin' && customer.currentBalance > 0 && (
                <div className="flex justify-between text-[11px] bg-amber-50 text-amber-900 px-2 py-1 rounded mt-1">
                  <span>Total Account Udhaar Balance:</span>
                  <strong>{formatPKR(customer.currentBalance)}</strong>
                </div>
              )}
            </div>

            {/* Payment breakdown */}
            <div className="mt-3 pt-2 border-t border-dashed border-gray-300 text-[10.5px] text-gray-600">
              <div>
                Payments:{' '}
                {sale.payments
                  .map((p) => `${p.method.toUpperCase()} ${formatPKR(p.amount)}`)
                  .join(' • ')}
              </div>
              <div>Cashier: {sale.createdBy}</div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-2 border-t border-dashed border-gray-300 text-center text-[10.5px] text-gray-500 space-y-1">
              <p>{state.settings.receiptFooter}</p>
              {showUrdu && <p className="font-urdu text-gray-700">{URDU_LABELS.thanks}</p>}
            </div>
          </div>
        </div>

        {/* Bottom CTA Bar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-[#ECEEF5] dark:border-[#2A2D45] px-6 py-4 bg-white dark:bg-[#1B1D2E]">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold px-4 py-2.5 text-sm shadow-sm transition"
            >
              <MessageCircle className="h-4 w-4" />
              Share via WhatsApp
            </a>
            <button onClick={handlePrint} className="btn-secondary">
              <FileText className="h-4 w-4" />
              Save PDF / Print
            </button>
            <button onClick={handlePrint} className="btn-primary">
              <Printer className="h-4 w-4" />
              Print {paperMode === '80mm' ? '80mm Thermal' : 'A4 Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
