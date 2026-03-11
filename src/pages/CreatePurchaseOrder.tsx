import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import SearchableCombobox from '@/components/SearchableCombobox';

interface Item {
  id: string;
  name: string;
  category: string;
  part_type: string | null;
}

interface OrderLine {
  item_id: string;
  quantity: number;
}

const fieldClass = 'w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:ring-2 focus:ring-blue-500';
const selectClass = 'appearance-none w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const buttonPrimaryClass = 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const buttonSecondaryClass = 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium border rounded-lg border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60';

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('STEEL');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([{ item_id: '', quantity: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/items', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(() => setError('Failed to load items'));
  }, []);

  const filteredItems = items.filter(
    item => item.category === selectedCategory && item.part_type !== 'B'
  );

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setLines(lines.map(l => ({ ...l, item_id: '' })));
  };

  const addLine = () => {
    setLines([...lines, { item_id: '', quantity: 1 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof OrderLine, value: string | number) => {
    const updated = [...lines];
    if (field === 'quantity') {
      updated[index].quantity = Number(value);
    } else {
      updated[index].item_id = value as string;
    }
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validLines = lines.filter(l => l.item_id && l.quantity > 0);
    if (validLines.length === 0) {
      setError('Please add at least one item with valid quantity.');
      return;
    }

    const payload = {
      supplier,
      notes,
      items: validLines.map(line => ({
        item_id: line.item_id,
        quantity: Number(line.quantity),
      })),
    };

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create purchase order');
      }

      navigate('/purchase-orders');
    } catch (err: any) {
      setError(err.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Purchase Order</h2>
        <p className="text-muted-foreground">Fill in the details to create a new PO</p>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-md border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="supplier" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Supplier</label>
            <input
              id="supplier"
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              placeholder="e.g. PT Sapta Sumber Lancar"
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="rounded-md border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="selected-category" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Kategori Barang</label>
            <div className="relative w-full">
              <select
                id="selected-category"
                value={selectedCategory}
                onChange={e => handleCategoryChange(e.target.value)}
                className={selectClass}
              >
                <option value="STEEL">STEEL</option>
                <option value="PAINT">PAINT</option>
                <option value="CYLINDER">CYLINDER</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Items</h3>
            <button
              type="button"
              onClick={addLine}
              className={buttonSecondaryClass}
            >
              Tambah Item
            </button>
          </div>
          <div className="overflow-visible">
            {/* Header row - hidden on mobile */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_48px] gap-2 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400 px-4 py-3 rounded-t-lg">
              <div>Item</div>
              <div>Quantity</div>
              <div></div>
            </div>
            {/* Item rows */}
            <div className="space-y-2 sm:space-y-0">
              {lines.map((line, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-[1fr_60px_36px] sm:grid-cols-[1fr_100px_48px] gap-2 items-center px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 first:border-t-0 sm:first:border-t"
                >
                  <div className="min-w-0">
                    <SearchableCombobox
                      items={filteredItems.map(item => ({ id: item.id, name: item.name }))}
                      selectedId={line.item_id}
                      onChange={id => updateLine(index, 'item_id', id)}
                      placeholder="Cari barang..."
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={e => updateLine(index, 'quantity', e.target.value)}
                      aria-label={`Quantity line ${index + 1}`}
                      className={`${fieldClass} w-full`}
                    />
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 1}
                      title="Remove item line"
                      aria-label="Remove item line"
                      className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-transparent text-neutral-500 transition hover:bg-neutral-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className={buttonPrimaryClass}
          >
            {isSubmitting ? 'Creating...' : 'Buat Purchase Order'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            className={buttonSecondaryClass}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
