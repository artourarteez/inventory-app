import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { displayUnit, getStockStatus } from '@/lib/utils';

interface StockItem {
  name: string;
  category: string;
  current_stock: number;
  stock_unit: string;
  volume_per_can: number | null;
}

const CATEGORY_ORDER = ['STEEL', 'CYLINDER', 'PAINT'];

const CATEGORY_LABELS: Record<string, string> = {
  STEEL: 'BESI',
  CYLINDER: 'TABUNG',
  PAINT: 'CAT',
};

const CATEGORY_COLORS: Record<string, { bg: string; darkBg: string; border: string; darkBorder: string; badge: string }> = {
  STEEL: { bg: 'bg-slate-50', darkBg: 'dark:bg-slate-900/40', border: 'border-slate-200', darkBorder: 'dark:border-slate-700', badge: 'bg-slate-700 text-white' },
  CYLINDER: { bg: 'bg-sky-50', darkBg: 'dark:bg-sky-900/30', border: 'border-sky-200', darkBorder: 'dark:border-sky-800', badge: 'bg-sky-700 text-white' },
  PAINT: { bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/30', border: 'border-amber-200', darkBorder: 'dark:border-amber-800', badge: 'bg-amber-700 text-white' },
};

function stockRowClasses(status: string): { row: string; name: string; number: string } {
  switch (status) {
    case 'OUT_OF_STOCK':
      return {
        row: 'bg-red-50 dark:bg-red-900/30',
        name: 'text-red-700 dark:text-red-400',
        number: 'text-red-600 dark:text-red-400',
      };
    case 'LOW_STOCK':
      return {
        row: 'bg-yellow-100 dark:bg-yellow-900/30',
        name: 'text-yellow-800 dark:text-yellow-300',
        number: 'text-yellow-700 dark:text-yellow-300',
      };
    default:
      return {
        row: '',
        name: 'text-neutral-800 dark:text-neutral-200',
        number: 'text-neutral-900 dark:text-neutral-100',
      };
  }
}

export default function LiveStock() {
  const { token } = useParams<{ token: string }>();
  const [items, setItems] = useState<StockItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [changedItems, setChangedItems] = useState<Record<string, boolean>>({});
  const prevItemsRef = useRef<Map<string, number>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const fetchStock = useCallback(async () => {
    if (!token) { setForbidden(true); setLoading(false); return; }
    try {
      const res = await fetch(`/api/public-stock/${encodeURIComponent(token)}`);
      if (res.status === 403) { setForbidden(true); setLoading(false); return; }
      if (!res.ok) throw new Error('fetch failed');
      const data: StockItem[] = await res.json();

      // Detect stock changes
      const prev = prevItemsRef.current;
      if (prev.size > 0) {
        const newChanged: Record<string, boolean> = {};
        for (const item of data) {
          const prevStock = prev.get(item.name);
          if (prevStock !== undefined && prevStock !== item.current_stock) {
            newChanged[item.name] = true;
          }
        }
        if (Object.keys(newChanged).length > 0) {
          setChangedItems((c) => ({ ...c, ...newChanged }));
          for (const name of Object.keys(newChanged)) {
            const existing = timersRef.current.get(name);
            if (existing) clearTimeout(existing);
            const timer = setTimeout(() => {
              setChangedItems((c) => {
                const next = { ...c };
                delete next[name];
                return next;
              });
              timersRef.current.delete(name);
            }, 2000);
            timersRef.current.set(name, timer);
          }
        }
      }

      // Update previous snapshot
      const newMap = new Map<string, number>();
      for (const item of data) newMap.set(item.name, item.current_stock);
      prevItemsRef.current = newMap;

      setItems(data);
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to fetch stock:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Live Stock';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    fetchStock();
    const interval = setInterval(fetchStock, 5000);
    return () => clearInterval(interval);
  }, [fetchStock]);

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  if (forbidden) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">Akses tidak diizinkan.</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">Token tidak valid atau tidak diberikan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Live Stock</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">PT NDS Inventory - Developed By Rama</p>
          {lastUpdated && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              Terakhir diperbarui: {lastUpdated}
            </p>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-neutral-500 dark:text-neutral-400 animate-pulse">Memuat data stok...</div>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Tidak ada data stok</p>
          </div>
        ) : (
          grouped.map(({ category, items: catItems }) => {
            const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.STEEL;
            const label = CATEGORY_LABELS[category] || category;
            return (
              <div
                key={category}
                className={`rounded-lg border ${colors.border} ${colors.darkBorder} shadow-sm overflow-hidden`}
              >
                {/* Category Header */}
                <div className={`${colors.bg} ${colors.darkBg} px-4 py-2.5 border-b ${colors.border} ${colors.darkBorder}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                    {label}
                  </span>
                </div>

                {/* Items */}
                <div className="bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {catItems.map((item, idx) => {
                    const status = getStockStatus(item);
                    const cls = stockRowClasses(status);
                    const unit = displayUnit(item);
                    const isChanged = changedItems[item.name];
                    const highlightCls = isChanged
                      ? 'bg-green-50 dark:bg-green-900/20 animate-pulse'
                      : cls.row;
                    return (
                      <div
                        key={`${item.name}-${idx}`}
                        className={`flex items-center justify-between px-4 py-3 transition-colors duration-300 ${highlightCls}`}
                      >
                        <div className="flex flex-col min-w-0 pr-3">
                          <span className={`text-sm ${isChanged ? 'text-green-800 dark:text-green-300' : cls.name} truncate`}>
                            {item.name}
                          </span>
                          {status === 'LOW_STOCK' && !isChanged && (
                            <span className="mt-0.5 inline-flex w-fit text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200">
                              ⚠ Stok Rendah
                            </span>
                          )}
                        </div>
                        <span className="whitespace-nowrap text-right">
                          <span className={`text-lg font-bold ${isChanged ? 'text-green-700 dark:text-green-300' : cls.number}`}>
                            {item.current_stock}
                          </span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">
                            {unit}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* System Notice */}
        {!loading && grouped.length > 0 && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            <span className="font-semibold text-neutral-600 dark:text-neutral-300">⚠ Catatan Sistem</span>
            <p className="mt-1">
              Selisih data mungkin terjadi. Petugas diharapkan melakukan stok opname rutin untuk validasi data sistem.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
