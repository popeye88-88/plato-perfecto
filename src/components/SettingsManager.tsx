import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Users, Globe, DollarSign, UserPlus, ChefHat, Building2, Plus, Edit2, Trash2 } from 'lucide-react';
import { useBusinessContext } from '@/contexts/BusinessContext';

interface AppSettings {
  language: 'es' | 'en';
  currency: 'MXN' | 'EUR' | 'USD';
  ingredientManagement: boolean;
}

const currencySymbols = {
  MXN: '$',
  EUR: '€',
  USD: '$'
};

const languageLabels = {
  es: 'Español',
  en: 'English'
};

export default function SettingsManager() {
  const { currentBusiness, businesses, setCurrentBusiness, addBusiness, updateBusiness, deleteBusiness } = useBusinessContext();
  const [settings, setSettings] = useState<AppSettings>({
    language: 'es',
    currency: 'MXN',
    ingredientManagement: false
  });
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<any>(null);
  const [businessForm, setBusinessForm] = useState({
    name: '',
    description: ''
  });

  const handleSettingChange = (key: keyof AppSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleBusinessSubmit = () => {
    if (!businessForm.name.trim()) return;

    if (editingBusiness) {
      updateBusiness(editingBusiness.id, {
        name: businessForm.name,
        description: businessForm.description
      });
    } else {
      addBusiness({
        name: businessForm.name,
        description: businessForm.description,
        menuItems: []
      });
    }

    setBusinessForm({ name: '', description: '' });
    setEditingBusiness(null);
    setIsBusinessDialogOpen(false);
  };

  const handleEditBusiness = (business: any) => {
    setEditingBusiness(business);
    setBusinessForm({
      name: business.name,
      description: business.description || ''
    });
    setIsBusinessDialogOpen(true);
  };

  const handleDeleteBusiness = (businessId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este negocio? Esta acción no se puede deshacer.')) {
      deleteBusiness(businessId);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Ajustes</h1>
        <p className="text-muted-foreground">Configura las opciones de tu restaurante</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Negocio</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="language" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Idioma</span>
          </TabsTrigger>
          <TabsTrigger value="currency" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Moneda</span>
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            <span className="hidden sm:inline">Ingredientes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Gestión de Negocios</h2>
              <p className="text-muted-foreground">Administra tus negocios y sus configuraciones</p>
            </div>
            
            <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Negocio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBusiness ? 'Editar Negocio' : 'Crear Nuevo Negocio'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessName">Nombre del Negocio</Label>
                    <Input
                      id="businessName"
                      value={businessForm.name}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Restaurante El Buen Sabor"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessDescription">Descripción (opcional)</Label>
                    <Input
                      id="businessDescription"
                      value={businessForm.description}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción del negocio"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsBusinessDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleBusinessSubmit} className="bg-gradient-primary hover:opacity-90">
                      {editingBusiness ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Current Business Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Negocio Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentBusiness">Seleccionar Negocio</Label>
                  <Select 
                    value={currentBusiness?.id || ''} 
                    onValueChange={(value) => {
                      const business = businesses.find(b => b.id === value);
                      setCurrentBusiness(business || null);
                    }}
                  >
                    <SelectTrigger>
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
                </div>
                
                {currentBusiness && (
                  <div className="p-4 border border-border rounded-lg bg-card">
                    <h3 className="font-semibold text-foreground mb-2">{currentBusiness.name}</h3>
                    {currentBusiness.description && (
                      <p className="text-sm text-muted-foreground mb-2">{currentBusiness.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Creado: {currentBusiness.createdAt.toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Elementos del menú: {currentBusiness.menuItems.length}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business List */}
          <Card>
            <CardHeader>
              <CardTitle>Todos los Negocios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {businesses.map((business) => (
                  <div key={business.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{business.name}</h4>
                      {business.description && (
                        <p className="text-sm text-muted-foreground">{business.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Menú: {business.menuItems.length} elementos
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditBusiness(business)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {businesses.length > 1 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteBusiness(business.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Gestión de Usuarios</h2>
              <p className="text-muted-foreground">Administra el equipo de tu restaurante</p>
            </div>
            
            <Button className="bg-gradient-primary hover:opacity-90">
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Usuario
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Funcionalidad en Desarrollo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Gestión de Usuarios
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Esta sección permitirá gestionar los usuarios del sistema, asignar roles 
                  y permisos para el personal del restaurante.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• Agregar y gestionar empleados</div>
                  <div>• Asignar roles (Administrador, Mesero, Chef)</div>
                  <div>• Control de permisos por módulo</div>
                  <div>• Horarios y turnos de trabajo</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Idioma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Idioma de la aplicación</Label>
                <Select 
                  value={settings.language} 
                  onValueChange={(value) => handleSettingChange('language', value)}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Idioma actual: {languageLabels[settings.language]}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Moneda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda principal</Label>
                <Select 
                  value={settings.currency} 
                  onValueChange={(value) => handleSettingChange('currency', value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MXN">MXN - Peso Mexicano ($)</SelectItem>
                    <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                    <SelectItem value="USD">USD - Dólar Americano ($)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Moneda actual: {settings.currency} ({currencySymbols[settings.currency]})
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingredients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Ingredientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="ingredient-management">Activar gestión de ingredientes</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite personalizar ingredientes en los productos del menú
                  </p>
                </div>
                <Switch
                  id="ingredient-management"
                  checked={settings.ingredientManagement}
                  onCheckedChange={(checked) => handleSettingChange('ingredientManagement', checked)}
                />
              </div>
              {settings.ingredientManagement && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    La gestión de ingredientes está activa. Los productos del menú ahora incluyen 
                    opciones para personalizar ingredientes durante la creación de órdenes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}