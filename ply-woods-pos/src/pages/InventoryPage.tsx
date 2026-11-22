import React, { useState } from 'react';
import {
  ArrowLeftRight,
  SlidersHorizontal,
  Scissors,
  Plus,
  Trash2,
  X,
  Warehouse,
} from 'lucide-react';
import { LocationId } from '../types/pos';
import { usePos } from '../store/PosContext';
import { formatDateTime, formatPKR } from '../utils/format';

export const InventoryPage: React.FC = () => {
  const { state, permissions, transferStock, adjustStock, addOffcut, deleteOffcut } = usePos();
  const [tab, setTab] = useState<'levels' | 'offcuts' | 'movements'>('levels');

  // Transfer Modal
  const [showTransfer, setShowTransfer] = useState(false);
  const [trfProdId, setTrfProdId] = useState(state.products[0]?.id || '');
  const [trfFrom, setTrfFrom] = useState<LocationId>('loc-godown');
  const [trfTo, setTrfTo] = useState<LocationId>('loc-shop');
  const [trfQty, setTrfQty] = useState(10);
  const [trfNote, setTrfNote] = useState('Restock Main Shop racks from Godown');

  // Adjust Modal
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjProdId, setAdjProdId] = useState(state.products[0]?.id || '');
  const [adjLoc, setAdjLoc] = useState<LocationId>('loc-shop');
  const [adjDelta, setAdjDelta] = useState(-1);
  const [adjReason, setAdjReason] = useState('Damaged edge during handling');

  // Add Offcut Modal
  const [showAddOffcut, setShowAddOffcut] = useState(false);
  const [offProdId, setOffProdId] = useState(state.products[0]?.id || '');
  const [offLen, setOffLen] = useState(4);
  const [offWid, setOffWid] = useState(3);
  const [offQty, setOffQty] = useState(1);
  const [offPrice, setOffPrice] = useState(1500);
  const [offNotes, setOffNotes] = useState('Clean leftover piece');

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferStock(trfProdId, trfFrom, trfTo, trfQty, trfNote)) {
      setShowTransfer(false);
    }
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustStock(adjProdId, adjLoc, adjDelta, adjReason)) {
      setShowAdjust(false);
    }
  };

  const handleCreateOffcut = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = state.products.find((p) => p.id === offProdId);
    if (!prod) return;
    addOffcut({
      variantId: prod.id,
      productName: prod.name,
      category: prod.category,
      thicknessMm: prod.thicknessMm,
      locationId: state.activeLocationId,
      lengthFt: offLen,
      widthFt: offWid,
      quantity: offQty,
      discountedPrice: offPrice,
      notes: offNotes,
    });
    setShowAddOffcut(false);
  };

  const totalShopUnits = state.products.reduce((s, p) => s + p.stock['loc-shop'], 0);
  const totalGodownUnits = state.products.reduce((s, p) => s + p.stock['loc-godown'], 0);
  const lowCount = state.products.filter((p) => p.stock['loc-shop'] <= p.lowStockAlert).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1B2E] dark:text-white">
            Inventory, Transfers &amp; Offcuts
          </h1>
          <p className="text-xs text-[#8B8FA8]">
            Main Shop vs I-10 Godown stock levels, remnant offcuts, and immutable stock movement ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowTransfer(true)} className="btn-primary text-xs">
            <ArrowLeftRight className="h-4 w-4" /> Transfer Stock
          </button>
          {permissions.canAdjustStock && (
            <button onClick={() => setShowAdjust(true)} className="btn-secondary text-xs">
              <SlidersHorizontal className="h-4 w-4" /> Stock Adjustment
            </button>
          )}
          <button onClick={() => setShowAddOffcut(true)} className="btn-secondary text-xs">
            <Scissors className="h-4 w-4 text-[#7C5CFC]" /> Add Offcut
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">Main Shop Stock</div>
          <div className="text-2xl font-extrabold text-[#1A1B2E] dark:text-white mt-1">
            {totalShopUnits.toLocaleString()} <span className="text-xs font-medium text-[#8B8FA8]">units</span>
          </div>
        </div>
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">Godown Warehouse Stock</div>
          <div className="text-2xl font-extrabold text-[#7C5CFC] mt-1">
            {totalGodownUnits.toLocaleString()} <span className="text-xs font-medium text-[#8B8FA8]">units</span>
          </div>
        </div>
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">Low Stock SKUs (Shop)</div>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">{lowCount}</div>
        </div>
        <div className="concured-kpi-tile p-4">
          <div className="text-xs text-[#8B8FA8]">Offcut / Remnant Pieces</div>
          <div className="text-2xl font-extrabold text-[#3CD2F0] mt-1">
            {state.offcuts.reduce((s, o) => s + o.quantity, 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-full bg-[#F3F4FA] dark:bg-[#22253A] p-1 text-xs font-semibold">
        <button
          onClick={() => setTab('levels')}
          className={`rounded-full px-4 py-1.5 transition ${
            tab === 'levels' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A] dark:text-[#A3A7C2]'
          }`}
        >
          Stock by Location
        </button>
        <button
          onClick={() => setTab('offcuts')}
          className={`rounded-full px-4 py-1.5 transition ${
            tab === 'offcuts' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A] dark:text-[#A3A7C2]'
          }`}
        >
          Offcuts / Remnants ({state.offcuts.length})
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`rounded-full px-4 py-1.5 transition ${
            tab === 'movements' ? 'bg-[#7C5CFC] text-white' : 'text-[#6B708A] dark:text-[#A3A7C2]'
          }`}
        >
          Movement Ledger ({state.stockMovements.length})
        </button>
      </div>

      {/* Tab 1: Location Stock */}
      {tab === 'levels' && (
        <div className="concured-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A] font-semibold">
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Rack</th>
                  <th className="px-4 py-3.5 text-center">Main Shop</th>
                  <th className="px-4 py-3.5 text-center">I-10 Godown</th>
                  <th className="px-4 py-3.5 text-center">Total Stock</th>
                  <th className="px-4 py-3.5 text-center">Alert Min</th>
                  {permissions.canViewCostAndProfit && (
                    <th className="px-4 py-3.5 text-right">Stock Valuation</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                {state.products.map((p) => {
                  const total = p.stock['loc-shop'] + p.stock['loc-godown'];
                  const low = p.stock['loc-shop'] <= p.lowStockAlert;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAF9FF] dark:hover:bg-[#22253A]/60">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#1A1B2E] dark:text-white">{p.name}</div>
                        <div className="text-[11px] text-[#8B8FA8]">{p.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-[#6B708A]">{p.rackLocation}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-bold ${
                            low
                              ? 'bg-red-50 text-[#EF4444]'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          }`}
                        >
                          {p.stock['loc-shop']}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[#7C5CFC]">
                        {p.stock['loc-godown']}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-[#1A1B2E] dark:text-white">
                        {total} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-center text-[#8B8FA8]">{p.lowStockAlert}</td>
                      {permissions.canViewCostAndProfit && (
                        <td className="px-4 py-3 text-right font-bold text-[#1A1B2E] dark:text-white">
                          {formatPKR(total * p.purchaseCost)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Offcuts / Remnants */}
      {tab === 'offcuts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.offcuts.map((o) => (
            <div key={o.id} className="concured-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-lg bg-cyan-50 dark:bg-cyan-950/50 px-2.5 py-0.5 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                    {o.lengthFt} × {o.widthFt} ft ({o.areaSqFt} sq ft)
                  </span>
                  <span className="text-[11px] font-semibold text-[#8B8FA8]">
                    {o.locationId === 'loc-shop' ? 'Main Shop' : 'Godown'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#1A1B2E] dark:text-white">
                  {o.productName}
                </h4>
                <p className="text-xs text-[#8B8FA8] mt-1">
                  {o.notes || 'Remnant stock'}
                  {o.sourceInvoiceNo ? ` • Source: ${o.sourceInvoiceNo}` : ''}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#F1F2F8] dark:border-[#2A2D45] flex items-center justify-between">
                <div>
                  <div className="text-base font-extrabold text-[#7C5CFC]">
                    {formatPKR(o.discountedPrice)}
                  </div>
                  <div className="text-[11px] text-[#8B8FA8]">Qty available: {o.quantity}</div>
                </div>
                {permissions.canAdjustStock && (
                  <button
                    onClick={() => deleteOffcut(o.id)}
                    className="rounded-lg p-2 text-[#EF4444] hover:bg-red-50"
                    title="Remove offcut"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Stock Movements Ledger */}
      {tab === 'movements' && (
        <div className="concured-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F4FD] dark:bg-[#22253A] text-[#6B708A] font-semibold">
                  <th className="px-4 py-3.5">Date / Time</th>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5 text-right">Qty Delta</th>
                  <th className="px-4 py-3.5">Reason / Ref</th>
                  <th className="px-4 py-3.5">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                {state.stockMovements.slice(0, 60).map((m) => (
                  <tr key={m.id} className="hover:bg-[#FAF9FF] dark:hover:bg-[#22253A]/60">
                    <td className="px-4 py-3 whitespace-nowrap text-[#8B8FA8]">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1A1B2E] dark:text-white">
                      {m.variantName}
                    </td>
                    <td className="px-4 py-3">
                      {m.locationId === 'loc-shop' ? 'Main Shop' : 'Godown'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 px-2 py-0.5 text-[10.5px] font-bold uppercase text-[#7C5CFC]">
                        {m.type}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-extrabold ${
                        m.quantityDelta > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </td>
                    <td className="px-4 py-3 text-[#525672] dark:text-[#C5C8DF]">{m.reason}</td>
                    <td className="px-4 py-3 text-[#8B8FA8]">{m.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Stock Transfer */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleTransfer}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-[#7C5CFC]" /> Transfer Stock (Shop ↔ Godown)
              </h3>
              <button type="button" onClick={() => setShowTransfer(false)} className="text-[#8B8FA8]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Product</label>
                <select
                  value={trfProdId}
                  onChange={(e) => setTrfProdId(e.target.value)}
                  className="input-field"
                >
                  {state.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Shop: {p.stock['loc-shop']} | Godown: {p.stock['loc-godown']})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5C607B] mb-1">From</label>
                  <select
                    value={trfFrom}
                    onChange={(e) => {
                      const v = e.target.value as LocationId;
                      setTrfFrom(v);
                      setTrfTo(v === 'loc-godown' ? 'loc-shop' : 'loc-godown');
                    }}
                    className="input-field"
                  >
                    <option value="loc-godown">I-10 Godown</option>
                    <option value="loc-shop">Main Shop</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#5C607B] mb-1">To</label>
                  <select
                    value={trfTo}
                    onChange={(e) => setTrfTo(e.target.value as LocationId)}
                    className="input-field"
                  >
                    <option value="loc-shop">Main Shop</option>
                    <option value="loc-godown">I-10 Godown</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={trfQty}
                  onChange={(e) => setTrfQty(Math.max(1, Number(e.target.value) || 1))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Notes</label>
                <input
                  value={trfNote}
                  onChange={(e) => setTrfNote(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowTransfer(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Transfer Now
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Stock Adjustment */}
      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAdjust}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                Stock Adjustment (Audit Logged)
              </h3>
              <button type="button" onClick={() => setShowAdjust(false)} className="text-[#8B8FA8]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <select
                value={adjProdId}
                onChange={(e) => setAdjProdId(e.target.value)}
                className="input-field"
              >
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Shop: {p.stock['loc-shop']} | Godown: {p.stock['loc-godown']})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={adjLoc}
                  onChange={(e) => setAdjLoc(e.target.value as LocationId)}
                  className="input-field"
                >
                  <option value="loc-shop">Main Shop</option>
                  <option value="loc-godown">I-10 Godown</option>
                </select>
                <input
                  type="number"
                  value={adjDelta}
                  onChange={(e) => setAdjDelta(Number(e.target.value) || 0)}
                  placeholder="+ or - qty"
                  className="input-field"
                />
              </div>
              <input
                required
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Reason (damage, count correction, theft...)"
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdjust(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Record Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Offcut */}
      {showAddOffcut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateOffcut}
            className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                Add Offcut / Remnant Piece
              </h3>
              <button
                type="button"
                onClick={() => setShowAddOffcut(false)}
                className="text-[#8B8FA8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <select
                value={offProdId}
                onChange={(e) => setOffProdId(e.target.value)}
                className="input-field"
              >
                {state.products
                  .filter((p) => p.unit === 'sheet')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#8B8FA8] mb-1">Length (ft)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={offLen}
                    onChange={(e) => setOffLen(Number(e.target.value) || 1)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[#8B8FA8] mb-1">Width (ft)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={offWid}
                    onChange={(e) => setOffWid(Number(e.target.value) || 1)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[#8B8FA8] mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={offQty}
                    onChange={(e) => setOffQty(Math.max(1, Number(e.target.value) || 1))}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#8B8FA8] mb-1">Discounted Price per piece (Rs.)</label>
                <input
                  type="number"
                  value={offPrice}
                  onChange={(e) => setOffPrice(Number(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <input
                value={offNotes}
                onChange={(e) => setOffNotes(e.target.value)}
                placeholder="Notes"
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddOffcut(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <Plus className="h-4 w-4" /> Save Offcut
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
