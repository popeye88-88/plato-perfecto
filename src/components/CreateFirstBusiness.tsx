import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChefHat, LogOut } from 'lucide-react';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function CreateFirstBusiness() {
  const { addBusiness } = useBusinessContext();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await addBusiness({ name: name.trim(), description: description.trim() || undefined, menuItems: [] });
      toast({ title: 'Negocio creado', description: 'Bienvenido a RestauranteOS' });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el negocio',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 bg-gradient-primary rounded-xl flex items-center justify-center">
            <ChefHat className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Bienvenido a RestauranteOS</CardTitle>
          <p className="text-muted-foreground text-sm">Comienza creando tu primer negocio</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="bizName">Nombre del negocio</Label>
              <Input
                id="bizName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Restaurante El Buen Sabor"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="bizDesc">Descripción (opcional)</Label>
              <Input
                id="bizDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Una breve descripción"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              {submitting ? 'Creando...' : 'Crear negocio'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => logout()}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
