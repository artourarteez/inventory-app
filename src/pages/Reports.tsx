import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileDown, ArrowLeft, Search, X } from 'lucide-react';
import { uiText } from '@/lib/uiText';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

export default function Reports() {
  const [view, setView] = useState<'menu' | 'txHistory' | 'paintUsage' | 'steelUsage'>('menu');
  
  // Filters state
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
      // Fetch all paint usage to extract unique ships
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
    if (isLoading) return; // Prevent double submission

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
      return <p className="text-center py-8 text-muted-foreground">Terapkan filter untuk melihat data</p>;
    }
    return <p className="text-center py-8 text-muted-foreground">Tidak ada data untuk filter ini</p>;
  };

  if (view === 'txHistory') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView('menu')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{uiText.reports.txHistory}</h2>
            <p className="text-muted-foreground">{uiText.reports.txHistoryDesc}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <form onSubmit={handleApplyFilter} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>{uiText.reports.startDate}</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{uiText.reports.endDate}</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{uiText.reports.colItem}</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger><SelectValue placeholder={uiText.reports.allItem} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{uiText.reports.allItem}</SelectItem>
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name} ({item.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{uiText.reports.colCategory}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder={uiText.reports.allCategories} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{uiText.reports.allCategories}</SelectItem>
                    <SelectItem value="CYLINDER">Cylinder</SelectItem>
                    <SelectItem value="PAINT">Paint</SelectItem>
                    <SelectItem value="STEEL">Steel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{uiText.reports.colType}</Label>
                <Select value={txType} onValueChange={setTxType}>
                  <SelectTrigger><SelectValue placeholder={uiText.reports.allTypes} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{uiText.reports.allTypes}</SelectItem>
                    <SelectItem value="IN">IN</SelectItem>
                    <SelectItem value="OUT">OUT</SelectItem>
                    <SelectItem value="EXCHANGE">EXCHANGE</SelectItem>
                    <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
                    <SelectItem value="DIRECT_EDIT">DIRECT_EDIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleResetFilter} className="gap-2">
                <X className="w-4 h-4" />
                {uiText.reports.resetFilter}
              </Button>
              <Button type="submit" className="gap-2">
                <Search className="w-4 h-4" />
                {uiText.reports.applyFilter}
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiText.reports.colDate}</TableHead>
                <TableHead>{uiText.reports.colItem}</TableHead>
                <TableHead>{uiText.reports.colCategory}</TableHead>
                <TableHead>{uiText.reports.colType}</TableHead>
                <TableHead>{uiText.reports.colQty}</TableHead>
                <TableHead>{uiText.reports.colUnit}</TableHead>
                <TableHead>{uiText.reports.colUser}</TableHead>
                <TableHead>{uiText.reports.colShip}</TableHead>
                <TableHead>{uiText.reports.colNotes}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {uiText.common.loading}
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {uiText.common.noData}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {tx.item_name} <span className="text-xs text-muted-foreground">({tx.item_id})</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tx.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'IN' ? 'default' : tx.type === 'OUT' ? 'destructive' : 'secondary'}>
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{tx.quantity}</TableCell>
                    <TableCell>{tx.stock_unit}</TableCell>
                    <TableCell>{tx.user_name || '-'}</TableCell>
                    <TableCell>{tx.ship_name || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.notes || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (view === 'paintUsage') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView('menu')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{uiText.reports.paintUsage}</h2>
            <p className="text-muted-foreground">{uiText.reports.paintUsageDesc}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <form onSubmit={handleApplyFilter} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{uiText.reports.startDate}</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{uiText.reports.endDate}</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{uiText.reports.colShip}</Label>
                <Select value={shipName} onValueChange={setShipName}>
                  <SelectTrigger><SelectValue placeholder={uiText.reports.allShips} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{uiText.reports.allShips}</SelectItem>
                    {ships.map(ship => (
                      <SelectItem key={ship} value={ship}>{ship}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportPaintUsagePdf}
                disabled={!shipName || shipName === 'all'}
                className="gap-2"
              >
                <FileDown className="w-4 h-4" />
                {uiText.reports.exportPdf}
              </Button>
              <Button type="button" variant="outline" onClick={handleResetFilter} className="gap-2">
                <X className="w-4 h-4" />
                {uiText.reports.resetFilter}
              </Button>
              <Button type="submit" className="gap-2">
                <Search className="w-4 h-4" />
                {uiText.reports.applyFilter}
              </Button>
            </div>
            {!shipName || shipName === 'all' ? (
              <p className="text-xs text-muted-foreground text-right">{uiText.reports.selectShipToExport}</p>
            ) : null}
          </form>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiText.reports.colShip}</TableHead>
                <TableHead>{uiText.reports.colCat}</TableHead>
                <TableHead className="text-right">{uiText.reports.colTotalCans}</TableHead>
                <TableHead className="text-right">{uiText.reports.colTotalLiters}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {uiText.common.loading}
                  </TableCell>
                </TableRow>
              ) : paintUsage.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {uiText.common.noData}
                  </TableCell>
                </TableRow>
              ) : (
                paintUsage.map((usage, idx) => (
                  <TableRow key={`${usage.ship_name}-${usage.item_id}-${idx}`}>
                    <TableCell className="font-medium">{usage.ship_name}</TableCell>
                    <TableCell>
                      {usage.item_name} <span className="text-xs text-muted-foreground">({usage.item_id})</span>
                    </TableCell>
                    <TableCell className="text-right font-bold">{usage.total_cans_used}</TableCell>
                    <TableCell className="text-right font-bold">{usage.total_liters_used?.toFixed(2) || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (view === 'steelUsage') {
    return (
      <div className="space-y-6">
        {exportError && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {exportError}
          </div>
        )}

        {exportSuccess && (
          <div className="bg-success/15 text-success text-sm p-3 rounded-md">
            {exportSuccess}
          </div>
        )}

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <form onSubmit={handleApplyFilter} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{uiText.reports.startDate}</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{uiText.reports.endDate}</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{uiText.reports.colShip}</Label>
                <Select value={steelShipName} onValueChange={setSteelShipName}>
                  <SelectTrigger><SelectValue placeholder={uiText.reports.allShips} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{uiText.reports.allShips}</SelectItem>
                    {steelShips.map(ship => (
                      <SelectItem key={ship} value={ship}>{ship}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{uiText.reports.contractor}</Label>
                <Select value={contractorName} onValueChange={setContractorName}>
                  <SelectTrigger><SelectValue placeholder={uiText.reports.allContractors} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{uiText.reports.allContractors}</SelectItem>
                    {contractors.map(contractor => (
                      <SelectItem key={contractor} value={contractor}>{contractor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportSteelUsagePdf}
                disabled={!steelShipName || steelShipName === 'all' || !contractorName || contractorName === 'all'}
                className="gap-2"
              >
                <FileDown className="w-4 h-4" />
                {uiText.reports.exportPdf}
              </Button>
              <Button type="button" variant="outline" onClick={handleResetFilter} className="gap-2">
                <X className="w-4 h-4" />
                {uiText.reports.resetFilter}
              </Button>
              <Button type="submit" className="gap-2">
                <Search className="w-4 h-4" />
                {uiText.reports.applyFilter}
              </Button>
            </div>
            {(!steelShipName || steelShipName === 'all' || !contractorName || contractorName === 'all') ? (
              <p className="text-xs text-muted-foreground text-right">{uiText.reports.selectSteelFiltersToExport}</p>
            ) : null}
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-right">{uiText.common.loading}</p>
            ) : null}
          </form>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiText.reports.colItem}</TableHead>
                <TableHead className="text-right">{uiText.reports.colQty}</TableHead>
                <TableHead>{uiText.reports.colUnit}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    {uiText.common.loading}
                  </TableCell>
                </TableRow>
              ) : steelUsage.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    {uiText.common.noData}
                  </TableCell>
                </TableRow>
              ) : (
                steelUsage.map((usage, idx) => (
                  <TableRow key={`${usage.item_id}-${idx}`}>
                    <TableCell className="font-medium">
                      {usage.item_name} <span className="text-xs text-muted-foreground">({usage.item_id})</span>
                    </TableCell>
                    <TableCell className="text-right font-bold">{usage.total_quantity_used}</TableCell>
                    <TableCell>{usage.stock_unit || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
          <Button onClick={handleExportStock} className="w-full gap-2">
            <FileDown className="w-4 h-4" />
            {uiText.reports.exportPdf}
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">{uiText.reports.txHistory}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {uiText.reports.txHistoryDesc}
          </p>
          <Button onClick={() => setView('txHistory')} variant="outline" className="w-full gap-2">
            <Search className="w-4 h-4" />
            {uiText.reports.viewReport}
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">{uiText.reports.paintUsage}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {uiText.reports.paintUsageDesc}
          </p>
          <Button onClick={() => setView('paintUsage')} variant="outline" className="w-full gap-2">
            <Search className="w-4 h-4" />
            {uiText.reports.viewReport}
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">{uiText.reports.steelUsage}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {uiText.reports.steelUsageDesc}
          </p>
          <Button onClick={() => setView('steelUsage')} variant="outline" className="w-full gap-2">
            <Search className="w-4 h-4" />
            {uiText.reports.viewReport}
          </Button>
        </div>
      </div>
    </div>
  );
}
