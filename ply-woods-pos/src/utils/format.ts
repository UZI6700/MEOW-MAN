import { BusinessSettings, Sale } from '../types/pos';

export function formatPKR(amount: number, showDecimals = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(Math.round(showDecimals ? safe * 100 : safe) / (showDecimals ? 100 : 1));
  return `Rs. ${formatted}`;
}

export function formatCompactPKR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10_000_000) return `${sign}Rs. ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000_000) return `${sign}Rs. ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000) return `${sign}Rs. ${(abs / 1_000).toFixed(1)}K`;
  return formatPKR(amount);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isSameDay(iso: string, ref: Date = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export const URDU_LABELS = {
  invoice: 'بل / انوائس',
  date: 'تاریخ',
  customer: 'گاہک',
  item: 'تفصیل مال',
  qty: 'تعداد',
  rate: 'ریٹ',
  total: 'کل رقم',
  subtotal: 'مجموعی رقم',
  discount: 'رعایت',
  cutting: 'کٹنگ چارجز',
  delivery: 'کرایہ / لوڈر',
  tax: 'جی ایس ٹی',
  grandTotal: 'کل قابل ادائیگی',
  paid: 'وصول شدہ',
  balance: 'بقایا (ادھار)',
  thanks: 'خریداری کا شکریہ! کٹا ہوا مال واپس نہیں ہوگا۔',
};

export function buildWhatsAppInvoiceUrl(sale: Sale, settings: BusinessSettings): string {
  const phoneDigits = (sale.customerPhone || '').replace(/[^\d]/g, '');
  const pkPhone = phoneDigits.startsWith('0')
    ? `92${phoneDigits.slice(1)}`
    : phoneDigits.startsWith('92')
      ? phoneDigits
      : phoneDigits;

  const lines = [
    `*${settings.businessName}*`,
    `${settings.address}`,
    `Tel: ${settings.phone}`,
    `────────────────────`,
    `Invoice: *${sale.invoiceNo}*`,
    `Date: ${formatDateTime(sale.createdAt)}`,
    `Customer: ${sale.customerName}`,
    `────────────────────`,
    ...sale.items.map((item) => {
      const cutNote = item.customCut
        ? ` [Cut ${item.customCut.cutLengthFt}×${item.customCut.cutWidthFt} ft × ${item.customCut.pieceCount}]`
        : '';
      const lineTotal = item.quantity * item.unitPrice - item.lineDiscount;
      return `• ${item.name}${cutNote}: ${item.quantity} ${item.unit} × ${formatPKR(item.unitPrice)} = *${formatPKR(lineTotal)}*`;
    }),
    `────────────────────`,
    sale.discountAmount > 0 ? `Discount: -${formatPKR(sale.discountAmount)}` : '',
    sale.cuttingCharge > 0 ? `Cutting Charges: ${formatPKR(sale.cuttingCharge)}` : '',
    sale.deliveryCharge > 0 ? `Delivery (${sale.deliveryVehicle || 'Loader'}): ${formatPKR(sale.deliveryCharge)}` : '',
    sale.taxAmount > 0 ? `GST (${sale.taxRate}%): ${formatPKR(sale.taxAmount)}` : '',
    `*Grand Total: ${formatPKR(sale.grandTotal)}*`,
    `Paid: ${formatPKR(sale.paidAmount)}`,
    sale.dueAmount > 0 ? `*Balance Due (Udhaar): ${formatPKR(sale.dueAmount)}*` : `Status: PAID ✓`,
    ``,
    settings.receiptFooter,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join('\n'));
  return pkPhone ? `https://wa.me/${pkPhone}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function buildWhatsAppReminderUrl(
  customerName: string,
  phone: string,
  balance: number,
  settings: BusinessSettings
): string {
  const phoneDigits = (phone || '').replace(/[^\d]/g, '');
  const pkPhone = phoneDigits.startsWith('0') ? `92${phoneDigits.slice(1)}` : phoneDigits;
  const msg = [
    `Assalam-o-Alaikum ${customerName},`,
    `Friendly reminder from *${settings.businessName}* regarding your pending account balance (Udhaar) of *${formatPKR(balance)}*.`,
    `Kindly arrange payment at your earliest convenience. JazzCash/Easypaisa/Bank transfer accepted.`,
    `JazakAllah! — ${settings.phone}`,
  ].join('\n');
  return pkPhone
    ? `https://wa.me/${pkPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
