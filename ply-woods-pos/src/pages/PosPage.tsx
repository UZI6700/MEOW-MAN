import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Scissors,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  PauseCircle,
  FileText,
  CreditCard,
  AlertTriangle,
  Lock,
  Layers,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  CartItem,
  CustomerType,
  OffcutItem,
  PaymentMethod,
  ProductCategory,
  ProductVariant,
  Sale,
  UnitType,
} from '../types/pos';
import { usePos } from '../store/PosContext';
import { formatPKR } from '../utils/format';

interface PosPageProps {
  onSaleCompleted: (sale: Sale) => void;
}

const CATEGORIES: ('All' | ProductCategory)[] = [
  'All',
  'Commercial Plywood',
  'Marine Plywood',
  'MDF',
  'HDF',
  'Veneer Sheets',
  'Laminates (Sunmica)',
  'Block Board',
  'Hardboard',
  'Edge Banding',
  'Hardware & Adhesives',
];

export const PosPage: React.FC<PosPageProps> = ({ onSaleCompleted }) => {
  const {
    state,
    permissions,
    activeCartRestore,
    clearActiveCartRestore,
    completeSale,
    holdCart,
    saveQuotation,
    addCustomer,
    notify,
  } = usePos();

  const searchRef = useRef<HTMLInputElement>(null);
  const locId = state.activeLocationId;

  // Catalog view state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'All' | ProductCategory>('All');
  const [catalogTab, setCatalogTab] = useState<'products' | 'offcuts'>('products');

  // Cart state
  const [customerId, setCustomerId] = useState<string>('cust-walkin');
  const [priceTier, setPriceTier] = useState<'retail' | 'wholesale'>('retail');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [cuttingCharge, setCuttingCharge] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [deliveryVehicle, setDeliveryVehicle] = useState<
    'None' | 'Rickshaw' | 'Suzuki Loader' | 'Mazda Truck'
  >('None');
  const [taxEnabled, setTaxEnabled] = useState<boolean>(state.settings.gstEnabledDefault);
  const [notes, setNotes] = useState<string>('');
  const [managerApprovedDiscount, setManagerApprovedDiscount] = useState<boolean>(false);

  // Modals
  const [cutProduct, setCutProduct] = useState<ProductVariant | null>(null);
  const [cutLen, setCutLen] = useState<number>(2);
  const [cutWid, setCutWid] = useState<number>(3);
  const [cutPieces, setCutPieces] = useState<number>(1);
  const [createOffcut, setCreateOffcut] = useState<boolean>(true);
  const [offcutLen, setOffcutLen] = useState<number>(6);
  const [offcutWid, setOffcutWid] = useState<number>(4);
  const [offcutPrice, setOffcutPrice] = useState<number>(2200);

  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentRows, setPaymentRows] = useState<
    { method: PaymentMethod; amount: number; referenceNo?: string }[]
  >([{ method: 'cash', amount: 0 }]);

  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustType, setNewCustType] = useState<CustomerType>('contractor');
  const [newCustLimit, setNewCustLimit] = useState<number>(100000);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingAction, setPendingAction] = useState<'checkout' | null>(null);

  // Restore held cart when navigated from Held Bills
  useEffect(() => {
    if (activeCartRestore) {
      setCustomerId(activeCartRestore.customerId);
      setPriceTier(activeCartRestore.priceTier);
      setCart(activeCartRestore.items);
      setDiscountValue(activeCartRestore.discountValue);
      setDiscountType(activeCartRestore.discountType);
      setCuttingCharge(activeCartRestore.cuttingCharge);
      setDeliveryCharge(activeCartRestore.deliveryCharge);
      setDeliveryVehicle(activeCartRestore.deliveryVehicle);
      setTaxEnabled(activeCartRestore.taxEnabled);
      setNotes(activeCartRestore.notes);
      clearActiveCartRestore();
    }
  }, [activeCartRestore, clearActiveCartRestore]);

  const selectedCustomer = useMemo(
    () => state.customers.find((c) => c.id === customerId) || state.customers[0],
    [state.customers, customerId]
  );

  // Totals computation
  const subtotal = useMemo(
    () => cart.reduce((sum, it) => sum + it.quantity * it.unitPrice - it.lineDiscount, 0),
    [cart]
  );
  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    return discountType === 'percent'
      ? Math.round((subtotal * Math.min(100, discountValue)) / 100)
      : Math.min(subtotal, discountValue);
  }, [subtotal, discountValue, discountType]);

  const effectiveDiscountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const exceedsDiscountLimit =
    !managerApprovedDiscount && effectiveDiscountPct > permissions.maxDiscountPercent;

  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxEnabled ? Math.round((taxableBase * state.settings.gstRate) / 100) : 0;
  const grandTotal = Math.max(0, taxableBase + cuttingCharge + deliveryCharge + taxAmount);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.products.filter((p) => {
      if (category !== 'All' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.finish.toLowerCase().includes(q)
      );
    });
  }, [state.products, search, category]);

  const filteredOffcuts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.offcuts.filter((o) => {
      if (o.locationId !== locId) return false;
      if (category !== 'All' && o.category !== category) return false;
      if (!q) return true;
      return o.productName.toLowerCase().includes(q) || (o.notes || '').toLowerCase().includes(q);
    });
  }, [state.offcuts, locId, search, category]);

  // Keyboard shortcuts (F2 search, F4 payment, F8 hold)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) openCheckoutFlow();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) handleHoldCart();
      } else if (e.key === 'Escape') {
        setShowCheckout(false);
        setCutProduct(null);
        setShowQuickCustomer(false);
        setShowPinModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleCustomerChange = (newId: string) => {
    setCustomerId(newId);
    const c = state.customers.find((x) => x.id === newId);
    if (c && c.type === 'wholesale' && priceTier !== 'wholesale') {
      handleTierSwitch('wholesale');
    } else if (c && c.type === 'retail' && priceTier !== 'retail') {
      handleTierSwitch('retail');
    }
  };

  const handleTierSwitch = (tier: 'retail' | 'wholesale') => {
    setPriceTier(tier);
    setCart((prev) =>
      prev.map((item) => {
        if (!item.variantId || item.customCut) return item;
        const prod = state.products.find((p) => p.id === item.variantId);
        if (!prod) return item;
        const nextPrice =
          item.unit === 'sqft' && prod.unit === 'sheet'
            ? Math.round((tier === 'wholesale' ? prod.wholesalePrice : prod.retailPrice) / prod.sqftPerUnit)
            : tier === 'wholesale'
              ? prod.wholesalePrice
              : prod.retailPrice;
        return { ...item, unitPrice: nextPrice };
      })
    );
  };

  const addProductToCart = (p: ProductVariant) => {
    const avail = p.stock[locId];
    if (avail <= 0) {
      notify('Out of stock at this location', 'Transfer from Godown or switch location.', 'warning');
      return;
    }
    const rate = priceTier === 'wholesale' ? p.wholesalePrice : p.retailPrice;
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === p.id && !i.customCut && i.unit === p.unit);
      if (existing) {
        return prev.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          variantId: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          unit: p.unit,
          quantity: 1,
          unitPrice: rate,
          unitCost: p.purchaseCost,
          lineDiscount: 0,
        },
      ];
    });
  };

  const addOffcutToCart = (o: OffcutItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.offcutId === o.id);
      if (existing) {
        if (existing.quantity >= o.quantity) {
          notify('Maximum offcut qty reached', undefined, 'warning');
          return prev;
        }
        return prev.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: `ci-off-${o.id}-${Date.now()}`,
          offcutId: o.id,
          name: `Offcut: ${o.productName} (${o.lengthFt}×${o.widthFt} ft)`,
          sku: 'OFFCUT',
          category: o.category,
          unit: 'piece',
          quantity: 1,
          unitPrice: o.discountedPrice,
          unitCost: Math.round(o.discountedPrice * 0.6),
          lineDiscount: 0,
        },
      ];
    });
  };

  // Custom Size Cut Modal helpers
  const openCutModal = (p: ProductVariant) => {
    setCutProduct(p);
    setCutLen(2);
    setCutWid(3);
    setCutPieces(1);
    setCreateOffcut(true);
    const remLen = Math.max(1, Number((p.lengthFt - 2).toFixed(1)));
    setOffcutLen(remLen);
    setOffcutWid(p.widthFt);
    const remArea = Math.max(1, p.sqftPerUnit - 6);
    setOffcutPrice(Math.round(remArea * p.perSqFtPrice * 0.72));
  };

  const cutMetrics = useMemo(() => {
    if (!cutProduct) return null;
    const totalSqFt = Number((cutLen * cutWid * cutPieces).toFixed(2));
    const sheetArea = cutProduct.sqftPerUnit || 32;
    const sheetsConsumed = Math.max(1, Math.ceil(totalSqFt / sheetArea));
    const leftoverSqFt = Math.max(0, Number((sheetsConsumed * sheetArea - totalSqFt).toFixed(2)));
    const sheetBase =
      priceTier === 'wholesale' ? cutProduct.wholesalePrice : cutProduct.retailPrice;
    const ratePerSqFt = Math.round(sheetBase / sheetArea);
    const linePrice = Math.round(totalSqFt * ratePerSqFt);
    return { totalSqFt, sheetsConsumed, leftoverSqFt, ratePerSqFt, linePrice };
  }, [cutProduct, cutLen, cutWid, cutPieces, priceTier]);

  const confirmAddCustomCut = () => {
    if (!cutProduct || !cutMetrics) return;
    if (cutProduct.stock[locId] < cutMetrics.sheetsConsumed) {
      notify('Not enough full sheets in stock for this cut', undefined, 'error');
      return;
    }
    const costPerSqFt = cutProduct.purchaseCost / (cutProduct.sqftPerUnit || 32);
    const newItem: CartItem = {
      id: `ci-cut-${Date.now()}`,
      variantId: cutProduct.id,
      name: `${cutProduct.name} [Cut ${cutLen}×${cutWid}ft]`,
      sku: cutProduct.sku,
      category: cutProduct.category,
      unit: 'sqft',
      quantity: cutMetrics.totalSqFt,
      unitPrice: cutMetrics.ratePerSqFt,
      unitCost: Math.round(costPerSqFt),
      lineDiscount: 0,
      customCut: {
        cutLengthFt: cutLen,
        cutWidthFt: cutWid,
        pieceCount: cutPieces,
        totalSqFt: cutMetrics.totalSqFt,
        sheetsConsumed: cutMetrics.sheetsConsumed,
        createOffcut: createOffcut && cutMetrics.leftoverSqFt >= 2,
        offcutLengthFt: offcutLen,
        offcutWidthFt: offcutWid,
        offcutPrice,
      },
    };
    setCart((prev) => [...prev, newItem]);
    if (cuttingCharge === 0) setCuttingCharge(300);
    setCutProduct(null);
    notify(
      'Custom cut added to cart',
      `${cutMetrics.totalSqFt} sq ft (${cutMetrics.sheetsConsumed} sheet deducted${
        createOffcut ? ' + offcut auto-recorded on checkout' : ''
      })`
    );
  };

  const updateCartUnit = (itemId: string, unit: UnitType) => {
    setCart((prev) =>
      prev.map((it) => {
        if (it.id !== itemId || !it.variantId) return it;
        const prod = state.products.find((p) => p.id === it.variantId);
        if (!prod) return { ...it, unit };
        const base = priceTier === 'wholesale' ? prod.wholesalePrice : prod.retailPrice;
        const nextPrice =
          unit === 'sqft' && prod.unit === 'sheet'
            ? Math.round(base / prod.sqftPerUnit)
            : base;
        return { ...it, unit, unitPrice: nextPrice };
      })
    );
  };

  const openCheckoutFlow = () => {
    if (cart.length === 0) return;
    if (exceedsDiscountLimit) {
      setPendingAction('checkout');
      setPinInput('');
      setShowPinModal(true);
      return;
    }
    setPaymentRows([{ method: 'cash', amount: grandTotal }]);
    setShowCheckout(true);
  };

  const verifyManagerPin = () => {
    if (pinInput === state.settings.managerPin) {
      setManagerApprovedDiscount(true);
      setShowPinModal(false);
      notify('Manager PIN verified', 'Over-limit discount approved.');
      if (pendingAction === 'checkout') {
        setPaymentRows([{ method: 'cash', amount: grandTotal }]);
        setShowCheckout(true);
      }
      setPendingAction(null);
    } else {
      notify('Invalid Manager PIN', `Default demo PIN is ${state.settings.managerPin}`, 'error');
    }
  };

  const handleHoldCart = () => {
    if (cart.length === 0) return;
    holdCart({
      label: `${selectedCustomer.name} (${cart.length} items — ${formatPKR(grandTotal)})`,
      customerId,
      priceTier,
      items: cart,
      discountValue,
      discountType,
      cuttingCharge,
      deliveryCharge,
      deliveryVehicle,
      taxEnabled,
      notes,
    });
    clearCart();
  };

  const handleSaveQuotation = () => {
    if (cart.length === 0) return;
    saveQuotation({
      customerId,
      locationId: locId,
      priceTier,
      items: cart,
      discountAmount,
      cuttingCharge,
      deliveryCharge,
      deliveryVehicle,
      taxEnabled,
      taxRate: state.settings.gstRate,
      notes,
    });
    clearCart();
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setCuttingCharge(0);
    setDeliveryCharge(0);
    setDeliveryVehicle('None');
    setNotes('');
    setManagerApprovedDiscount(false);
  };

  // Checkout payment calculations
  const totalNonCreditPaid = paymentRows
    .filter((r) => r.method !== 'credit')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const udhaarDueNow = Math.max(0, grandTotal - totalNonCreditPaid);
  const projectedBalance = selectedCustomer.currentBalance + udhaarDueNow;
  const creditLimitExceeded =
    udhaarDueNow > 0 &&
    selectedCustomer.id !== 'cust-walkin' &&
    selectedCustomer.creditLimit > 0 &&
    projectedBalance > selectedCustomer.creditLimit;

  const finalizeSale = () => {
    if (udhaarDueNow > 0 && selectedCustomer.id === 'cust-walkin') {
      notify(
        'Select a named customer for Udhaar (credit)',
        'Walk-in cash customers cannot carry credit balance.',
        'error'
      );
      return;
    }
    if (creditLimitExceeded && state.settings.blockOverCreditLimit) {
      notify(
        'Credit Limit Blocked',
        `${selectedCustomer.name}'s credit limit (${formatPKR(selectedCustomer.creditLimit)}) is exceeded.`,
        'error'
      );
      return;
    }

    const finalPayments = [
      ...paymentRows.filter((r) => r.method !== 'credit' && r.amount > 0),
      ...(udhaarDueNow > 0 ? [{ method: 'credit' as PaymentMethod, amount: udhaarDueNow }] : []),
    ];

    const sale = completeSale({
      customerId,
      locationId: locId,
      priceTier,
      items: cart,
      discountAmount,
      cuttingCharge,
      deliveryCharge,
      deliveryVehicle,
      taxEnabled,
      taxRate: state.settings.gstRate,
      payments: finalPayments,
      notes,
    });

    setShowCheckout(false);
    clearCart();
    onSaleCompleted(sale);
  };

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      type: newCustType,
      creditLimit: newCustLimit,
      openingBalance: 0,
    });
    setCustomerId(created.id);
    if (created.type === 'wholesale') handleTierSwitch('wholesale');
    setShowQuickCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      {/* LEFT SIDE: Search, Category Chips & Product / Offcut Grid */}
      <div className="xl:col-span-7 space-y-4">
        {/* Search & Mode Bar */}
        <div className="concured-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B8FA8]" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    const exact = state.products.find(
                      (p) =>
                        p.barcode === search.trim() ||
                        p.sku.toLowerCase() === search.trim().toLowerCase()
                    );
                    if (exact) {
                      addProductToCart(exact);
                      setSearch('');
                    }
                  }
                }}
                placeholder="Search plywood, MDF, laminate, SKU or scan barcode... (F2)"
                className="input-field pl-10"
              />
            </div>

            <div className="inline-flex rounded-xl bg-[#F3F4FA] dark:bg-[#22253A] p-1 text-xs font-semibold">
              <button
                onClick={() => setCatalogTab('products')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  catalogTab === 'products'
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#6B708A] dark:text-[#A3A7C2]'
                }`}
              >
                Products ({filteredProducts.length})
              </button>
              <button
                onClick={() => setCatalogTab('offcuts')}
                className={`rounded-lg px-3 py-1.5 transition inline-flex items-center gap-1 ${
                  catalogTab === 'offcuts'
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#6B708A] dark:text-[#A3A7C2]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Offcuts ({filteredOffcuts.length})
              </button>
            </div>
          </div>

          {/* Category filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 min-w-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  category === cat
                    ? 'bg-[#7C5CFC] text-white shadow-sm'
                    : 'bg-[#F3F4FA] dark:bg-[#22253A] text-[#5C607B] dark:text-[#A3A7C2] hover:bg-[#EFEBFD] hover:text-[#7C5CFC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {catalogTab === 'products' ? (
          <div className="grid gap-3.5 max-h-[68vh] overflow-y-auto pr-1 items-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', alignItems: 'start' }}>
            {filteredProducts.map((p) => {
              const stockQty = p.stock[locId];
              const isLow = stockQty <= p.lowStockAlert;
              const price = priceTier === 'wholesale' ? p.wholesalePrice : p.retailPrice;
              return (
                <div
                  key={p.id}
                  className="concured-card flex flex-col gap-[10px] p-[14px] overflow-hidden min-w-0 hover:border-[#7C5CFC]/45 hover:-translate-y-0.5 transition group"
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', overflow: 'hidden', minWidth: 0 }}
                >
                  <div className="flex flex-wrap gap-1.5 min-w-0" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minWidth: 0 }}>
                    <span className="inline-flex items-center rounded-lg bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 px-2 py-0.5 text-[10.5px] font-bold text-[#7C5CFC]">
                      {p.thicknessMm ? `${p.thicknessMm}mm` : p.unit} • {p.sizeLabel}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                        stockQty === 0
                          ? 'bg-red-100 text-[#EF4444]'
                          : isLow
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}
                    >
                      {stockQty} {p.unit}
                    </span>
                  </div>

                  <h3 className="text-[14px] font-semibold text-[#1A1B2E] dark:text-white leading-snug line-clamp-2 min-w-0 mt-[2px]" style={{ marginTop: '2px' }}>
                    {p.name}
                  </h3>
                  <p className="text-[12px] text-[#8B8FA8] min-w-0 truncate">
                    {p.brand} • {p.grade} • {p.rackLocation}
                  </p>

                  <div className="border-t border-[#F1F2F8] dark:border-[#2A2D45] mt-[10px] mb-[10px]" style={{ marginTop: '10px', marginBottom: '10px' }} />

                  <div className="flex flex-col gap-2 min-w-0 overflow-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                    <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0 min-w-0" style={{ minWidth: 0 }}>
                      <span className="text-[18px] font-bold text-[#1A1B2E] dark:text-white" style={{ boxSizing: 'border-box' }}>
                        {formatPKR(price)}
                      </span>
                      {p.unit === 'sheet' && (
                        <span className="text-[11px] text-[#8B8FA8]" style={{ boxSizing: 'border-box' }}>
                          ~{formatPKR(Math.round(price / p.sqftPerUnit))}/sq ft
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 w-full min-w-0" style={{ display: 'flex', gap: '8px', width: '100%', minWidth: 0 }}>
                      {p.unit === 'sheet' && (
                        <button
                          onClick={() => openCutModal(p)}
                          title="Custom Size Cut (calculates sq ft & creates offcut)"
                          style={{ flex: '0 0 40px', height: '40px', width: '40px', boxSizing: 'border-box', borderRadius: '12px' }}
                          className="flex items-center justify-center flex-none w-10 h-10 box-border rounded-[12px] bg-[#F3F4FA] dark:bg-[#24273D] text-[#7C5CFC] hover:bg-[#EFEBFD] transition"
                        >
                          <Scissors className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => addProductToCart(p)}
                        disabled={stockQty <= 0}
                        style={{ flex: 1, minWidth: 0, height: '40px', justifyContent: 'center', boxSizing: 'border-box', borderRadius: '12px' }}
                        className="flex items-center gap-1 flex-1 min-w-0 h-10 justify-center box-border rounded-[12px] bg-[#7C5CFC] hover:bg-[#6A48F5] disabled:opacity-40 text-xs font-bold text-white shadow-sm transition active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Offcuts / Remnants Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredOffcuts.length === 0 ? (
              <div className="concured-card col-span-full p-8 text-center text-sm text-[#8B8FA8]">
                No offcut remnants in this location yet. Cut a sheet using the Scissors icon to create one automatically!
              </div>
            ) : (
              filteredOffcuts.map((o) => (
                <div key={o.id} className="concured-card p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="rounded-lg bg-cyan-50 dark:bg-cyan-950/50 px-2.5 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-300">
                        {o.lengthFt} × {o.widthFt} ft ({o.areaSqFt} sq ft)
                      </span>
                      <span className="text-xs font-bold text-emerald-600">Qty: {o.quantity}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#1A1B2E] dark:text-white">
                      {o.productName}
                    </h4>
                    <p className="text-xs text-[#8B8FA8] mt-0.5">
                      {o.notes || 'Discounted remnant piece'}{' '}
                      {o.sourceInvoiceNo ? `• From ${o.sourceInvoiceNo}` : ''}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#F1F2F8] dark:border-[#2A2D45] flex items-center justify-between">
                    <span className="text-base font-extrabold text-[#7C5CFC]">
                      {formatPKR(o.discountedPrice)}
                    </span>
                    <button
                      onClick={() => addOffcutToCart(o)}
                      className="btn-primary py-2 px-3.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Sell Offcut
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDE: Cart & Checkout Panel */}
      <div className="xl:col-span-5 concured-card p-5 space-y-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto flex flex-col min-w-0">
        {/* Customer Selector + Retail/Wholesale Tier */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="input-field flex-1 font-medium"
            >
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                  {c.currentBalance > 0 ? ` — Udhaar ${formatPKR(c.currentBalance)}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowQuickCustomer(true)}
              title="Quick-Add Customer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[#7C5CFC] hover:bg-[#7C5CFC] hover:text-white transition"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-xl bg-[#F3F4FA] dark:bg-[#22253A] p-1 text-xs font-semibold">
              <button
                onClick={() => handleTierSwitch('retail')}
                className={`rounded-lg px-3 py-1 transition ${
                  priceTier === 'retail'
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#6B708A] dark:text-[#A3A7C2]'
                }`}
              >
                Retail Rate
              </button>
              <button
                onClick={() => handleTierSwitch('wholesale')}
                className={`rounded-lg px-3 py-1 transition ${
                  priceTier === 'wholesale'
                    ? 'bg-[#7C5CFC] text-white'
                    : 'text-[#6B708A] dark:text-[#A3A7C2]'
                }`}
              >
                Wholesale Rate
              </button>
            </div>

            {selectedCustomer.id !== 'cust-walkin' && (
              <div className="text-right text-[11px]">
                <span className="text-[#8B8FA8]">Udhaar: </span>
                <strong
                  className={
                    selectedCustomer.currentBalance > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'
                  }
                >
                  {formatPKR(selectedCustomer.currentBalance)}
                </strong>
                {selectedCustomer.creditLimit > 0 && (
                  <span className="text-[#8B8FA8]">
                    {' '}
                    / {formatPKR(selectedCustomer.creditLimit)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="max-h-[270px] overflow-y-auto divide-y divide-[#F1F2F8] dark:divide-[#2A2D45] border-y border-[#F1F2F8] dark:border-[#2A2D45]">
          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <Layers className="mx-auto h-8 w-8 text-[#C6C9DC] mb-2" />
              <p className="text-sm font-semibold text-[#5C607B] dark:text-[#A3A7C2]">
                Cart is empty
              </p>
              <p className="text-xs text-[#8B8FA8]">
                Click products on the left or press F2 to scan/search
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.quantity * item.unitPrice - item.lineDiscount;
              return (
                <div key={item.id} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#1A1B2E] dark:text-white leading-snug">
                        {item.name}
                      </div>
                      {item.customCut && (
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#7C5CFC]">
                          <Scissors className="h-3 w-3" />
                          Deducts {item.customCut.sheetsConsumed} sheet
                          {item.customCut.createOffcut
                            ? ` • Saves ${item.customCut.offcutLengthFt}×${item.customCut.offcutWidthFt}ft offcut`
                            : ''}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setCart((p) => p.filter((x) => x.id !== item.id))}
                      className="text-[#989CB3] hover:text-[#EF4444] p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Qty */}
                    <div className="inline-flex items-center rounded-xl border border-[#E3E6F0] dark:border-[#2E314D] bg-[#F8F9FD] dark:bg-[#161827]">
                      <button
                        onClick={() =>
                          setCart((p) =>
                            p.map((x) =>
                              x.id === item.id
                                ? { ...x, quantity: Math.max(1, Number((x.quantity - 1).toFixed(2))) }
                                : x
                            )
                          )
                        }
                        className="p-1.5 text-[#5C607B] hover:text-[#7C5CFC]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0.5}
                        step="any"
                        value={item.quantity}
                        onChange={(e) =>
                          setCart((p) =>
                            p.map((x) =>
                              x.id === item.id
                                ? { ...x, quantity: Math.max(0.5, Number(e.target.value) || 1) }
                                : x
                            )
                          )
                        }
                        className="w-12 bg-transparent text-center text-xs font-bold focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          setCart((p) =>
                            p.map((x) =>
                              x.id === item.id
                                ? { ...x, quantity: Number((x.quantity + 1).toFixed(2)) }
                                : x
                            )
                          )
                        }
                        className="p-1.5 text-[#5C607B] hover:text-[#7C5CFC]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Unit */}
                    <select
                      value={item.unit}
                      disabled={Boolean(item.customCut || item.offcutId)}
                      onChange={(e) => updateCartUnit(item.id, e.target.value as UnitType)}
                      className="rounded-lg border border-[#E3E6F0] dark:border-[#2E314D] bg-white dark:bg-[#161827] px-2 py-1 text-[11px] font-medium"
                    >
                      <option value="sheet">sheet</option>
                      <option value="sqft">sq ft</option>
                      <option value="rft">run ft</option>
                      <option value="piece">piece</option>
                    </select>

                    {/* Rate (editable by Admin/Manager only) */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-[#8B8FA8]">@</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        disabled={!permissions.canEditPrices}
                        onChange={(e) =>
                          setCart((p) =>
                            p.map((x) =>
                              x.id === item.id
                                ? { ...x, unitPrice: Math.max(0, Number(e.target.value) || 0) }
                                : x
                            )
                          )
                        }
                        className="w-20 rounded-lg border border-[#E3E6F0] dark:border-[#2E314D] bg-white dark:bg-[#161827] px-2 py-1 text-right text-xs font-semibold disabled:opacity-70"
                      />
                    </div>

                    <div className="text-xs font-extrabold text-[#1A1B2E] dark:text-white ml-auto">
                      {formatPKR(lineTotal)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Adjustments: Discount, Cutting, Delivery, GST */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
              Discount ({discountType === 'percent' ? '%' : 'Rs.'})
            </label>
            <div className="flex">
              <input
                type="number"
                min={0}
                value={discountValue}
                onChange={(e) => {
                  setDiscountValue(Math.max(0, Number(e.target.value) || 0));
                  setManagerApprovedDiscount(false);
                }}
                className="input-field rounded-r-none py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => setDiscountType((t) => (t === 'amount' ? 'percent' : 'amount'))}
                className="rounded-r-[12px] border border-l-0 border-[#E3E6F0] dark:border-[#2E314D] bg-[#F3F4FA] dark:bg-[#24273D] px-2.5 font-bold text-[#7C5CFC]"
              >
                {discountType === 'percent' ? '%' : 'Rs'}
              </button>
            </div>
            {exceedsDiscountLimit && (
              <p className="mt-1 text-[10.5px] font-semibold text-amber-600 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Exceeds {permissions.maxDiscountPercent}% limit (PIN required)
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
              Cutting Charge (Rs.)
            </label>
            <input
              type="number"
              min={0}
              value={cuttingCharge}
              onChange={(e) => setCuttingCharge(Math.max(0, Number(e.target.value) || 0))}
              className="input-field py-1.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
              Delivery Charge (Rs.)
            </label>
            <input
              type="number"
              min={0}
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value) || 0))}
              className="input-field py-1.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8B8FA8] mb-1">
              Transport Vehicle
            </label>
            <select
              value={deliveryVehicle}
              onChange={(e) =>
                setDeliveryVehicle(
                  e.target.value as 'None' | 'Rickshaw' | 'Suzuki Loader' | 'Mazda Truck'
                )
              }
              className="input-field py-1.5 text-xs"
            >
              <option value="None">Self Pickup</option>
              <option value="Rickshaw">Loader Rickshaw</option>
              <option value="Suzuki Loader">Suzuki Bolan / Ravi</option>
              <option value="Mazda Truck">Mazda / Shehzore Truck</option>
            </select>
          </div>
        </div>

        {/* GST Toggle & Summary Breakdown */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-[#525672] dark:text-[#A3A7C2]">
            <input
              type="checkbox"
              checked={taxEnabled}
              onChange={(e) => setTaxEnabled(e.target.checked)}
              className="rounded accent-[#7C5CFC]"
            />
            Include GST ({state.settings.gstRate}%)
          </label>
          <span className="text-[#8B8FA8]">
            Subtotal: <strong className="text-[#1A1B2E] dark:text-white">{formatPKR(subtotal)}</strong>
          </span>
        </div>

        {/* Gradient Total Strip matching Concured Hero card */}
        <div className="hero-gradient rounded-2xl p-4 text-white shadow-hero flex items-center justify-between">
          <div>
            <div className="text-xs text-white/80 font-medium">Grand Total</div>
            <div className="text-[11px] text-white/75">
              {cart.length} line(s)
              {taxEnabled ? ` • incl. GST ${formatPKR(taxAmount)}` : ''}
            </div>
          </div>
          <div className="text-2xl font-extrabold tracking-tight">{formatPKR(grandTotal)}</div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleHoldCart}
            disabled={cart.length === 0}
            className="btn-secondary col-span-1 flex-col gap-0.5 py-2 text-[11px]"
            title="Hold Cart (F8)"
          >
            <PauseCircle className="h-4 w-4 text-[#7C5CFC]" />
            <span>Hold (F8)</span>
          </button>
          <button
            onClick={handleSaveQuotation}
            disabled={cart.length === 0}
            className="btn-secondary col-span-1 flex-col gap-0.5 py-2 text-[11px]"
            title="Save as Estimate / Quotation"
          >
            <FileText className="h-4 w-4 text-[#3CD2F0]" />
            <span>Quote</span>
          </button>
          <button
            onClick={openCheckoutFlow}
            disabled={cart.length === 0}
            className="btn-primary col-span-2 text-sm py-3"
          >
            <CreditCard className="h-4 w-4" />
            Pay / Checkout (F4)
          </button>
        </div>
      </div>

      {/* ---------------- MODAL 1: CUSTOM SIZE CUTTING & OFFCUT ---------------- */}
      {cutProduct && cutMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-white dark:bg-[#1B1D2E] border border-[#ECEEF5] dark:border-[#2A2D45] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EFEBFD] px-2.5 py-0.5 text-[11px] font-bold text-[#7C5CFC] mb-1">
                  <Scissors className="h-3 w-3" /> Custom Size Cutting Calculator
                </span>
                <h3 className="text-lg font-bold text-[#1A1B2E] dark:text-white">
                  {cutProduct.name}
                </h3>
                <p className="text-xs text-[#8B8FA8]">
                  Full Sheet: {cutProduct.lengthFt} × {cutProduct.widthFt} ft ={' '}
                  {cutProduct.sqftPerUnit} sq ft • {formatPKR(cutMetrics.ratePerSqFt)}/sq ft
                </p>
              </div>
              <button
                onClick={() => setCutProduct(null)}
                className="rounded-lg p-1 text-[#8B8FA8] hover:bg-[#F3F4FA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C607B] dark:text-[#A3A7C2] mb-1">
                  Cut Length (ft)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0.5}
                  max={cutProduct.lengthFt}
                  value={cutLen}
                  onChange={(e) => {
                    const v = Math.max(0.5, Number(e.target.value) || 1);
                    setCutLen(v);
                    setOffcutLen(Math.max(1, Number((cutProduct.lengthFt - v).toFixed(1))));
                  }}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C607B] dark:text-[#A3A7C2] mb-1">
                  Cut Width (ft)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0.5}
                  max={cutProduct.widthFt}
                  value={cutWid}
                  onChange={(e) => setCutWid(Math.max(0.5, Number(e.target.value) || 1))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C607B] dark:text-[#A3A7C2] mb-1">
                  Pieces (Qty)
                </label>
                <input
                  type="number"
                  min={1}
                  value={cutPieces}
                  onChange={(e) => setCutPieces(Math.max(1, Number(e.target.value) || 1))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#F7F8FC] dark:bg-[#22253A] p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[11px] text-[#8B8FA8]">Total Area</div>
                <div className="text-base font-extrabold text-[#1A1B2E] dark:text-white">
                  {cutMetrics.totalSqFt} sq ft
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8B8FA8]">Sheets Deducted</div>
                <div className="text-base font-extrabold text-[#7C5CFC]">
                  {cutMetrics.sheetsConsumed} sheet(s)
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8B8FA8]">Cut Price</div>
                <div className="text-base font-extrabold text-[#22C55E]">
                  {formatPKR(cutMetrics.linePrice)}
                </div>
              </div>
            </div>

            {/* Automatic Offcut creation */}
            {cutMetrics.leftoverSqFt >= 2 && (
              <div className="rounded-2xl border border-[#7C5CFC]/25 bg-[#FAF9FF] dark:bg-[#7C5CFC]/10 p-4 space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-[#1A1B2E] dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createOffcut}
                    onChange={(e) => setCreateOffcut(e.target.checked)}
                    className="accent-[#7C5CFC]"
                  />
                  Record leftover piece ({cutMetrics.leftoverSqFt} sq ft remaining) into Offcut Stock
                </label>

                {createOffcut && (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[#8B8FA8] mb-1">Offcut L (ft)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={offcutLen}
                        onChange={(e) => setOffcutLen(Math.max(0.5, Number(e.target.value) || 1))}
                        className="input-field py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#8B8FA8] mb-1">Offcut W (ft)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={offcutWid}
                        onChange={(e) => setOffcutWid(Math.max(0.5, Number(e.target.value) || 1))}
                        className="input-field py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#8B8FA8] mb-1">
                        Sale Rate (Rs.)
                      </label>
                      <input
                        type="number"
                        value={offcutPrice}
                        onChange={(e) => setOffcutPrice(Math.max(0, Number(e.target.value) || 0))}
                        className="input-field py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button onClick={() => setCutProduct(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={confirmAddCustomCut} className="btn-primary">
                <Check className="h-4 w-4" /> Add Custom Cut to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 2: SPLIT / PARTIAL / UDHAAR CHECKOUT ---------------- */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-white dark:bg-[#1B1D2E] border border-[#ECEEF5] dark:border-[#2A2D45] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1A1B2E] dark:text-white">
                  Complete Payment
                </h3>
                <p className="text-xs text-[#8B8FA8]">
                  Customer: <strong>{selectedCustomer.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="rounded-lg p-1 text-[#8B8FA8] hover:bg-[#F3F4FA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="hero-gradient rounded-2xl p-4 text-white flex items-center justify-between">
              <span className="text-sm font-semibold">Amount Payable</span>
              <span className="text-2xl font-extrabold">{formatPKR(grandTotal)}</span>
            </div>

            {/* Quick Payment Presets */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPaymentRows([{ method: 'cash', amount: grandTotal }])}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Full Cash
              </button>
              <button
                onClick={() => setPaymentRows([{ method: 'jazzcash', amount: grandTotal }])}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Full JazzCash
              </button>
              <button
                onClick={() =>
                  setPaymentRows([{ method: 'cash', amount: Math.round(grandTotal * 0.5) }])
                }
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                50% Advance + Udhaar
              </button>
              <button
                onClick={() => setPaymentRows([{ method: 'credit', amount: grandTotal }])}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Full Udhaar (Credit)
              </button>
            </div>

            {/* Split payment rows */}
            <div className="space-y-2.5">
              {paymentRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={row.method}
                    onChange={(e) =>
                      setPaymentRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, method: e.target.value as PaymentMethod } : r
                        )
                      )
                    }
                    className="input-field w-40"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">Easypaisa</option>
                    <option value="cheque">Cheque</option>
                    <option value="credit">Credit (Udhaar)</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={row.amount}
                    onChange={(e) =>
                      setPaymentRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, amount: Math.max(0, Number(e.target.value) || 0) } : r
                        )
                      )
                    }
                    className="input-field flex-1 font-bold"
                    placeholder="Amount in PKR"
                  />
                  {paymentRows.length > 1 && (
                    <button
                      onClick={() => setPaymentRows((p) => p.filter((_, i) => i !== idx))}
                      className="p-2 text-[#EF4444]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  setPaymentRows((p) => [
                    ...p,
                    { method: 'jazzcash', amount: Math.max(0, grandTotal - totalNonCreditPaid) },
                  ])
                }
                className="text-xs font-semibold text-[#7C5CFC] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Split Payment Method
              </button>
            </div>

            {/* Summary box */}
            <div className="rounded-2xl bg-[#F7F8FC] dark:bg-[#22253A] p-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8B8FA8]">Received Now:</span>
                <strong className="text-[#22C55E]">{formatPKR(totalNonCreditPaid)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B8FA8]">Remaining to Udhaar (Credit Ledger):</span>
                <strong className={udhaarDueNow > 0 ? 'text-[#EF4444]' : 'text-[#1A1B2E] dark:text-white'}>
                  {formatPKR(udhaarDueNow)}
                </strong>
              </div>
              {totalNonCreditPaid > grandTotal && (
                <div className="flex justify-between text-[#7C5CFC] font-bold">
                  <span>Change to Return:</span>
                  <span>{formatPKR(totalNonCreditPaid - grandTotal)}</span>
                </div>
              )}
            </div>

            {creditLimitExceeded && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Credit Limit Warning:</strong> New Udhaar balance will be{' '}
                  {formatPKR(projectedBalance)} (limit: {formatPKR(selectedCustomer.creditLimit)}).
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-1">
              <button onClick={() => setShowCheckout(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={finalizeSale} className="btn-primary px-6">
                <Check className="h-4 w-4" /> Confirm &amp; Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 3: MANAGER PIN APPROVAL ---------------- */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                  Manager Approval Required
                </h3>
                <p className="text-xs text-[#8B8FA8]">
                  Discount ({effectiveDiscountPct.toFixed(1)}%) exceeds {permissions.label} limit (
                  {permissions.maxDiscountPercent}%).
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C607B] mb-1">
                Enter Manager PIN (Demo PIN: {state.settings.managerPin})
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyManagerPin()}
                className="input-field text-center tracking-widest font-bold text-lg"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPinModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={verifyManagerPin} className="btn-primary">
                Approve Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 4: QUICK-ADD CUSTOMER ---------------- */}
      {showQuickCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleQuickAddCustomer}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                Quick-Add Customer
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCustomer(false)}
                className="text-[#8B8FA8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                required
                placeholder="Customer / Carpenter / Shop Name"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Phone (e.g. 0300-1234567)"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Address / Workshop Area"
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                className="input-field"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newCustType}
                  onChange={(e) => setNewCustType(e.target.value as CustomerType)}
                  className="input-field"
                >
                  <option value="retail">Retail</option>
                  <option value="contractor">Carpenter / Contractor</option>
                  <option value="wholesale">Wholesale Dealer</option>
                </select>
                <input
                  type="number"
                  placeholder="Credit Limit (Rs.)"
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(Number(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowQuickCustomer(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
