import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Users, Globe, DollarSign, ChefHat, Building2, Lock } from 'lucide-react';
import BusinessSelector from './BusinessSelector';
import BusinessUserManager from './BusinessUserManager';
import PasswordChangeForm from './PasswordChangeForm';
import DebugSettings from './DebugSettings';
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
  const { loading: businessLoading, currentBusiness, businesses, userRole } = useBusinessContext();
  
  console.log('SettingsManager render - businessLoading:', businessLoading, 'currentBusiness:', currentBusiness, 'businesses:', businesses, 'userRole:', userRole);
  
  const [settings, setSettings] = useState<AppSettings>({
    language: 'es',
    currency: 'MXN',
    ingredientManagement: false
  });

  const handleSettingChange = (key: keyof AppSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando ajustes...</p>
        </div>
      </div>
    );
  }

  // Debug: Si no hay business pero tampoco está cargando, mostrar error
  if (!businessLoading && !currentBusiness && businesses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error de Acceso</h2>
          <p className="text-muted-foreground mb-4">
            No se pudo cargar la información del negocio. 
            <br />
            Usuario: {businesses.length} negocios encontrados
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc' }}>
      {/* Debug Component - Remove this after fixing */}
      <DebugSettings />
      
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
          Ajustes
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '8px' }}>
          Configura las opciones de tu restaurante
        </p>
        {currentBusiness && (
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Negocio actual: <span style={{ fontWeight: '600', color: '#1f2937' }}>{currentBusiness.name}</span>
          </p>
        )}
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
          Selector de Negocio
        </h2>
        <BusinessSelector />
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
          Gestión de Usuarios
        </h2>
        <BusinessUserManager />
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px',
        padding: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
          Cambiar Contraseña
        </h2>
        <PasswordChangeForm />
      </div>
    </div>
  );

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Negocio</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Contraseña</span>
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
          <Card>
            <CardHeader>
              <CardTitle>Selector de Negocio</CardTitle>
            </CardHeader>
            <CardContent>
              <BusinessSelector />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <BusinessUserManager />
        </TabsContent>

        <TabsContent value="password" className="space-y-6">
          <PasswordChangeForm />
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