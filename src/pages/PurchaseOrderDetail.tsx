import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface POItem {
  id: number;
  item_id: string;
  item_name: string;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier: string;
  notes: string;
  status: string;
  created_at: string;
  items: POItem[];
}

const statusBadgeClass: Record<string, string> = {
  OPEN: 'bg-neutral-100 text-neutral-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  VALIDATED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-blue-100 text-blue-700',
};

const inputClass =
  'w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50';

const buttonPrimaryClass = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50';

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiveQty, setReceiveQty] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPO = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal memuat purchase order');
      const data = await res.json();
      setPo(data);
      setReceiveQty({});
    } catch (err: any) {
      setError(err.message || 'Gagal memuat purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPO();
  }, [id]);

  const handleReceive = async () => {
    setError('');
    setSuccessMsg('');
    const items = Object.entries(receiveQty)
      .filter(([, qty]) => qty > 0)
      .map(([poItemId, quantity]) => ({ po_item_id: Number(poItemId), quantity }));

    if (items.length === 0) {
      setError('Masukkan minimal satu kuantitas untuk diterima.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memvalidasi penerimaan');
      }
      setSuccessMsg('Barang berhasil diterima.');
      await fetchPO();
    } catch (err: any) {
      setError(err.message || 'Gagal memvalidasi penerimaan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
        Memuat...
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error || 'Purchase order tidak ditemukan.'}
        </div>
        <Link
          to="/purchase-orders"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>
      </div>
    );
  }

  const canReceive = po.status === 'OPEN' || po.status === 'PARTIAL';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/purchase-orders"
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Detail Purchase Order</h2>
            <p className="text-sm text-neutral-500">{po.po_number}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">{successMsg}</div>
      )}

      {/* PO Info Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">No. PO</p>
            <p className="font-medium text-sm text-neutral-800 dark:text-neutral-200">{po.po_number}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Supplier</p>
            <p className="font-medium text-sm text-neutral-800 dark:text-neutral-200">{po.supplier || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Status</p>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusBadgeClass[po.status] || 'bg-neutral-100 text-neutral-600'}`}>
              {po.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Tanggal</p>
            <p className="font-medium text-sm text-neutral-800 dark:text-neutral-200">{new Date(po.created_at).toLocaleDateString('id-ID')}</p>
          </div>
        </div>
        {po.notes && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-xs text-neutral-500 mb-0.5">Catatan</p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{po.notes}</p>
          </div>
        )}
      </div>

      {/* Desktop Items Table */}
      <div className="hidden md:block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Daftar Item</h3>
        </div>
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Nama Item</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Dipesan</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Diterima</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Sisa</th>
              {canReceive && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 w-36">Terima Sekarang</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {po.items.map((item) => (
              <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td className="px-3 py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.item_name}</td>
                <td className="px-3 py-2 text-sm text-right text-neutral-600 dark:text-neutral-400">{item.ordered_quantity}</td>
                <td className="px-3 py-2 text-sm text-right text-neutral-600 dark:text-neutral-400">{item.received_quantity}</td>
                <td className="px-3 py-2 text-sm font-bold text-right text-neutral-800 dark:text-neutral-200">{item.remaining_quantity}</td>
                {canReceive && (
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={item.remaining_quantity}
                      value={receiveQty[item.id] ?? ''}
                      onChange={(e) => {
                        const value = Math.min(
                          Number(e.target.value),
                          item.remaining_quantity
                        );

                        setReceiveQty(prev => ({
                          ...prev,
                          [item.id]: value
                        }));
                      }}
                      placeholder="0"
                      disabled={item.remaining_quantity <= 0}
                      className={inputClass}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Items Cards */}
      <div className="md:hidden space-y-2">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Daftar Item</h3>
        {po.items.map((item) => (
          <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 space-y-2">
            <div className="font-medium text-sm text-neutral-800 dark:text-neutral-200">{item.item_name}</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-neutral-500">Dipesan</p>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">{item.ordered_quantity}</p>
              </div>
              <div>
                <p className="text-neutral-500">Diterima</p>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">{item.received_quantity}</p>
              </div>
              <div>
                <p className="text-neutral-500">Sisa</p>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">{item.remaining_quantity}</p>
              </div>
            </div>
            {canReceive && item.remaining_quantity > 0 && (
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Terima Sekarang</label>
                <input
                  type="number"
                  min={0}
                  max={item.remaining_quantity}
                  value={receiveQty[item.id] ?? ''}
                  onChange={(e) => {
                    const value = Math.min(
                      Number(e.target.value),
                      item.remaining_quantity
                    );

                    setReceiveQty(prev => ({
                      ...prev,
                      [item.id]: value
                    }));
                  }}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {canReceive && (
        <div className="flex justify-end">
          <button
            onClick={handleReceive}
            disabled={isSubmitting}
            className={buttonPrimaryClass}
          >
            {isSubmitting ? 'Memvalidasi...' : 'Validasi Penerimaan'}
          </button>
        </div>
      )}
    </div>
  );
}
