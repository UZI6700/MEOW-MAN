import React, { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Download,
  Upload,
  History,
  Edit3,
  X,
  Package,
} from 'lucide-react';
import { ProductCategory, ProductVariant, UnitType } from '../types/pos';
import { usePos } from '../store/PosContext';
import { downloadCSV, formatDateTime, formatPKR } from '../utils/format';

const CATEGORIES: ProductCategory[] = [
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

export const ProductsPage: React.FC = () => {
  const { state, permissions, addProduct, updateProduct, importProductsCSV, notify } = usePos();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'All' | ProductCategory>('All');
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<ProductVariant | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Commercial Plywood');
  const [brand, setBrand] = useState('Lasani Wood');
  const [unit, setUnit] = useState<UnitType>('sheet');
  const [thicknessMm, setThicknessMm] = useState<number>(18);
  const [lengthFt, setLengthFt] = useState<number>(8);
  const [widthFt, setWidthFt] = useState<number>(4);
  const [grade, setGrade] = useState('A / Premium');
  const [finish, setFinish] = useState('Natural');
  const [purchaseCost, setPurchaseCost] = useState<number>(3500);
  const [retailPrice, setRetailPrice] = useState<number>(4300);
  const [wholesalePrice, setWholesalePrice] = useState<number>(4000);
  const [lowStockAlert, setLowStockAlert] = useState<number>(12);
  const [rackLocation, setRackLocation] = useState('Rack A-4');
  const [shopStock, setShopStock] = useState<number>(20);
  const [godownStock, setGodownStock] = useState<number>(50);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.products.filter((p) => {
      if (catFilter !== 'All' && p.category !== catFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    });
  }, [state.products, search, catFilter]);

  const openCreateModal = () => {
    setEditing(null);
    const rand = Math.floor(100 + Math.random() * 899);
    setName('');
    setSku(`PW-NEW-${rand}`);
    setBarcode(`89640010${Math.floor(2000 + Math.random() * 7999)}`);
    setCategory('Commercial Plywood');
    setBrand('Lasani Wood');
    setUnit('sheet');
    setThicknessMm(18);
    setLengthFt(8);
    setWidthFt(4);
    setGrade('A / Premium');
    setFinish('Natural');
    setPurchaseCost(3500);
    setRetailPrice(4300);
    setWholesalePrice(4000);
    setLowStockAlert(state.settings.defaultLowStock);
    setRackLocation('Rack A-4');
    setShopStock(20);
    setGodownStock(50);
    setShowAdd(true);
  };

  const openEditModal = (p: ProductVariant) => {
    setEditing(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode);
    setCategory(p.category);
    setBrand(p.brand);
    setUnit(p.unit);
    setThicknessMm(p.thicknessMm || 18);
    setLengthFt(p.lengthFt);
    setWidthFt(p.widthFt);
    setGrade(p.grade);
    setFinish(p.finish);
    setPurchaseCost(p.purchaseCost);
    setRetailPrice(p.retailPrice);
    setWholesalePrice(p.wholesalePrice);
    setLowStockAlert(p.lowStockAlert);
    setRackLocation(p.rackLocation);
    setShopStock(p.stock['loc-shop']);
    setGodownStock(p.stock['loc-godown']);
    setShowAdd(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const sizeLabel =
      unit === 'sheet' ? `${lengthFt}x${widthFt} ft` : unit === 'rft' ? 'Running ft' : 'Standard';

    if (editing) {
      updateProduct(editing.id, {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        category,
        brand,
        unit,
        thicknessMm: unit === 'sheet' ? thicknessMm : undefined,
        sizeLabel,
        lengthFt,
        widthFt,
        grade,
        finish,
        ...(permissions.canEditPrices
          ? { purchaseCost, retailPrice, wholesalePrice }
          : {}),
        lowStockAlert,
        rackLocation,
      });
    } else {
      addProduct({
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        category,
        brand,
        unit,
        thicknessMm: unit === 'sheet' ? thicknessMm : undefined,
        sizeLabel,
        lengthFt,
        widthFt,
        grade,
        finish,
        purchaseCost,
        retailPrice,
        wholesalePrice,
        lowStockAlert,
        rackLocation,
        stock: { 'loc-shop': shopStock, 'loc-godown': godownStock },
      });
    }
    setShowAdd(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Name',
      'Category',
      'Brand',
      'Unit',
      'Thickness(mm)',
      'Size',
      'Grade',
      ...(permissions.canViewCostAndProfit ? ['PurchaseCost'] : []),
      'RetailPrice',
      'WholesalePrice',
      'PerSqFt',
      'ShopStock',
      'GodownStock',
      'Rack',
    ];
    const rows = filtered.map((p) => [
      p.sku,
      p.barcode,
      p.name,
      p.category,
      p.brand,
      p.unit,
      p.thicknessMm ?? '',
      p.sizeLabel,
      p.grade,
      ...(permissions.canViewCostAndProfit ? [p.purchaseCost] : []),
      p.retailPrice,
      p.wholesalePrice,
      p.perSqFtPrice,
      p.stock['loc-shop'],
      p.stock['loc-godown'],
      p.rackLocation,
    ]);
    downloadCSV(`ply-woods-products-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    notify('Products exported to CSV');
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        notify('CSV file appears empty', undefined, 'error');
        return;
      }
      const parsed: Parameters<typeof importProductsCSV>[0] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 5) continue;
        parsed.push({
          sku: cols[0] || `CSV-${Date.now()}-${i}`,
          barcode: cols[1] || `89640090${1000 + i}`,
          name: cols[2] || `Imported Board ${i}`,
          category: (CATEGORIES.includes(cols[3] as ProductCategory)
            ? cols[3]
            : 'Commercial Plywood') as ProductCategory,
          brand: cols[4] || 'Generic',
          unit: (['sheet', 'sqft', 'rft', 'piece'].includes(cols[5]) ? cols[5] : 'sheet') as UnitType,
          thicknessMm: Number(cols[6]) || 18,
          sizeLabel: cols[7] || '8x4 ft',
          lengthFt: 8,
          widthFt: 4,
          grade: cols[8] || 'A / Premium',
          finish: 'Standard',
          purchaseCost: Number(cols[9]) || 3000,
          retailPrice: Number(cols[10]) || 3800,
          wholesalePrice: Number(cols[11]) || 3500,
          lowStockAlert: 10,
          rackLocation: 'Rack Z-1',
          stock: { 'loc-shop': Number(cols[12]) || 10, 'loc-godown': Number(cols[13]) || 20 },
        });
      }
      if (parsed.length > 0) importProductsCSV(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const productHistory = useMemo(() => {
    if (!historyProduct) return [];
    return state.stockMovements.filter((m) => m.variantId === historyProduct.id);
  }, [historyProduct, state.stockMovements]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1B2E] dark:text-white">
            Products &amp; Variants
          </h1>
          <p className="text-xs text-[#8B8FA8]">
            Manage plywood, MDF, laminates, thickness × size variants, and retail/wholesale pricing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVUpload}
          />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs">
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </button>
          <button onClick={handleExportCSV} className="btn-secondary text-xs">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          {permissions.canEditPrices && (
            <button onClick={openCreateModal} className="btn-primary text-xs">
              <Plus className="h-4 w-4" /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="concured-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B8FA8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, barcode or brand..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as 'All' | ProductCategory)}
          className="input-field w-52"
        >
          <option value="All">All Categories ({state.products.length})</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="concured-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A] dark:text-[#A3A7C2] font-semibold">
                <th className="px-4 py-3.5">Product / SKU</th>
                <th className="px-4 py-3.5">Category &amp; Brand</th>
                <th className="px-4 py-3.5">Specs</th>
                {permissions.canViewCostAndProfit && (
                  <th className="px-4 py-3.5 text-right">Avg Cost</th>
                )}
                <th className="px-4 py-3.5 text-right">Retail</th>
                <th className="px-4 py-3.5 text-right">Wholesale</th>
                <th className="px-4 py-3.5 text-right">Per Sq Ft</th>
                <th className="px-4 py-3.5 text-center">Shop / Godown</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-[#FAF9FF] dark:hover:bg-[#22253A]/60 transition"
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#1A1B2E] dark:text-white">{p.name}</div>
                    <div className="text-[11px] text-[#8B8FA8]">
                      {p.sku} • {p.barcode} • {p.rackLocation}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-lg bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 px-2 py-0.5 text-[11px] font-semibold text-[#7C5CFC]">
                      {p.category}
                    </span>
                    <div className="text-[11px] text-[#8B8FA8] mt-0.5">{p.brand}</div>
                  </td>
                  <td className="px-4 py-3 text-[#525672] dark:text-[#C5C8DF]">
                    <div>
                      {p.thicknessMm ? `${p.thicknessMm}mm • ` : ''}
                      {p.sizeLabel}
                    </div>
                    <div className="text-[11px] text-[#8B8FA8]">
                      {p.grade} • {p.finish}
                    </div>
                  </td>
                  {permissions.canViewCostAndProfit && (
                    <td className="px-4 py-3 text-right font-semibold text-[#525672] dark:text-[#C5C8DF]">
                      {formatPKR(p.purchaseCost)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right font-bold text-[#1A1B2E] dark:text-white">
                    {formatPKR(p.retailPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#7C5CFC]">
                    {formatPKR(p.wholesalePrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#8B8FA8]">
                    {p.unit === 'sheet' ? `${formatPKR(p.perSqFtPrice)}/ft²` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        p.stock['loc-shop'] <= p.lowStockAlert
                          ? 'bg-red-50 text-[#EF4444] dark:bg-red-950/50'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}
                    >
                      {p.stock['loc-shop']} / {p.stock['loc-godown']}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setHistoryProduct(p)}
                        title="View Product Movement History"
                        className="rounded-lg p-1.5 text-[#7C809B] hover:bg-[#EFEBFD] hover:text-[#7C5CFC]"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      {permissions.canEditPrices && (
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Product"
                          className="rounded-lg p-1.5 text-[#7C809B] hover:bg-[#EFEBFD] hover:text-[#7C5CFC]"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4 my-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[#7C5CFC]" />
                <h3 className="text-lg font-bold text-[#1A1B2E] dark:text-white">
                  {editing ? 'Edit Product Variant' : 'Add New Product Variant'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-[#8B8FA8] hover:text-[#1A1B2E]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#5C607B] mb-1">Product Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lasani UV Glossy MDF 16mm – Arctic Grey (8x4)"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">SKU</label>
                <input required value={sku} onChange={(e) => setSku(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Barcode</label>
                <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="input-field"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Brand</label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Unit of Measure</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                  className="input-field"
                >
                  <option value="sheet">Sheet (sq ft conversion)</option>
                  <option value="sqft">Square Foot (sq ft)</option>
                  <option value="rft">Running Foot (rft)</option>
                  <option value="piece">Piece / Bucket</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Thickness (mm)</label>
                <select
                  value={thicknessMm}
                  onChange={(e) => setThicknessMm(Number(e.target.value))}
                  className="input-field"
                >
                  {[1, 3, 4, 6, 9, 12, 15, 16, 18, 25].map((t) => (
                    <option key={t} value={t}>
                      {t} mm
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Length × Width (ft)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={lengthFt}
                    onChange={(e) => setLengthFt(Number(e.target.value) || 8)}
                    className="input-field"
                    placeholder="Len"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={widthFt}
                    onChange={(e) => setWidthFt(Number(e.target.value) || 4)}
                    className="input-field"
                    placeholder="Wid"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Grade / Finish</label>
                <div className="grid grid-cols-2 gap-2">
                  <input value={grade} onChange={(e) => setGrade(e.target.value)} className="input-field" />
                  <input value={finish} onChange={(e) => setFinish(e.target.value)} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Purchase Cost (Rs.)</label>
                <input
                  type="number"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(Number(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">
                  Retail Price (Rs.) — auto {Math.round(retailPrice / Math.max(1, lengthFt * widthFt))}/ft²
                </label>
                <input
                  type="number"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(Number(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Wholesale Price (Rs.)</label>
                <input
                  type="number"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(Number(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">
                  Low Stock Alert / Rack
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={lowStockAlert}
                    onChange={(e) => setLowStockAlert(Number(e.target.value) || 10)}
                    className="input-field"
                  />
                  <input
                    value={rackLocation}
                    onChange={(e) => setRackLocation(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              {!editing && (
                <>
                  <div>
                    <label className="block font-semibold text-[#5C607B] mb-1">
                      Opening Stock (Main Shop)
                    </label>
                    <input
                      type="number"
                      value={shopStock}
                      onChange={(e) => setShopStock(Number(e.target.value) || 0)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5C607B] mb-1">
                      Opening Stock (Godown)
                    </label>
                    <input
                      type="number"
                      value={godownStock}
                      onChange={(e) => setGodownStock(Number(e.target.value) || 0)}
                      className="input-field"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editing ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Stock History Modal */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                  Stock History — {historyProduct.name}
                </h3>
                <p className="text-xs text-[#8B8FA8]">
                  Current: Shop {historyProduct.stock['loc-shop']} | Godown{' '}
                  {historyProduct.stock['loc-godown']}
                </p>
              </div>
              <button onClick={() => setHistoryProduct(null)} className="text-[#8B8FA8]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
              {productHistory.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#8B8FA8]">
                  No stock movements recorded yet for this item.
                </p>
              ) : (
                productHistory.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold uppercase text-[#7C5CFC] mr-2">{m.type}</span>
                      <span className="text-[#1A1B2E] dark:text-white font-medium">{m.reason}</span>
                      <div className="text-[11px] text-[#8B8FA8]">
                        {formatDateTime(m.createdAt)} • {m.locationId === 'loc-shop' ? 'Main Shop' : 'Godown'} • By {m.createdBy}
                      </div>
                    </div>
                    <span
                      className={`font-extrabold text-sm ${
                        m.quantityDelta > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
