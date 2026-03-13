import { FileDown, ArrowLeft, Search, X, Filter } from 'lucide-react';
import { uiText, categoryLabel, txTypeLabel } from '@/lib/uiText';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const fieldClass = 'w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:ring-2 focus:ring-blue-500';
const selectClass = 'appearance-none w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300';
const buttonPrimaryClass = 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const buttonOutlineClass = 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium border rounded-lg border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto pt-20" onClick={onClose}>
      <div
        className="w-full max-w-lg my-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
          <button type="button" onClick={onClose} title="Close filter" aria-label="Close filter" className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Reports() {
  const [view, setView] = useState<'menu' | 'txHistory' | 'paintUsage' | 'steelUsage'>('menu');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [itemId, setItemId] = useState('all');
  const [category, setCategory] = useState('all');
  const [txType, setTxType] = useState('all');
  const [shipName, setShipName] = useState('all');
  const [steelShipName, setSteelShipName] = useState('all');
  const [contractorName, setContractorName] = useState('all');

  const [transactions, setTransactions] = useState<any[]>([]);
  const [paintUsage, setPaintUsage] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [ships, setShips] = useState<string[]>([]);
  const [steelShips, setSteelShips] = useState<string[]>([]);
  const [contractors, setContractors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');
  const [steelFilterApplied, setSteelFilterApplied] = useState(false);

  const [steelUsage, setSteelUsage] = useState<any[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    setExportError('');
    setExportSuccess('');
    if (view === 'txHistory') {
      fetchItems();
      fetchTransactions();
    } else if (view === 'paintUsage') {
      fetchPaintUsage();
      fetchShips();
    } else if (view === 'steelUsage') {
      fetchSteelFilterOptions();
      fetchSteelUsage();
    }
  }, [view]);

  const fetchItems = async () => {
    try {
      const res = await axios.get('/api/items');
      setItems(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchShips = async () => {
    try {
      const res = await axios.get('/api/transactions?report_type=paint_usage');
      const uniqueShips = Array.from(new Set(res.data.map((item: any) => item.ship_name))) as string[];
      setShips(uniqueShips.filter(Boolean).sort());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (itemId && itemId !== 'all') params.append('item_id', itemId);
      if (category && category !== 'all') params.append('category', category);
      if (txType && txType !== 'all') params.append('transaction_type', txType);

      const res = await axios.get(`/api/transactions?${params.toString()}`);
      setTransactions(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaintUsage = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('report_type', 'paint_usage');
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (shipName && shipName !== 'all') params.append('ship_name', shipName);

      const res = await axios.get(`/api/transactions?${params.toString()}`);
      setPaintUsage(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSteelUsage = async () => {
    setIsLoading(true);
    setSteelFilterApplied(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (steelShipName && steelShipName !== 'all') params.append('ship_name', steelShipName);
      if (contractorName && contractorName !== 'all') params.append('contractor_name', contractorName);

      const res = await axios.get(`/api/reports/steel-usage-json?${params.toString()}`);
      setSteelUsage(res.data);
    } catch (err) {
      console.error(err);
      setSteelUsage([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSteelFilterOptions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('category', 'STEEL');
      params.append('transaction_type', 'OUT');
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await axios.get(`/api/transactions?${params.toString()}`);
      const shipSet = new Set<string>();
      const contractorSet = new Set<string>();

      res.data.forEach((tx: any) => {
        if (tx.ship_name) shipSet.add(tx.ship_name);
        if (tx.user_name) contractorSet.add(tx.user_name);
      });

      setSteelShips(Array.from(shipSet).sort());
      setContractors(Array.from(contractorSet).sort());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (view === 'txHistory') await fetchTransactions();
      if (view === 'paintUsage') await fetchPaintUsage();
      if (view === 'steelUsage') await fetchSteelUsage();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setItemId('all');
    setCategory('all');
    setTxType('all');
    setShipName('all');
    setSteelShipName('all');
    setContractorName('all');
    setSteelShips([]);
    setContractors([]);
    setSteelFilterApplied(false);
    setExportError('');
    setExportSuccess('');
    setIsLoading(true);
    if (view === 'txHistory') {
      axios.get('/api/transactions').then(res => {
        setTransactions(res.data);
        setIsLoading(false);
      });
    } else if (view === 'paintUsage') {
      axios.get('/api/transactions?report_type=paint_usage').then(res => {
        setPaintUsage(res.data);
        setIsLoading(false);
      });
    } else if (view === 'steelUsage') {
      fetchSteelFilterOptions();
    }
  };

  const handleExportStock = () => {
    window.open('/api/reports/stock-pdf', '_blank');
  };

  const extractPdfErrorMessage = async (error: unknown, fallbackMessage: string) => {
    if (!axios.isAxiosError(error)) return fallbackMessage;

    const responseData = error.response?.data;
    if (responseData instanceof Blob) {
      try {
        const text = await responseData.text();
        const parsed = JSON.parse(text);
        if (parsed?.error) return parsed.error;
      } catch {
        return fallbackMessage;
      }
    }

    if ((responseData as any)?.error) {
      return (responseData as any).error;
    }

    return fallbackMessage;
  };

  const handleExportPaintUsagePdf = async () => {
    setExportError('');
    setExportSuccess('');

    const params = new URLSearchParams();
    params.append('ship_name', shipName);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    try {
      const res = await axios.get(`/api/reports/paint-usage-pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `paint-usage-${shipName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setExportSuccess(uiText.reports.exportSuccess);
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      const message = await extractPdfErrorMessage(error, uiText.reports.paintPdfExportFailed);
      setExportError(message);
    }
  };

  const handleExportSteelUsagePdf = async () => {
    if (!steelShipName || steelShipName === 'all' || !contractorName || contractorName === 'all') {
      setExportError(uiText.reports.selectSteelFiltersToExport);
      return;
    }

    const params = new URLSearchParams();
    params.append('ship_name', steelShipName);
    params.append('contractor_name', contractorName);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    try {
      const res = await axios.get(`/api/reports/steel-usage-pdf?${params.toString()}`, {
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `steel-usage-${steelShipName}-${contractorName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setExportSuccess(uiText.reports.exportSuccess);
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      const message = await extractPdfErrorMessage(error, uiText.common.error);
      setExportError(message);
    }
  };

  const renderSteelUsageEmptyState = () => {
    if (!steelFilterApplied) {
      return <p className="py-8 text-center text-muted-foreground">Terapkan filter untuk melihat data</p>;
    }
    return <p className="py-8 text-center text-muted-foreground">Tidak ada data untuk filter ini</p>;
  };

  if (view === 'txHistory') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button type="button" title="Back" aria-label="Back" onClick={() => setView('menu')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{uiText.reports.txHistory}</h2>
              <p className="text-muted-foreground text-sm">{uiText.reports.txHistoryDesc}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFilterOpen(true)} className={`${buttonOutlineClass} gap-2`}>
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        <Modal open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Transactions">
          <form onSubmit={(e) => { handleApplyFilter(e); setFilterOpen(false); }} className="space-y-3">
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.startDate}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} aria-label={uiText.reports.startDate} className={fieldClass} />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.endDate}</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} aria-label={uiText.reports.endDate} className={fieldClass} />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.colItem}</label>
              <div className="relative w-full">
                <select value={itemId} onChange={e => setItemId(e.target.value)} aria-label={uiText.reports.colItem} className={selectClass}>
                  <option value="all">{uiText.reports.allItem}</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.colCategory}</label>
              <div className="relative w-full">
                <select value={category} onChange={e => setCategory(e.target.value)} aria-label={uiText.reports.colCategory} className={selectClass}>
                  <option value="all">{uiText.reports.allCategories}</option>
                  <option value="CYLINDER">{categoryLabel.CYLINDER}</option>
                  <option value="PAINT">{categoryLabel.PAINT}</option>
                  <option value="STEEL">{categoryLabel.STEEL}</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.colType}</label>
              <div className="relative w-full">
                <select value={txType} onChange={e => setTxType(e.target.value)} aria-label={uiText.reports.colType} className={selectClass}>
                  <option value="all">{uiText.reports.allTypes}</option>
                  <option value="IN">{txTypeLabel.IN}</option>
                  <option value="OUT">{txTypeLabel.OUT}</option>
                  <option value="EXCHANGE">{txTypeLabel.EXCHANGE}</option>
                  <option value="ADJUSTMENT">{txTypeLabel.ADJUSTMENT}</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { handleResetFilter(); setFilterOpen(false); }} className={`${buttonOutlineClass} flex-1`}>
                {uiText.reports.resetFilter}
              </button>
              <button type="submit" className={`${buttonPrimaryClass} flex-1`}>
                {uiText.reports.applyFilter}
              </button>
            </div>
          </form>
        </Modal>

        <div className="hidden md:block rounded-md border bg-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left">{uiText.reports.colDate}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colItem}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colCategory}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colType}</th>
                <th className="px-3 py-2 text-right">{uiText.reports.colQty}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colUnit}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colUser}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colShip}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colNotes}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">{uiText.common.loading}</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">{uiText.common.noData}</td>
                </tr>
              ) : (
                transactions.map((tx, idx) => (
                  <tr key={tx.id ?? idx} className="border-t border-neutral-200 dark:border-neutral-700">
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
                      {tx.created_at ? format(new Date(tx.created_at), 'MMM d, yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-3 py-2 font-medium">{tx.item_name}</td>
                    <td className="px-3 py-2">{categoryLabel[tx.category] || tx.category || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${tx.type === 'IN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'}`}>
                        {txTypeLabel[tx.type] || tx.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{tx.quantity}</td>
                    <td className="px-3 py-2">{tx.stock_unit || '-'}</td>
                    <td className="px-3 py-2">{tx.user_name || '-'}</td>
                    <td className="px-3 py-2">{tx.ship_name || '-'}</td>
                    <td className="max-w-50 truncate px-3 py-2 text-sm text-muted-foreground">{tx.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{uiText.common.loading}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{uiText.common.noData}</div>
          ) : (
            transactions.map((tx, idx) => (
              <div key={tx.id ?? idx} className="rounded-md border bg-card p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{tx.item_name}</span>
                  <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${tx.type === 'IN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'}`}>
                    {txTypeLabel[tx.type] || tx.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{categoryLabel[tx.category] || tx.category || '-'}</span>
                  <span className="font-bold text-foreground">{tx.quantity} {tx.stock_unit || ''}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{tx.created_at ? format(new Date(tx.created_at), 'MMM d, yyyy HH:mm') : '-'}</span>
                  <span>{tx.user_name || tx.ship_name || '-'}</span>
                </div>
                {tx.notes && <p className="text-xs text-muted-foreground truncate">{tx.notes}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === 'paintUsage') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button type="button" title="Back" aria-label="Back" onClick={() => setView('menu')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{uiText.reports.paintUsage}</h2>
              <p className="text-muted-foreground text-sm">{uiText.reports.paintUsageDesc}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFilterOpen(true)} className={`${buttonOutlineClass} gap-2`}>
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button type="button" onClick={handleExportPaintUsagePdf} disabled={!shipName || shipName === 'all'} className={`${buttonOutlineClass} gap-2`}>
              <FileDown className="w-4 h-4" />
              {uiText.reports.exportPdf}
            </button>
          </div>
        </div>

        {exportError && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{exportError}</div>
        )}
        {exportSuccess && (
          <div className="bg-success/15 text-success text-sm p-3 rounded-md">{exportSuccess}</div>
        )}

        <Modal open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Paint Usage">
          <form onSubmit={(e) => { handleApplyFilter(e); setFilterOpen(false); }} className="space-y-3">
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.startDate}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} aria-label={uiText.reports.startDate} className={fieldClass} />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.endDate}</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} aria-label={uiText.reports.endDate} className={fieldClass} />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.colShip}</label>
              <div className="relative w-full">
                <select value={shipName} onChange={e => setShipName(e.target.value)} aria-label={uiText.reports.colShip} className={selectClass}>
                  <option value="all">{uiText.reports.allShips}</option>
                  {ships.map(ship => (
                    <option key={ship} value={ship}>{ship}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { handleResetFilter(); setFilterOpen(false); }} className={buttonOutlineClass}>
                {uiText.reports.resetFilter}
              </button>
              <button type="submit" className={`${buttonPrimaryClass} flex-1`}>
                {uiText.reports.applyFilter}
              </button>
            </div>
          </form>
        </Modal>

        <div className="hidden md:block rounded-md border bg-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left">{uiText.reports.colShip}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colCat}</th>
                <th className="px-3 py-2 text-right">{uiText.reports.colTotalCans}</th>
                <th className="px-3 py-2 text-right">{uiText.reports.colTotalLiters}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">{uiText.common.loading}</td>
                </tr>
              ) : paintUsage.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">{uiText.common.noData}</td>
                </tr>
              ) : (
                paintUsage.map((usage, idx) => (
                  <tr key={`${usage.ship_name}-${usage.item_id}-${idx}`} className="border-t border-neutral-200 dark:border-neutral-700">
                    <td className="px-3 py-2 font-medium">{usage.ship_name}</td>
                    <td className="px-3 py-2">{usage.item_name}</td>
                    <td className="px-3 py-2 text-right font-bold">{usage.total_cans_used}</td>
                    <td className="px-3 py-2 text-right font-bold">{usage.total_liters_used?.toFixed(2) || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{uiText.common.loading}</div>
          ) : paintUsage.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{uiText.common.noData}</div>
          ) : (
            paintUsage.map((usage, idx) => (
              <div key={`${usage.ship_name}-${usage.item_id}-${idx}`} className="rounded-md border bg-card p-3 space-y-1">
                <div className="font-medium text-sm">{usage.item_name}</div>
                <div className="text-xs text-muted-foreground">{usage.ship_name}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cans: <span className="font-bold text-foreground">{usage.total_cans_used}</span></span>
                  <span className="text-muted-foreground">Liters: <span className="font-bold text-foreground">{usage.total_liters_used?.toFixed(2) || '-'}</span></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === 'steelUsage') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button type="button" title="Back" aria-label="Back" onClick={() => setView('menu')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{uiText.reports.steelUsage}</h2>
              <p className="text-muted-foreground text-sm">{uiText.reports.steelUsageDesc}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFilterOpen(true)} className={`${buttonOutlineClass} gap-2`}>
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        {exportError && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{exportError}</div>
        )}
        {exportSuccess && (
          <div className="bg-success/15 text-success text-sm p-3 rounded-md">{exportSuccess}</div>
        )}

        <Modal open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Steel Usage">
          <form onSubmit={(e) => { handleApplyFilter(e); setFilterOpen(false); }} className="space-y-3">
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.startDate}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} aria-label={uiText.reports.startDate} className={fieldClass} />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.endDate}</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} aria-label={uiText.reports.endDate} className={fieldClass} />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.colShip}</label>
              <div className="relative w-full">
                <select value={steelShipName} onChange={e => setSteelShipName(e.target.value)} aria-label={uiText.reports.colShip} className={selectClass}>
                  <option value="all">{uiText.reports.allShips}</option>
                  {steelShips.map(ship => (
                    <option key={ship} value={ship}>{ship}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{uiText.reports.contractor}</label>
              <div className="relative w-full">
                <select value={contractorName} onChange={e => setContractorName(e.target.value)} aria-label={uiText.reports.contractor} className={selectClass}>
                  <option value="all">{uiText.reports.allContractors}</option>
                  {contractors.map(contractor => (
                    <option key={contractor} value={contractor}>{contractor}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleExportSteelUsagePdf}
                disabled={!steelShipName || steelShipName === 'all' || !contractorName || contractorName === 'all'}
                className={`${buttonOutlineClass} gap-2`}
              >
                <FileDown className="w-4 h-4" />
                {uiText.reports.exportPdf}
              </button>
              <button type="button" onClick={() => { handleResetFilter(); setFilterOpen(false); }} className={buttonOutlineClass}>
                {uiText.reports.resetFilter}
              </button>
              <button type="submit" className={`${buttonPrimaryClass} flex-1`}>
                {uiText.reports.applyFilter}
              </button>
            </div>
            {(!steelShipName || steelShipName === 'all' || !contractorName || contractorName === 'all') && (
              <p className="text-xs text-muted-foreground">{uiText.reports.selectSteelFiltersToExport}</p>
            )}
          </form>
        </Modal>

        <div className="hidden md:block rounded-md border bg-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2 text-left">{uiText.reports.colDate}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colItem}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colUser}</th>
                <th className="px-3 py-2 text-right">{uiText.reports.colQty}</th>
                <th className="px-3 py-2 text-left">{uiText.reports.colUnit}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">{uiText.common.loading}</td>
                </tr>
              ) : steelUsage.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">{renderSteelUsageEmptyState()}</td>
                </tr>
              ) : (
                steelUsage.map((usage, idx) => (
                  <tr key={`${usage.created_at}-${usage.item_id}-${idx}`} className="border-t border-neutral-200 dark:border-neutral-700">
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
                      {usage?.created_at && !Number.isNaN(new Date(usage.created_at).getTime())
                        ? format(new Date(usage.created_at), 'MMM d, yyyy HH:mm')
                        : '-'}
                    </td>
                    <td className="px-3 py-2 font-medium">{usage?.item_name || '-'}</td>
                    <td className="px-3 py-2">{usage?.user_name || '-'}</td>
                    <td className="px-3 py-2 text-right font-bold">{usage?.quantity ?? '-'}</td>
                    <td className="px-3 py-2">{usage?.stock_unit || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{uiText.common.loading}</div>
          ) : steelUsage.length === 0 ? (
            renderSteelUsageEmptyState()
          ) : (
            steelUsage.map((usage, idx) => (
              <div key={`${usage.created_at}-${usage.item_id}-${idx}`} className="rounded-md border bg-card p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{usage?.item_name || '-'}</span>
                  <span className="font-bold text-sm">{usage?.quantity ?? '-'} {usage?.stock_unit || ''}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{usage?.user_name || '-'}</span>
                  <span>
                    {usage?.created_at && !Number.isNaN(new Date(usage.created_at).getTime())
                      ? format(new Date(usage.created_at), 'MMM d, yyyy HH:mm')
                      : '-'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{uiText.reports.title}</h2>
        <p className="text-muted-foreground">{uiText.reports.desc}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">{uiText.reports.stockReport}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {uiText.reports.stockReportDesc}
          </p>
          <button onClick={handleExportStock} className={`${buttonPrimaryClass} w-full gap-2`}>
            <FileDown className="w-4 h-4" />
            {uiText.reports.exportPdf}
          </button>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">{uiText.reports.txHistory}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {uiText.reports.txHistoryDesc}
          </p>
          <button onClick={() => setView('txHistory')} className={`${buttonOutlineClass} w-full gap-2`}>
            <Search className="w-4 h-4" />
            {uiText.reports.viewReport}
          </button>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">{uiText.reports.paintUsage}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {uiText.reports.paintUsageDesc}
          </p>
          <button onClick={() => setView('paintUsage')} className={`${buttonOutlineClass} w-full gap-2`}>
            <Search className="w-4 h-4" />
            {uiText.reports.viewReport}
          </button>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">{uiText.reports.steelUsage}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {uiText.reports.steelUsageDesc}
          </p>
          <button onClick={() => setView('steelUsage')} className={`${buttonOutlineClass} w-full gap-2`}>
            <Search className="w-4 h-4" />
            {uiText.reports.viewReport}
          </button>
        </div>
      </div>
    </div>
  );
}
