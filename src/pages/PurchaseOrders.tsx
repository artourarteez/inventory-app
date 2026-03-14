import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier: string;
  status: string;
  created_at: string;
}

const statusBadgeClass: Record<string, string> = {
  OPEN: 'bg-neutral-100 text-neutral-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  VALIDATED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-blue-100 text-blue-700',
};

const secondaryBtn =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/purchase-orders', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch purchase orders');
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Purchase Orders</h2>
          <p className="text-sm text-neutral-500">Kelola purchase order dan penerimaan barang</p>
        </div>
        <Link
          to="/purchase-orders/create"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Purchase Order
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">No. PO</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Supplier</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Tanggal</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-neutral-500">Memuat...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-neutral-500">Belum ada purchase order.</td>
              </tr>
            ) : (
              orders.map((po) => (
                <tr key={po.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-3 py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">{po.po_number}</td>
                  <td className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">{po.supplier || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusBadgeClass[po.status] || 'bg-neutral-100 text-neutral-600'}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-neutral-500">{new Date(po.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="px-3 py-2">
                    <Link to={`/purchase-orders/${po.id}`} className={secondaryBtn + ' text-xs px-3 py-1.5'}>
                      Lihat
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-neutral-500">Memuat...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-sm text-neutral-500">Belum ada purchase order.</div>
        ) : (
          orders.map((po) => (
            <div key={po.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm text-neutral-800 dark:text-neutral-200 truncate min-w-0">{po.po_number}</span>
                <span className={`shrink-0 inline-block px-2 py-0.5 text-xs font-medium rounded ${statusBadgeClass[po.status] || 'bg-neutral-100 text-neutral-600'}`}>
                  {po.status}
                </span>
              </div>
              <div className="text-sm text-neutral-500">Supplier: {po.supplier || '-'}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">{new Date(po.created_at).toLocaleDateString('id-ID')}</span>
                <Link to={`/purchase-orders/${po.id}`} className={secondaryBtn + ' text-xs px-3 py-1.5'}>
                  Lihat
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
