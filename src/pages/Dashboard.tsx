import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { uiText } from '@/lib/uiText';

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const res = await axios.get('/api/items');
      setItems(res.data);
    } catch {
      setFetchError(uiText.dashboard.fetchError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{uiText.dashboard.title}</h2>
        <p className="text-muted-foreground">{uiText.dashboard.desc}</p>
      </div>

      {fetchError && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
          {fetchError}
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{uiText.items.id}</TableHead>
              <TableHead>{uiText.items.name}</TableHead>
              <TableHead>{uiText.items.category}</TableHead>
              <TableHead>{uiText.items.stock}</TableHead>
              <TableHead>{uiText.items.unit}</TableHead>
              <TableHead>{uiText.items.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {uiText.common.loading}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {fetchError ? uiText.common.noData : uiText.dashboard.noDataDesc}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="font-bold">{item.current_stock}</TableCell>
                  <TableCell>{item.stock_unit}</TableCell>
                  <TableCell>
                    {item.status && (
                      <Badge variant={item.status === 'normal' ? 'default' : 'destructive'}>
                        {item.status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
