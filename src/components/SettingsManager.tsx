import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Users, Globe, DollarSign, UserPlus, ChefHat, Building2, Plus, Edit2, Trash2, LogOut, Share2 } from 'lucide-react';
import { useBusinessContext, type BusinessRole } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const { currentBusiness, businesses, setCurrentBusiness, addBusiness, updateBusiness, deleteBusiness, shareBusinessWithUser, getBusinessUsersWithRoles, getUserRole } = useBusinessContext();
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
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
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareUserEmail, setShareUserEmail] = useState('');
  const [selectedBusinessForShare, setSelectedBusinessForShare] = useState<string>('');
  const [selectedRoleForShare, setSelectedRoleForShare] = useState<BusinessRole>('staff');

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

  const handleShareBusiness = () => {
    const businessId = selectedBusinessForShare || currentBusiness?.id;
    if (!businessId || !shareUserEmail.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar el email del usuario y seleccionar un negocio",
        variant: "destructive"
      });
      return;
    }

    // Note: sharing by email requires looking up user ID - for now use email as identifier
    // In production, you'd look up the user by email in profiles table
    toast({
      title: "Función en desarrollo",
      description: "La invitación por email estará disponible próximamente. Por ahora, comparte el acceso directamente desde el panel de Supabase.",
    });
    setShareUserEmail('');
    setSelectedBusinessForShare('');
    setSelectedRoleForShare('staff');
    setIsShareDialogOpen(false);
  };

  const isAdminOfCurrentBusiness = currentBusiness && currentUser && getUserRole(currentBusiness.id, currentUser.id) === 'admin';
  const businessesWhereAdmin = businesses.filter(b => currentUser && getUserRole(b.id, currentUser.id) === 'admin');

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-foreground mb-2">Ajustes</h1>
          <p className="text-sm md:text-base text-muted-foreground">Configura las opciones de tu restaurante</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
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
                  <div className="space-y-4">
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

                    {/* Share Business Section - solo para admins */}
                    {isAdminOfCurrentBusiness && (
                    <div className="p-4 border border-border rounded-lg bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-foreground">Invitar Usuario</h4>
                        <Dialog open={isShareDialogOpen} onOpenChange={(open) => {
                          setIsShareDialogOpen(open);
                          if (!open) {
                            setShareUserEmail('');
                            setSelectedBusinessForShare(currentBusiness?.id || '');
                            setSelectedRoleForShare('staff');
                          } else {
                            setSelectedBusinessForShare(currentBusiness?.id || '');
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Share2 className="h-4 w-4 mr-2" />
                              Invitar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Invitar Usuario al Negocio</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="shareBusiness">Negocio</Label>
                                <Select value={selectedBusinessForShare || currentBusiness?.id} onValueChange={setSelectedBusinessForShare}>
                                  <SelectTrigger id="shareBusiness">
                                    <SelectValue placeholder="Selecciona un negocio" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {businessesWhereAdmin.map((b) => (
                                      <SelectItem key={b.id} value={b.id}>
                                        {b.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="shareUserEmail">Email del usuario</Label>
                                <Input
                                  id="shareUserEmail"
                                  type="email"
                                  value={shareUserEmail}
                                  onChange={(e) => setShareUserEmail(e.target.value)}
                                  placeholder="usuario@email.com"
                                />
                              </div>
                              <div>
                                <Label htmlFor="shareRole">Tipo de permiso</Label>
                                <Select value={selectedRoleForShare} onValueChange={(v) => setSelectedRoleForShare(v as BusinessRole)}>
                                  <SelectTrigger id="shareRole">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Administrador (acceso total)</SelectItem>
                                    <SelectItem value="staff">Personal (sin dashboard ni invitar)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleShareBusiness} className="bg-gradient-primary hover:opacity-90">
                                  Invitar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Usuarios con acceso:</Label>
                        <div className="space-y-1">
                          {getBusinessUsersWithRoles(currentBusiness.id).length > 0 ? (
                            getBusinessUsersWithRoles(currentBusiness.id).map(({ userId, role }) => {
                              return (
                                <div key={userId} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span>{userId === currentUser?.id ? (currentUser?.fullName || currentUser?.email) : userId}</span>
                                  <span className="text-xs font-medium text-primary">
                                    ({role === 'admin' ? 'Administrador' : 'Personal'})
                                  </span>
                                  {userId === currentUser?.id && (
                                    <span className="text-xs text-primary">(Tú)</span>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No hay usuarios con acceso</p>
                          )}
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* All Businesses */}
          <Card>
            <CardHeader>
              <CardTitle>Todos los Negocios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {businesses.map((business) => {
                  const role = currentUser ? getUserRole(business.id, currentUser.id) : undefined;
                  return (
                    <div
                      key={business.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        currentBusiness?.id === business.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => setCurrentBusiness(business)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-foreground">{business.name}</h3>
                        {role === 'admin' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditBusiness(business);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBusiness(business.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {business.description && (
                        <p className="text-sm text-muted-foreground mb-1">{business.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {business.menuItems.length} elementos en el menú
                      </p>
                      {role && (
                        <p className="text-xs text-primary mt-1">
                          {role === 'admin' ? 'Administrador' : 'Personal'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Información del Usuario
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentUser && (
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg bg-card">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{currentUser.email}</p>
                  </div>
                  {currentUser.fullName && (
                    <div className="p-4 border border-border rounded-lg bg-card">
                      <p className="text-sm text-muted-foreground">Nombre</p>
                      <p className="font-medium text-foreground">{currentUser.fullName}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Idioma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="language">Idioma de la aplicación</Label>
                  <Select value={settings.language} onValueChange={(value) => handleSettingChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(languageLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Moneda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currency">Moneda predeterminada</Label>
                  <Select value={settings.currency} onValueChange={(value) => handleSettingChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(currencySymbols).map(([key, symbol]) => (
                        <SelectItem key={key} value={key}>{key} ({symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Gestión de Ingredientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ingredientManagement">Activar gestión de ingredientes</Label>
                  <p className="text-sm text-muted-foreground">
                    Controla el inventario de ingredientes por producto
                  </p>
                </div>
                <Switch
                  id="ingredientManagement"
                  checked={settings.ingredientManagement}
                  onCheckedChange={(checked) => handleSettingChange('ingredientManagement', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
