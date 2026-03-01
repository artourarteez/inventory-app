import React, { useEffect, useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { format } from 'date-fns';
import { uiText } from '@/lib/uiText';

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
          className="w-full h-[200px] cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={clear}>
        {uiText.transactions.clearSignature}
      </Button>
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newPhotos: string[] = [];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          newPhotos.push(ev.target.result as string);
          if (newPhotos.length === files.length) {
            setPhotos(newPhotos);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const selectedItem = items.find(i => i.id === formData.item_id);
  const selectedCategory = selectedItem?.category;

  const isIn = formData.type === 'IN';
  const isOut = formData.type === 'OUT';
  const isExchange = formData.type === 'EXCHANGE';
  const isAdjustment = formData.type === 'ADJUSTMENT';
  const isDirectEdit = formData.type === 'DIRECT_EDIT';

  const showUserField = (selectedCategory === 'CYLINDER' || selectedCategory === 'STEEL') && (isOut || isExchange);
  const showShipField = (selectedCategory === 'PAINT' && (isIn || isOut)) || (selectedCategory === 'STEEL' && isOut);
  const isShipRequired = (selectedCategory === 'PAINT' || selectedCategory === 'STEEL') && isOut;
  const showSignatureField = selectedCategory === 'CYLINDER' && (isOut || isExchange);
  const isSignatureRequired = showSignatureField;
  const isPhotoRequired = selectedCategory === 'CYLINDER' && (isOut || isExchange);
  const isPhotoOptional = selectedCategory === 'STEEL' || selectedCategory === 'PAINT' || isAdjustment;

  const transactionTypeHint = uiText.transactions.typeHints[
    formData.type as keyof typeof uiText.transactions.typeHints
  ];

  const quantityLabel = isDirectEdit ? uiText.transactions.physicalStockLabel : uiText.transactions.qty;
  const quantityHint = isIn || isOut
    ? uiText.transactions.qtyPerUnitHint
    : isDirectEdit
      ? uiText.transactions.physicalCountNote
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission

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
        photo_url: photos.length > 0 ? photos[0] : null,
        signature_url: signature
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{uiText.transactions.title}</h2>
          <p className="text-muted-foreground">{uiText.transactions.desc}</p>
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
            <Label>{uiText.transactions.item}</Label>
            <Select value={formData.item_id} onValueChange={v => setFormData({ ...formData, item_id: v })}>
              <SelectTrigger><SelectValue placeholder={uiText.transactions.selectItem} /></SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{uiText.transactions.type}</Label>
            <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">{uiText.transactions.stockIn}</SelectItem>
                <SelectItem value="OUT">{uiText.transactions.stockOut}</SelectItem>
                <SelectItem value="EXCHANGE">{uiText.transactions.exchange}</SelectItem>
                <SelectItem value="ADJUSTMENT">{uiText.transactions.adjustment}</SelectItem>
                <SelectItem value="DIRECT_EDIT">{uiText.transactions.directEdit}</SelectItem>
              </SelectContent>
              <p className="text-xs text-muted-foreground">{transactionTypeHint}</p>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{quantityLabel}</Label>
            <Input type="number" step="0.01" required value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
            {quantityHint && <p className="text-xs text-muted-foreground">{quantityHint}</p>}
          </div>
          {showUserField && (
            <div className="space-y-2">
              <Label>{uiText.transactions.user}</Label>
              <Input value={formData.user_name} onChange={e => setFormData({ ...formData, user_name: e.target.value })} placeholder={uiText.transactions.userPlaceholder} />
            </div>
          )}
          {showShipField && (
            <div className="space-y-2">
              <Label>
                {uiText.transactions.ship}
                {isShipRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input required={isShipRequired} value={formData.ship_name} onChange={e => setFormData({ ...formData, ship_name: e.target.value })} />
            </div>
          )}
          <div className="space-y-2">
            <Label>{uiText.transactions.notes}</Label>
            <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>
              {uiText.transactions.photo}
              {isPhotoRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input type="file" multiple accept="image/*" onChange={handlePhotoChange} />
            {isPhotoRequired && photos.length === 0 && (
              <p className="text-xs text-destructive">{uiText.transactions.photoRequired}</p>
            )}
            {!isPhotoRequired && isPhotoOptional && (
              <p className="text-xs text-muted-foreground">{uiText.transactions.photoOptional}</p>
            )}
          </div>

          {showSignatureField && (
            <div className="space-y-2">
              <Label>
                {uiText.transactions.signature}
                {isSignatureRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <SignaturePad onSignatureChange={setSignature} />
              {isSignatureRequired && !signature && (
                <p className="text-xs text-destructive">{uiText.transactions.signatureRequired}</p>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitDisabled}>
              {isSubmitting ? 'Saving...' : 'Submit'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
