import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';
import { uiText, categoryLabel, statusLabel } from '@/lib/uiText';
import { displayUnit, getStockStatus } from '@/lib/utils';

const CATEGORY_ORDER = ['CYLINDER', 'STEEL', 'PAINT'];
const LIMIT = 8;

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    fetchItems();
  }, [page, search]);

  const fetchItems = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const res = await axios.get('/api/items', {
        params: {
          page,
          limit: LIMIT,
          ...(search ? { search } : {}),
        },
      });
      const data = res.data;
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(typeof data?.total_pages === 'number' ? data.total_pages : 1);
    } catch {
      setFetchError(uiText.dashboard.fetchError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleReset = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  // Group items by category, preserving CATEGORY_ORDER first
  const groupedItems = useMemo(() => {
    return items.reduce((groups: Record<string, any[]>, item) => {
      const cat = String(item.category || 'OTHER');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
      return groups;
    }, {});
  }, [items]);

  const orderedCategories = useMemo(() => {
    const ordered = CATEGORY_ORDER.filter(c => groupedItems[c]?.length > 0);
    const extra = Object.keys(groupedItems).filter(c => !CATEGORY_ORDER.includes(c) && groupedItems[c]?.length > 0);
    return [...ordered, ...extra];
  }, [groupedItems]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">{uiText.dashboard.title}</h2>
        <p className="text-sm text-neutral-500">{uiText.dashboard.desc}</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={uiText.dashboard.searchPlaceholder}
            className="w-full pl-8 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          {uiText.common.search}
        </button>
        {search && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {uiText.common.reset}
          </button>
        )}
      </form>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {fetchError}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-sm text-neutral-500">{uiText.common.loading}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-sm text-neutral-500">
          {fetchError ? uiText.common.noData : uiText.dashboard.noDataDesc}
        </div>
      ) : (
        <div className="space-y-6">
          {orderedCategories.map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2 px-1">
                {categoryLabel[cat] || cat}
              </h3>

              {/* Desktop Table */}
              <div className="hidden md:block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className="bg-neutral-50 dark:bg-neutral-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">{uiText.items.name}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">{uiText.items.stock}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">{uiText.items.unit}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">{uiText.items.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {groupedItems[cat].map(item => (
                      <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-3 py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.name}</td>
                        <td className="px-3 py-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">{item.current_stock}</td>
                        <td className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">{displayUnit(item)}</td>
                        <td className="px-3 py-2">
                          {(() => {
                            const status = (item.category === 'STEEL' || item.category === 'PAINT')
                              ? getStockStatus(item)
                              : item.status;
                            if (!status) return null;
                            const badgeClass = status === 'IN_STOCK' || status === 'normal'
                              ? 'bg-green-100 text-green-700'
                              : status === 'LOW_STOCK'
                                ? 'bg-yellow-100 text-yellow-700'
                                : status === 'OUT_OF_STOCK'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-red-100 text-red-700';
                            return (
                              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${badgeClass}`}>
                                {statusLabel[status] || status}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {groupedItems[cat].map(item => (
                  <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-neutral-800 dark:text-neutral-200">{item.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-500">
                        {uiText.items.stock}: <span className="font-bold text-neutral-800 dark:text-neutral-200">{item.current_stock}</span> {displayUnit(item)}
                      </span>
                      {(() => {
                        const status = (item.category === 'STEEL' || item.category === 'PAINT')
                          ? getStockStatus(item)
                          : item.status;
                        if (!status) return null;
                        const badgeClass = status === 'IN_STOCK' || status === 'normal'
                          ? 'bg-green-100 text-green-700'
                          : status === 'LOW_STOCK'
                            ? 'bg-yellow-100 text-yellow-700'
                            : status === 'OUT_OF_STOCK'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-red-100 text-red-700';
                        return (
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${badgeClass}`}>
                            {statusLabel[status] || status}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-neutral-500">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-neutral-700 dark:text-neutral-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
