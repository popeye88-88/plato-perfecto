import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPayment: (paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia', removeDeliveryCharge: boolean) => void;
  hasDeliveryCharge: boolean;
  deliveryAmount: number;
}

export default function PaymentDialog({ 
  open, 
  onOpenChange, 
  onConfirmPayment, 
  hasDeliveryCharge, 
  deliveryAmount 
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [removeDeliveryCharge, setRemoveDeliveryCharge] = useState(false);

  const handleConfirm = () => {
    onConfirmPayment(paymentMethod, removeDeliveryCharge);
    setPaymentMethod('efectivo');
    setRemoveDeliveryCharge(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¿Cómo se va a realizar el pago?</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={(value: 'efectivo' | 'tarjeta' | 'transferencia') => setPaymentMethod(value)}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="efectivo" id="efectivo" />
              <Label htmlFor="efectivo" className="flex items-center gap-2 flex-1 cursor-pointer">
                <Banknote className="h-5 w-5 text-success" />
                Efectivo
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="tarjeta" id="tarjeta" />
              <Label htmlFor="tarjeta" className="flex items-center gap-2 flex-1 cursor-pointer">
                <CreditCard className="h-5 w-5 text-primary" />
                Tarjeta
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="transferencia" id="transferencia" />
              <Label htmlFor="transferencia" className="flex items-center gap-2 flex-1 cursor-pointer">
                <ArrowLeftRight className="h-5 w-5 text-accent" />
                Transferencia
              </Label>
            </div>
          </RadioGroup>

          {hasDeliveryCharge && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="removeDelivery" 
                  checked={removeDeliveryCharge}
                  onCheckedChange={(checked) => setRemoveDeliveryCharge(checked as boolean)}
                />
                <Label htmlFor="removeDelivery" className="text-sm cursor-pointer">
                  Quitar cargo por entrega (${deliveryAmount.toFixed(2)})
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Marca esta opción si deseas eliminar el cargo por entrega de esta orden.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleConfirm}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              Confirmar Pago
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}