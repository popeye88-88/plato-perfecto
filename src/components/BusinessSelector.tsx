import { useBusinessContext } from '@/contexts/BusinessContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';

export default function BusinessSelector() {
  const { currentBusiness, businesses, switchBusiness, loading } = useBusinessContext();

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Negocio Actual
        </Label>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Negocio Actual
        </Label>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">No tienes negocios asignados</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 1) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Negocio Actual
        </Label>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium">{currentBusiness?.name || businesses[0].name}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="business-select" className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        Cambiar de Negocio
      </Label>
      <Select 
        value={currentBusiness?.id || businesses[0]?.id || ''} 
        onValueChange={switchBusiness}
      >
        <SelectTrigger id="business-select">
          <SelectValue placeholder="Selecciona un negocio" />
        </SelectTrigger>
        <SelectContent>
          {businesses.map((business) => (
            <SelectItem key={business.id} value={business.id}>
              {business.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Todos los datos del dashboard se actualizarán según el negocio seleccionado
      </p>
    </div>
  );
}