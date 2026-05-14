import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Users, Globe, DollarSign, UserPlus, Building2, Plus, Edit2, Trash2, LogOut, Share2, Truck, Lock, History } from 'lucide-react';
import { useBusinessContext, type BusinessRole } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, ROLE_LABELS } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const { currentUser, logout, getUsers } = useAuth();
  const { toast } = useToast();
  const { can, isOwner, isManager, role: myRole } = usePermissions();
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
  const [selectedUserForShare, setSelectedUserForShare] = useState<string>('');
  const [selectedBusinessForShare, setSelectedBusinessForShare] = useState<string>('');
  const [selectedRoleForShare, setSelectedRoleForShare] = useState<BusinessRole>('staff');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [roleHistoryRefresh, setRoleHistoryRefresh] = useState(0);

  type RoleHistoryEntry = {
    date: string;
    actorId: string;
    actorName: string;
    targetId: string;
    targetName: string;
    fromRole?: BusinessRole;
    toRole: BusinessRole;
  };

  const getRoleHistory = (businessId: string): RoleHistoryEntry[] => {
    try {
      const raw = localStorage.getItem(`roleHistory_${businessId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const logRoleChange = (
    businessId: string,
    targetUserId: string,
    fromRole: BusinessRole | undefined,
    toRole: BusinessRole
  ) => {
    const targetUser = allUsers.find(u => u.id === targetUserId);
    const entry: RoleHistoryEntry = {
      date: new Date().toISOString(),
      actorId: currentUser?.id || '',
      actorName: currentUser?.username || currentUser?.email || 'Desconocido',
      targetId: targetUserId,
      targetName: targetUser?.username || targetUser?.email || targetUserId,
      fromRole,
      toRole,
    };
    const existing = getRoleHistory(businessId);
    localStorage.setItem(`roleHistory_${businessId}`, JSON.stringify([entry, ...existing].slice(0, 200)));
    setRoleHistoryRefresh(v => v + 1);
  };

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

  // Load all users (Supabase or localStorage)
  useEffect(() => {
    getUsers().then(setAllUsers).catch(() => setAllUsers([]));
  }, [getUsers]);

  const handleShareBusiness = () => {
    const businessId = selectedBusinessForShare || currentBusiness?.id;
    if (!businessId || !selectedUserForShare) {
      toast({
        title: "Error",
        description: "Debes seleccionar usuario y negocio",
        variant: "destructive"
      });
      return;
    }

    if (selectedUserForShare === currentUser?.id) {
      toast({
        title: "Error",
        description: "No puedes compartir el negocio contigo mismo",
        variant: "destructive"
      });
      return;
    }

    shareBusinessWithUser(businessId, selectedUserForShare, selectedRoleForShare);
    setSelectedUserForShare('');
    setSelectedBusinessForShare('');
    setSelectedRoleForShare('staff');
    setIsShareDialogOpen(false);
    
    // Log role assignment to history
    if (currentBusiness?.id) {
      logRoleChange(currentBusiness.id, selectedUserForShare, undefined, selectedRoleForShare);
    }

    toast({
      title: "Negocio compartido",
      description: `Acceso asignado como ${ROLE_LABELS[selectedRoleForShare]}`
    });
  };

  const isOwnerOfCurrentBusiness = currentBusiness && currentUser && getUserRole(currentBusiness.id, currentUser.id) === 'owner';
  const businessesWhereOwner = businesses.filter(b => currentUser && getUserRole(b.id, currentUser.id) === 'owner');

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

      {(() => {
        const visibleTabs = [
          can.viewSettingsNegocio && { value: 'business', label: 'Negocio', icon: Building2 },
          can.viewSettingsUsuarios && { value: 'users', label: 'Usuarios', icon: Users },
          can.viewSettingsIdioma && { value: 'language', label: 'Idioma', icon: Globe },
        ].filter(Boolean) as { value: string; label: string; icon: typeof Building2 }[];
        const defaultTab = visibleTabs[0]?.value || 'language';
        const colsClass = visibleTabs.length === 1 ? 'grid-cols-1' : visibleTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
        return (
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className={`grid w-full ${colsClass}`}>
          {visibleTabs.map(t => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            );
          })}
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

                    {/* Share Business Section - solo para owners */}
                    {can.inviteStaff && (
                    <div className="p-4 border border-border rounded-lg bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-foreground">Invitar Usuario</h4>
                        <Dialog open={isShareDialogOpen} onOpenChange={(open) => {
                          setIsShareDialogOpen(open);
                          if (!open) {
                            setSelectedUserForShare('');
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
                                    {businessesWhereOwner.map((b) => (
                                      <SelectItem key={b.id} value={b.id}>
                                        {b.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="shareUser">Usuario</Label>
                                <Select value={selectedUserForShare} onValueChange={setSelectedUserForShare}>
                                  <SelectTrigger id="shareUser">
                                    <SelectValue placeholder="Selecciona un usuario" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allUsers
                                      .filter(user => user.id !== currentUser?.id)
                                      .filter(user => {
                                        const bizId = selectedBusinessForShare || currentBusiness?.id;
                                        if (!bizId) return true;
                                        const usersWithAccess = getBusinessUsersWithRoles(bizId).map(u => u.userId);
                                        return !usersWithAccess.includes(user.id);
                                      })
                                      .map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                          {user.username}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {(selectedBusinessForShare || currentBusiness?.id) && allUsers
                                  .filter(user => user.id !== currentUser?.id)
                                  .filter(user => {
                                    const bizId = selectedBusinessForShare || currentBusiness?.id;
                                    if (!bizId) return true;
                                    const usersWithAccess = getBusinessUsersWithRoles(bizId).map(u => u.userId);
                                    return !usersWithAccess.includes(user.id);
                                  })
                                  .length === 0 && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Todos los usuarios ya tienen acceso a este negocio.
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor="shareRole">Tipo de permiso</Label>
                                <Select value={selectedRoleForShare} onValueChange={(v) => setSelectedRoleForShare(v as BusinessRole)}>
                                  <SelectTrigger id="shareRole">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {can.inviteOwner && (
                                      <SelectItem value="owner">{ROLE_LABELS.owner} (acceso total)</SelectItem>
                                    )}
                                    {can.inviteManager && (
                                      <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
                                    )}
                                    {can.inviteStaff && (
                                      <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                                    )}
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
                              const user = allUsers.find(u => u.id === userId);
                              return (
                                <div key={userId} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span>{user?.username || user?.email || userId}</span>
                                  <span className="text-xs font-medium text-primary">
                                    ({ROLE_LABELS[role]})
                                  </span>
                                  {role === 'owner' && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Lock className="h-3 w-3 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>No se puede modificar</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {userId === currentUser?.id && (
                                    <span className="text-xs text-primary">(Tú)</span>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-sm text-muted-foreground">Solo tú tienes acceso</div>
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

          {/* Workflow Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Flujo de Órdenes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Etapa de Entrega</h4>
                  <p className="text-sm text-muted-foreground">
                    Activa o desactiva la etapa 'Entregando' en el flujo de órdenes
                  </p>
                </div>
                <Switch
                  checked={currentBusiness?.enableEntregandoStage ?? true}
                  disabled={!currentBusiness}
                  onCheckedChange={(checked) => {
                    if (!currentBusiness) return;
                    updateBusiness(currentBusiness.id, { enableEntregandoStage: checked });
                    toast({
                      title: checked ? "Etapa activada" : "Etapa desactivada",
                      description: checked
                        ? "La etapa 'Entregando' está habilitada en el flujo de órdenes"
                        : "Las órdenes pasarán directamente de 'Preparando' a 'Cobrando'"
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Currency Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Moneda
              </CardTitle>
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
          </div>

          {currentBusiness ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Miembros del negocio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getBusinessUsersWithRoles(currentBusiness.id).map(({ userId, role: userRole }) => {
                      const user = allUsers.find(u => u.id === userId);
                      const isTargetOwner = userRole === 'owner';
                      // Owner can change role of managers and staff (not owners)
                      // Manager can only change staff roles
                      const canChange = !isTargetOwner && userId !== currentUser?.id && (
                        (isOwner && (userRole === 'manager' || userRole === 'staff')) ||
                        (isManager && userRole === 'staff')
                      );
                      const availableRoles: BusinessRole[] = isOwner
                        ? ['manager', 'staff']
                        : ['staff'];
                      return (
                        <div key={userId} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg bg-card">
                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-foreground truncate">
                              {user?.username || user?.email || userId}
                            </span>
                            {userId === currentUser?.id && (
                              <span className="text-xs text-primary">(Tú)</span>
                            )}
                            {isTargetOwner && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>No se puede modificar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {canChange ? (
                              <Select
                                value={userRole}
                                onValueChange={(v) => {
                                  const newRole = v as BusinessRole;
                                  if (newRole === userRole) return;
                                  shareBusinessWithUser(currentBusiness.id, userId, newRole);
                                  logRoleChange(currentBusiness.id, userId, userRole, newRole);
                                  toast({
                                    title: 'Rol actualizado',
                                    description: `Nuevo rol: ${ROLE_LABELS[newRole]}`,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles.map(r => (
                                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm font-medium text-primary px-2">
                                {ROLE_LABELS[userRole]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {getBusinessUsersWithRoles(currentBusiness.id).length === 0 && (
                      <p className="text-sm text-muted-foreground">No hay miembros aún.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {can.viewRoleHistory && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Historial de roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const history = getRoleHistory(currentBusiness.id);
                      void roleHistoryRefresh;
                      if (history.length === 0) {
                        return <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>;
                      }
                      return (
                        <div className="space-y-2">
                          {history.map((h, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground border-l-2 border-border pl-3">
                              [{new Date(h.date).toLocaleString('es-ES')}] {h.actorName} cambió el rol de {h.targetName} {h.fromRole ? `de ${ROLE_LABELS[h.fromRole]} ` : ''}a {ROLE_LABELS[h.toRole]}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Selecciona un negocio para gestionar usuarios.
              </CardContent>
            </Card>
          )}
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

      </Tabs>
        );
      })()}
    </div>
  );
}