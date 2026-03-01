import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { uiText } from '@/lib/uiText';

export default function MasterItems() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
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
      setOpen(false);
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

      <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setFormError(''); }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{uiText.items.id}</Label>
            <Input required value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{uiText.items.name}</Label>
            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{uiText.items.category}</Label>
            <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CYLINDER">Cylinder</SelectItem>
                <SelectItem value="PAINT">Paint</SelectItem>
                <SelectItem value="STEEL">Steel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{uiText.items.unit}</Label>
            <Input required value={formData.stock_unit} onChange={e => setFormData({ ...formData, stock_unit: e.target.value })} />
          </div>
          
          {formData.category === 'CYLINDER' && (
            <div className="space-y-2">
              <Label>{uiText.items.status}</Label>
              <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.category === 'PAINT' && (
            <div className="space-y-2">
              <Label>{uiText.items.volumePerCan}</Label>
              <Input type="number" step="0.01" required value={formData.volume_per_can} onChange={e => setFormData({ ...formData, volume_per_can: e.target.value })} />
            </div>
          )}

          {formData.category === 'STEEL' && (
            <div className="space-y-2">
              <Label>{uiText.items.specification}</Label>
              <Input value={formData.specification} onChange={e => setFormData({ ...formData, specification: e.target.value })} />
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? uiText.common.loading : uiText.items.saveItem}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
