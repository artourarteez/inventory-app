import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { uiText, categoryLabel, statusLabel } from '@/lib/uiText';

const fieldClass = 'w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:ring-2 focus:ring-blue-500';
const selectClass = 'appearance-none w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const buttonPrimaryClass = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

export default function MasterItems() {
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: 'CYLINDER',
    stock_unit: 'unit',
    status: 'normal',
    volume_per_can: '',
    specification: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setFetchError('');
    try {
      const res = await axios.get('/api/items');
      setItems(res.data);
    } catch {
      setFetchError(uiText.items.fetchError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      const allow_direct_edit = formData.category === 'CYLINDER' || formData.category === 'STEEL';
      await axios.post('/api/items', {
        ...formData,
        allow_direct_edit,
        volume_per_can: formData.volume_per_can ? parseFloat(formData.volume_per_can) : null
      });
      fetchItems();
      setFormData({
        id: '', name: '', category: 'CYLINDER', stock_unit: 'unit', status: 'normal', volume_per_can: '', specification: ''
      });
      setSuccessMessage(uiText.items.addSuccess);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setFormError(error.response?.data?.error || uiText.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{uiText.items.title}</h2>
          <p className="text-muted-foreground">{uiText.items.desc}</p>
        </div>
      </div>

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

      <div className="rounded-md border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{uiText.items.id}</label>
            <input
              required
              value={formData.id}
              onChange={e => setFormData({ ...formData, id: e.target.value })}
              aria-label={uiText.items.id}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{uiText.items.name}</label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              aria-label={uiText.items.name}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{uiText.items.category}</label>
            <div className="relative w-full">
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                aria-label={uiText.items.category}
                className={selectClass}
              >
                <option value="CYLINDER">{categoryLabel.CYLINDER}</option>
                <option value="STEEL">{categoryLabel.STEEL}</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{uiText.items.unit}</label>
            <input
              required
              value={formData.stock_unit}
              onChange={e => setFormData({ ...formData, stock_unit: e.target.value })}
              aria-label={uiText.items.unit}
              className={fieldClass}
            />
          </div>

          {formData.category === 'CYLINDER' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{uiText.items.status}</label>
              <div className="relative w-full">
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  aria-label={uiText.items.status}
                  className={selectClass}
                >
                  <option value="normal">{statusLabel.normal}</option>
                  <option value="damaged">{statusLabel.damaged}</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">▼</span>
              </div>
            </div>
          )}

          {formData.category === 'PAINT' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{uiText.items.volumePerCan}</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.volume_per_can}
                onChange={e => setFormData({ ...formData, volume_per_can: e.target.value })}
                aria-label={uiText.items.volumePerCan}
                className={fieldClass}
              />
            </div>
          )}

          {formData.category === 'STEEL' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{uiText.items.specification}</label>
              <input
                value={formData.specification}
                onChange={e => setFormData({ ...formData, specification: e.target.value })}
                aria-label={uiText.items.specification}
                className={fieldClass}
              />
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className={`${buttonPrimaryClass} w-full sm:w-auto`}
              disabled={isSubmitting}
            >
              {isSubmitting ? uiText.common.loading : uiText.items.saveItem}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
