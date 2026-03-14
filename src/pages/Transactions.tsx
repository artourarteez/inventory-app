import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { uiText, categoryLabel, txTypeLabel } from '@/lib/uiText';
import { displayUnit } from '@/lib/utils';
import SearchableCombobox from '@/components/SearchableCombobox';

const fieldClass = 'w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:ring-2 focus:ring-blue-500';
const selectClass = 'appearance-none w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300';
const buttonPrimaryClass = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const buttonSecondaryClass = 'px-4 py-2 text-sm font-medium border rounded-lg border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800';

function timeAgo(dateStr: string): string {
  if (!dateStr) return '-';

  const now = Date.now();

  // SQLite → ISO UTC
  const then = new Date(dateStr.replace(' ', 'T') + 'Z').getTime();

  const diff = Math.max(0, now - then);

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function SignaturePad({ onSignatureChange }: { onSignatureChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        onSignatureChange(canvas.toDataURL('image/png'));
      }
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onSignatureChange(null);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
    }
  }, []);

  return (
    <div className="space-y-2">
      <div className="border rounded-md bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="w-full h-50 cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        {uiText.transactions.clearSignature}
      </button>
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    type: 'IN',
    quantity: '',
    notes: '',
    user_name: '',
    ship_name: ''
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastTx, setLastTx] = useState<any>(null);
  const [lastTxLoading, setLastTxLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetchError('');
    try {
      const [txRes, itemsRes] = await Promise.all([
        axios.get('/api/transactions'),
        axios.get('/api/items')
      ]);
      setTransactions(txRes.data);
      setItems(itemsRes.data);
    } catch {
      setFetchError(uiText.transactions.fetchError);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const base64Photos = await Promise.all(
        Array.from(files).map(file => fileToBase64(file))
      );
      setPhotos(base64Photos);
    } catch {
      setFormError(uiText.common.error);
    }
  };

  const selectedItem = items.find(i => i.id === formData.item_id);
  const selectedItemCategory = selectedItem?.category;

  useEffect(() => {
    if (!formData.item_id) { setLastTx(null); return; }
    let cancelled = false;
    setLastTxLoading(true);
    axios.get('/api/transactions', { params: { item_id: formData.item_id } })
      .then(res => {
        if (!cancelled) {
          const list = Array.isArray(res.data) ? res.data : [];
          setLastTx(list.length > 0 ? list[0] : null);
        }
      })
      .catch(() => { if (!cancelled) setLastTx(null); })
      .finally(() => { if (!cancelled) setLastTxLoading(false); });
    return () => { cancelled = true; };
  }, [formData.item_id]);

  const isIn = formData.type === 'IN';
  const isOut = formData.type === 'OUT';
  const isExchange = formData.type === 'EXCHANGE';
  const isAdjustment = formData.type === 'ADJUSTMENT';

  const showUserField = (selectedItemCategory === 'CYLINDER' || selectedItemCategory === 'STEEL') && (isOut || isExchange);
  const showShipField = (selectedItemCategory === 'PAINT' && (isIn || isOut)) || (selectedItemCategory === 'STEEL' && isOut);
  const isShipRequired = (selectedItemCategory === 'PAINT' || selectedItemCategory === 'STEEL') && isOut;
  const showSignatureField = selectedItemCategory === 'CYLINDER' && (isOut || isExchange);
  const isSignatureRequired = showSignatureField;
  const isPhotoRequired = selectedItemCategory === 'CYLINDER' && (isOut || isExchange);
  const isPhotoOptional = selectedItemCategory === 'STEEL' || selectedItemCategory === 'PAINT' || isAdjustment;

  const filteredItems = items.filter(item => {
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (item.category === 'PAINT' && item.part_type === 'B') return false;
    return true;
  });

  const transactionTypeHint = uiText.transactions.typeHints[
    formData.type as keyof typeof uiText.transactions.typeHints
  ];

  const quantityLabel = uiText.transactions.qty;
  const quantityHint = isIn || isOut
    ? uiText.transactions.qtyPerUnitHint
    : isAdjustment
      ? uiText.transactions.adjustmentNote
        : '';

  const isSubmitDisabled =
    isSubmitting || // Disable while submitting
    !formData.item_id ||
    !formData.quantity ||
    (isShipRequired && !formData.ship_name.trim()) ||
    (isPhotoRequired && photos.length === 0) ||
    (isSignatureRequired && !signature);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      user_name: showUserField ? prev.user_name : '',
      ship_name: showShipField ? prev.ship_name : ''
    }));

    if (!showSignatureField) {
      setSignature(null);
    }
  }, [showUserField, showShipField, showSignatureField]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    if (isSubmitting) return;

    setShowConfirm(false);
    setFormError('');
    setIsSubmitting(true);

    const parsedQuantity = parseFloat(formData.quantity);

    try {
      await axios.post('/api/transactions', {
        item_id: formData.item_id,
        type: formData.type,
        quantity: parsedQuantity,
        notes: formData.notes,
        user_name: formData.user_name || null,
        ship_name: formData.ship_name || null,
        photos: photos.length > 0 ? photos : [],
        signature: signature
      });
      setOpen(false);
      fetchData();
      setFormData({
        item_id: '', type: 'IN', quantity: '', notes: '', user_name: '', ship_name: ''
      });
      setPhotos([]);
      setSignature(null);
      setSuccessMessage(uiText.transactions.saveSuccess);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setFormError(error.response?.data?.error || uiText.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{uiText.transactions.title}</h2>
          <p className="text-muted-foreground text-sm">{uiText.transactions.desc}</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={buttonPrimaryClass}>
          {uiText.transactions.newTx}
        </button>
      </div>

      {fetchError && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
          {fetchError}
        </div>
      )}

      {successMessage && (
        <div className="bg-success/15 text-success text-sm p-3 rounded-md">
          {successMessage}
        </div>
      )}

      {formError && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
          {formError}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto pt-20" onClick={() => { setOpen(false); setFormError(''); }}>
          <div className="w-full max-w-2xl my-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-neutral-800 dark:text-neutral-100">{uiText.transactions.newTx}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className={labelClass}>Kategori Barang</label>
            <div className="relative w-full">
              <select
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setFormData(prev => ({ ...prev, item_id: '' })); }}
                aria-label="Kategori Barang"
                className={selectClass}
              >
                <option value="">Semua Kategori</option>
                <option value="CYLINDER">{categoryLabel.CYLINDER}</option>
                <option value="STEEL">{categoryLabel.STEEL}</option>
                <option value="PAINT">{categoryLabel.PAINT}</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>{uiText.transactions.item}</label>
            <SearchableCombobox
              items={filteredItems.map(item => ({ id: item.id, name: item.name }))}
              selectedId={formData.item_id}
              onChange={id => setFormData({ ...formData, item_id: id })}
              placeholder="Cari barang..."
            />
            {selectedItem && (
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-3">
                <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">{selectedItem.name}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  <span>Kategori: <span className="text-neutral-700 dark:text-neutral-300">{categoryLabel[selectedItem.category] || selectedItem.category}</span></span>
                  <span>Stok: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{selectedItem.current_stock}</span></span>
                  <span>Satuan: <span className="text-neutral-700 dark:text-neutral-300">{displayUnit(selectedItem)}</span></span>
                </div>
              </div>
            )}
            {selectedItem && !lastTxLoading && lastTx && (
              <div className="mt-2 rounded-lg border border-neutral-700 bg-neutral-800/50 p-3 text-xs space-y-1">
                <span className="font-semibold uppercase tracking-wide text-neutral-400">Transaksi Terakhir</span>
                <p className="text-neutral-200">
                  <span className="font-bold">{txTypeLabel[lastTx.type] || lastTx.type}</span>{' '}
                  {lastTx.quantity} {lastTx.stock_unit || displayUnit(selectedItem)}
                </p>
                {(lastTx.user_name || lastTx.ship_name) && (
                  <p className="text-neutral-400">
                    {lastTx.user_name ? `oleh ${lastTx.user_name}` : ''}
                    {lastTx.user_name && lastTx.ship_name ? ' \u2022 ' : ''}
                    {lastTx.ship_name ? `Kapal: ${lastTx.ship_name}` : ''}
                  </p>
                )}
                <p className="text-neutral-500">{timeAgo(lastTx.created_at)}</p>
              </div>
            )}
            {selectedItem && !lastTxLoading && !lastTx && (
              <p className="mt-2 text-xs text-neutral-500">Belum ada transaksi sebelumnya</p>
            )}
            {selectedItem && lastTxLoading && (
              <p className="mt-2 text-xs text-neutral-400">Memuat transaksi terakhir...</p>
            )}
          </div>
          <div className="space-y-2">
            <label className={labelClass}>{uiText.transactions.type}</label>
            <div className="relative w-full">
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                aria-label={uiText.transactions.type}
                className={selectClass}
              >
                <option value="IN">{uiText.transactions.stockIn}</option>
                <option value="OUT">{uiText.transactions.stockOut}</option>
                <option value="EXCHANGE">{uiText.transactions.exchange}</option>
                <option value="ADJUSTMENT">{uiText.transactions.adjustment}</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
            </div>
            <p className="text-xs text-muted-foreground">{transactionTypeHint}</p>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>{quantityLabel}</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: e.target.value })}
              aria-label={quantityLabel}
              className={fieldClass}
            />
            {quantityHint && <p className="text-xs text-muted-foreground">{quantityHint}</p>}
          </div>
          {showUserField && (
            <div className="space-y-2">
              <label className={labelClass}>{uiText.transactions.user}</label>
              <input
                value={formData.user_name}
                onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                placeholder={uiText.transactions.userPlaceholder}
                aria-label={uiText.transactions.user}
                className={fieldClass}
              />
            </div>
          )}
          {showShipField && (
            <div className="space-y-2">
              <label className={labelClass}>
                {uiText.transactions.ship}
                {isShipRequired && <span className="text-destructive ml-1">*</span>}
              </label>
              <input
                required={isShipRequired}
                value={formData.ship_name}
                onChange={e => setFormData({ ...formData, ship_name: e.target.value })}
                aria-label={uiText.transactions.ship}
                className={fieldClass}
              />
            </div>
          )}
          <div className="space-y-2">
            <label className={labelClass}>{uiText.transactions.notes}</label>
            <input
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              aria-label={uiText.transactions.notes}
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClass}>
              {uiText.transactions.photo}
              {isPhotoRequired && <span className="text-destructive ml-1">*</span>}
            </label>
            <input type="file" multiple accept="image/*" onChange={handlePhotoChange} aria-label={uiText.transactions.photo} className={fieldClass} />
            {isPhotoRequired && photos.length === 0 && (
              <p className="text-xs text-destructive">{uiText.transactions.photoRequired}</p>
            )}
            {!isPhotoRequired && isPhotoOptional && (
              <p className="text-xs text-muted-foreground">{uiText.transactions.photoOptional}</p>
            )}
          </div>

          {showSignatureField && (
            <div className="space-y-2">
              <label className={labelClass}>
                {uiText.transactions.signature}
                {isSignatureRequired && <span className="text-destructive ml-1">*</span>}
              </label>
              <SignaturePad onSignatureChange={setSignature} />
              {isSignatureRequired && !signature && (
                <p className="text-xs text-destructive">{uiText.transactions.signatureRequired}</p>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setFormError(''); }}
              className={buttonSecondaryClass}
            >
              {uiText.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={buttonPrimaryClass}
            >
              {isSubmitting ? uiText.common.loading : uiText.common.save}
            </button>
          </div>
            </form>
          </div>
        </div>
      )}

      {showConfirm && selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Konfirmasi Transaksi</h3>
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Barang</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-right max-w-[60%] break-words">{selectedItem.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Kategori</span>
                <span className="text-neutral-800 dark:text-neutral-200">{categoryLabel[selectedItem.category] || selectedItem.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Tipe</span>
                <span className="text-neutral-800 dark:text-neutral-200">{txTypeLabel[formData.type] || formData.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Jumlah</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{formData.quantity} {displayUnit(selectedItem)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowConfirm(false)} className={buttonSecondaryClass}>Batal</button>
              <button type="button" onClick={doSubmit} className={buttonPrimaryClass}>Konfirmasi</button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-neutral-800 bg-card">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-neutral-400 border-b border-neutral-700 bg-neutral-900/50">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Kategori</th>
                <th className="px-3 py-2 text-left">Tipe</th>
                <th className="px-3 py-2 text-right">Jumlah</th>
                <th className="px-3 py-2 text-left">Kapal</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-neutral-400">
                    {uiText.common.noData}
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => (
                  <tr key={tx.id ?? idx} className="border-b border-neutral-800 odd:bg-neutral-900/30 hover:bg-neutral-900/60 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap">{tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td className="px-3 py-2 max-w-[320px] truncate">{tx.item_name}</td>
                    <td className="px-3 py-2">{categoryLabel[tx.category as keyof typeof categoryLabel] || tx.category || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        tx.type === 'IN' ? 'bg-green-900/30 text-green-300' :
                        tx.type === 'OUT' ? 'bg-red-900/30 text-red-300' :
                        tx.type === 'ADJUSTMENT' ? 'bg-amber-900/30 text-amber-300' :
                        tx.type === 'EXCHANGE' ? 'bg-blue-900/30 text-blue-300' :
                        'bg-neutral-700 text-neutral-300'
                      }`}>{tx.type}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {tx.quantity} {(() => {
                        const item = items.find(i => i.id === tx.item_id);
                        return item ? displayUnit(item) : (tx.stock_unit || '');
                      })()}
                    </td>
                    <td className="px-3 py-2">{tx.ship_name || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          {transactions.length === 0 ? (
            <div className="px-3 py-8 text-center text-neutral-400">
              {uiText.common.noData}
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {transactions.map((tx, idx) => (
                <div key={tx.id ?? idx} className="px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-neutral-200 truncate">{tx.item_name}</span>
                    <span className={`inline-flex items-center shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                      tx.type === 'IN' ? 'bg-green-900/30 text-green-300' :
                      tx.type === 'OUT' ? 'bg-red-900/30 text-red-300' :
                      tx.type === 'ADJUSTMENT' ? 'bg-amber-900/30 text-amber-300' :
                      tx.type === 'EXCHANGE' ? 'bg-blue-900/30 text-blue-300' :
                      'bg-neutral-700 text-neutral-200'
                    }`}>
                      {tx.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>{categoryLabel[tx.category as keyof typeof categoryLabel] || tx.category || '-'}</span>
                    <span className="font-medium text-neutral-200">
                      {tx.quantity} {(() => {
                        const item = items.find(i => i.id === tx.item_id);
                        return item ? displayUnit(item) : (tx.stock_unit || '');
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                    <span>{tx.ship_name || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
