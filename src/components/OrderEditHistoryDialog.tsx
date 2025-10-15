import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface OrderEditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

interface EditHistory {
  id: string;
  edited_by: string | null;
  edit_type: string;
  changes: any;
  created_at: string;
}

export default function OrderEditHistoryDialog({ open, onOpenChange, orderId }: OrderEditHistoryDialogProps) {
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId && open) {
      fetchHistory();
    }
  }, [orderId, open]);

  const fetchHistory = async () => {
    if (!orderId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_edit_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching edit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChanges = (changes: any) => {
    if (typeof changes === 'object') {
      return (
        <div className="space-y-1 text-sm">
          {Object.entries(changes).map(([key, value]) => (
            <div key={key}>
              <span className="font-medium">{key}:</span> {JSON.stringify(value)}
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-sm">{JSON.stringify(changes)}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Historial de Ediciones</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay historial de ediciones</div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{entry.edit_type}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                    </span>
                  </div>
                  {entry.edited_by && (
                    <div className="text-sm text-muted-foreground">
                      Editado por: {entry.edited_by}
                    </div>
                  )}
                  <div className="mt-2">
                    {renderChanges(entry.changes)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
