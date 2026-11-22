import React, { useState } from 'react';
import { Plus, PackageCheck, Trash2, X, ClipboardList } from 'lucide-react';
import { LocationId, PurchaseOrder } from '../types/pos';
import { usePos } from '../store/PosContext';
import { formatDate, formatPKR } from '../utils/format';

export const PurchasesPage: React.FC = () => {
  const { state, permissions, createPurchaseOrder, receivePurchaseGRN } = usePos();
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [grnPO, setGrnPO] = useState<PurchaseOrder | null>(null);

  // Create PO form
  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id || '');
  const [locationId, setLocationId] = useState<LocationId>('loc-godown');
  const [freightCost, setFreightCost] = useState(12000);
  const [unloadingCost, setUnloadingCost] = useState(3000);
  const [poRows, setPoRows] = useState<
    { variantId: string; orderedQty: number; unitCost: number }[]
  >([
    {
      variantId: state.products[0]?.id || '',
      orderedQty: 30,
      unitCost: state.products[0]?.purchaseCost || 4000,
    },
  ]);

  // GRN receiving state
  const [grnQtys, setGrnQtys] = useState<Record<string, number>>({});
  const [grnLandedExtra, setGrnLandedExtra] = useState(0);

  const openGrnModal = (po: PurchaseOrder) => {
    setGrnPO(po);
    const init: Record<string, number> = {};
    po.items.forEach((it) => {
      init[it.variantId] = Math.max(0, it.orderedQty - it.receivedQty);
    });
    setGrnQtys(init);
    setGrnLandedExtra(po.grnHistory.length === 0 ? po.freightCost + po.unloadingCost : 0);
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = poRows.filter((r) => r.variantId && r.orderedQty > 0);
    if (valid.length === 0) return;
    createPurchaseOrder({
      supplierId,
      locationId,
      items: valid,
      freightCost,
      unloadingCost,
    });
    setShowCreatePO(false);
  };

  const handleReceiveGRN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnPO) return;
    const received = Object.entries(grnQtys)
      .map(([variantId, qty]) => ({ variantId, qty: Number(qty) || 0 }))
      .filter((x) => x.qty > 0);
    if (received.length === 0) return;
    receivePurchaseGRN(grnPO.id, received, grnLandedExtra);
    setGrnPO(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1B2E] dark:text-white">
            Purchase Orders &amp; GRN Receiving
          </h1>
          <p className="text-xs text-[#8B8FA8]">
            PO → Partial/Full Goods Received (GRN) with landed freight cost &amp; weighted-average cost updates
          </p>
        </div>
        {permissions.canManagePurchases && (
          <button onClick={() => setShowCreatePO(true)} className="btn-primary text-xs">
            <Plus className="h-4 w-4" /> New Purchase Order
          </button>
        )}
      </div>

      {/* PO Cards */}
      <div className="space-y-4">
        {state.purchases.map((po) => {
          const pendingUnits = po.items.reduce(
            (s, i) => s + Math.max(0, i.orderedQty - i.receivedQty),
            0
          );
          return (
            <div key={po.id} className="concured-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFEBFD] dark:bg-[#7C5CFC]/20 text-[#7C5CFC]">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-[#1A1B2E] dark:text-white">
                        {po.poNo}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase ${
                          po.status === 'received'
                            ? 'bg-emerald-50 text-emerald-700'
                            : po.status === 'partial'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-[#EFEBFD] text-[#7C5CFC]'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#8B8FA8]">
                      {po.supplierName} • Destination:{' '}
                      <strong>{po.locationId === 'loc-godown' ? 'I-10 Godown' : 'Main Shop'}</strong>{' '}
                      • {formatDate(po.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {permissions.canViewCostAndProfit && (
                    <div className="text-right">
                      <div className="text-base font-extrabold text-[#1A1B2E] dark:text-white">
                        {formatPKR(po.grandTotal)}
                      </div>
                      <div className="text-[11px] text-[#8B8FA8]">
                        Freight+Unload: {formatPKR(po.freightCost + po.unloadingCost)}
                      </div>
                    </div>
                  )}
                  {permissions.canManagePurchases && pendingUnits > 0 && (
                    <button
                      onClick={() => openGrnModal(po)}
                      className="btn-primary py-2 px-3.5 text-xs"
                    >
                      <PackageCheck className="h-4 w-4" /> Receive GRN ({pendingUnits} left)
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#F1F2F8] dark:border-[#2A2D45]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F7F8FC] dark:bg-[#22253A] text-[#8B8FA8]">
                      <th className="px-3.5 py-2">Product</th>
                      <th className="px-3.5 py-2 text-center">Ordered</th>
                      <th className="px-3.5 py-2 text-center">Received</th>
                      {permissions.canViewCostAndProfit && (
                        <>
                          <th className="px-3.5 py-2 text-right">Unit Cost</th>
                          <th className="px-3.5 py-2 text-right">Line Total</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F2F8] dark:divide-[#2A2D45]">
                    {po.items.map((it) => (
                      <tr key={it.variantId}>
                        <td className="px-3.5 py-2 font-semibold text-[#1A1B2E] dark:text-white">
                          {it.variantName}
                        </td>
                        <td className="px-3.5 py-2 text-center">{it.orderedQty}</td>
                        <td className="px-3.5 py-2 text-center font-bold text-[#7C5CFC]">
                          {it.receivedQty}
                        </td>
                        {permissions.canViewCostAndProfit && (
                          <>
                            <td className="px-3.5 py-2 text-right">{formatPKR(it.unitCost)}</td>
                            <td className="px-3.5 py-2 text-right font-semibold">
                              {formatPKR(it.orderedQty * it.unitCost)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {po.grnHistory.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {po.grnHistory.map((g) => (
                    <span
                      key={g.grnNo}
                      className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-emerald-700 dark:text-emerald-300 font-medium"
                    >
                      {g.grnNo} ({formatDate(g.receivedAt)}):{' '}
                      {g.items.reduce((s, x) => s + x.qty, 0)} units received by {g.receivedBy}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Create PO */}
      {showCreatePO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleCreatePO}
            className="w-full max-w-2xl rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4 my-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                Create Purchase Order
              </h3>
              <button
                type="button"
                onClick={() => setShowCreatePO(false)}
                className="text-[#8B8FA8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="input-field"
                >
                  {state.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">Receive Into</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value as LocationId)}
                  className="input-field"
                >
                  <option value="loc-godown">I-10 Godown</option>
                  <option value="loc-shop">Main Shop</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {poRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <select
                    value={row.variantId}
                    onChange={(e) => {
                      const prod = state.products.find((p) => p.id === e.target.value);
                      setPoRows((prev) =>
                        prev.map((r, i) =>
                          i === idx
                            ? {
                                ...r,
                                variantId: e.target.value,
                                unitCost: prod?.purchaseCost || r.unitCost,
                              }
                            : r
                        )
                      );
                    }}
                    className="input-field col-span-6"
                  >
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={row.orderedQty}
                    onChange={(e) =>
                      setPoRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, orderedQty: Number(e.target.value) || 1 } : r
                        )
                      )
                    }
                    className="input-field col-span-2"
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    min={0}
                    value={row.unitCost}
                    onChange={(e) =>
                      setPoRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, unitCost: Number(e.target.value) || 0 } : r
                        )
                      )
                    }
                    className="input-field col-span-3"
                    placeholder="Cost"
                  />
                  <button
                    type="button"
                    onClick={() => setPoRows((p) => p.filter((_, i) => i !== idx))}
                    className="col-span-1 text-[#EF4444] flex justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setPoRows((p) => [
                    ...p,
                    {
                      variantId: state.products[1]?.id || state.products[0].id,
                      orderedQty: 20,
                      unitCost: state.products[1]?.purchaseCost || 3000,
                    },
                  ])
                }
                className="text-xs font-semibold text-[#7C5CFC] hover:underline"
              >
                + Add Line Item
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">
                  Freight / Truck Cost (Rs.)
                </label>
                <input
                  type="number"
                  value={freightCost}
                  onChange={(e) => setFreightCost(Number(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">
                  Unloading Labour Cost (Rs.)
                </label>
                <input
                  type="number"
                  value={unloadingCost}
                  onChange={(e) => setUnloadingCost(Number(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreatePO(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Purchase Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Receive GRN (Partial or Full) */}
      {grnPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12131F]/55 backdrop-blur-sm p-4">
          <form
            onSubmit={handleReceiveGRN}
            className="w-full max-w-lg rounded-[24px] bg-white dark:bg-[#1B1D2E] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1B2E] dark:text-white">
                  Receive Goods (GRN) — {grnPO.poNo}
                </h3>
                <p className="text-xs text-[#8B8FA8]">
                  Supports partial receiving. Updates stock &amp; weighted-average cost automatically.
                </p>
              </div>
              <button type="button" onClick={() => setGrnPO(null)} className="text-[#8B8FA8]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {grnPO.items.map((it) => {
                const remaining = Math.max(0, it.orderedQty - it.receivedQty);
                return (
                  <div
                    key={it.variantId}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F8FC] dark:bg-[#22253A] p-3"
                  >
                    <div>
                      <div className="font-bold text-[#1A1B2E] dark:text-white">
                        {it.variantName}
                      </div>
                      <div className="text-[11px] text-[#8B8FA8]">
                        Ordered: {it.orderedQty} • Already received: {it.receivedQty} • Remaining:{' '}
                        <strong>{remaining}</strong>
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={remaining}
                      value={grnQtys[it.variantId] ?? 0}
                      onChange={(e) =>
                        setGrnQtys((prev) => ({
                          ...prev,
                          [it.variantId]: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="input-field w-24 text-center font-bold"
                    />
                  </div>
                );
              })}

              <div>
                <label className="block font-semibold text-[#5C607B] mb-1">
                  Landed Freight / Unloading Cost to Allocate (Rs.)
                </label>
                <input
                  type="number"
                  min={0}
                  value={grnLandedExtra}
                  onChange={(e) => setGrnLandedExtra(Number(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setGrnPO(null)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Confirm GRN &amp; Update Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
