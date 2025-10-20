import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, DollarSign, Smartphone } from 'lucide-react';

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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Procesar Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-4">
            <Label>Método de Pago</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="efectivo"
                  name="paymentMethod"
                  value="efectivo"
                  checked={paymentMethod === 'efectivo'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'efectivo')}
                />
                <Label htmlFor="efectivo" className="flex items-center space-x-2 cursor-pointer">
                  <DollarSign className="h-4 w-4" />
                  <span>Efectivo</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="tarjeta"
                  name="paymentMethod"
                  value="tarjeta"
                  checked={paymentMethod === 'tarjeta'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'tarjeta')}
                />
                <Label htmlFor="tarjeta" className="flex items-center space-x-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  <span>Tarjeta</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="transferencia"
                  name="paymentMethod"
                  value="transferencia"
                  checked={paymentMethod === 'transferencia'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'transferencia')}
                />
                <Label htmlFor="transferencia" className="flex items-center space-x-2 cursor-pointer">
                  <Smartphone className="h-4 w-4" />
                  <span>Transferencia</span>
                </Label>
              </div>
            </div>
          </div>

          {/* Delivery Charge Option */}
          {hasDeliveryCharge && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="removeDelivery"
                  checked={removeDeliveryCharge}
                  onCheckedChange={(checked) => setRemoveDeliveryCharge(checked as boolean)}
                />
                <Label htmlFor="removeDelivery" className="cursor-pointer">
                  Remover cargo por entrega (${deliveryAmount.toFixed(2)})
                </Label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="bg-gradient-primary hover:opacity-90">
              Confirmar Pago
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}