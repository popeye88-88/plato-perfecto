import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OrderEditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export default function OrderEditHistoryDialog({ open, onOpenChange, order }: OrderEditHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historial de Ediciones - Orden {order?.number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            Esta orden ha sido editada. El historial de cambios se mostrará aquí cuando esté disponible.
          </p>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}