import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Mail, History, Lock, X, ChevronDown, Trash2, UserPlus } from 'lucide-react';
import { useBusinessContext, type BusinessRole, type RoleHistoryRow, type PendingInvitationRow } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, ROLE_LABELS, ROLE_BADGE_CLASS } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { inviteUserToBusiness } from '@/lib/invitations';
import { supabase } from '@/integrations/supabase/client';

interface MemberProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const dbRoleToApp = (r: string): BusinessRole =>
  r === 'admin' ? 'owner' : r === 'manager' ? 'manager' : 'staff';

export default function UsersTab() {
  const {
    currentBusiness,
    getBusinessUsersWithRoles,
    shareBusinessWithUser,
    removeBusinessMember,
    addRoleHistory,
    fetchRoleHistory,
    fetchPendingInvitations,
    cancelInvitation,
    reload,
  } = useBusinessContext();
  const { currentUser } = useAuth();
  const { can, isOwner, isManager } = usePermissions();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [pending, setPending] = useState<PendingInvitationRow[]>([]);
  const [history, setHistory] = useState<RoleHistoryRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<BusinessRole>('staff');
  const [inviting, setInviting] = useState(false);

  // Confirm dialogs
  const [roleChange, setRoleChange] = useState<{ userId: string; from: BusinessRole; to: BusinessRole } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ userId: string } | null>(null);

  const businessId = currentBusiness?.id;
  const members = businessId ? getBusinessUsersWithRoles(businessId) : [];

  const refresh = useCallback(async () => {
    if (!businessId) return;
    // Profiles for members
    const ids = members.map((m) => m.userId);
    if (ids.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      const map: Record<string, MemberProfile> = {};
      (data ?? []).forEach((p) => { map[p.id] = p as MemberProfile; });
      setProfiles(map);
    }
    setPending(await fetchPendingInvitations(businessId));
    if (can.viewRoleHistory) setHistory(await fetchRoleHistory(businessId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, members.length, can.viewRoleHistory]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!currentBusiness) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Selecciona un negocio para gestionar usuarios.
        </CardContent>
      </Card>
    );
  }

  const ownerCount = members.filter((m) => m.role === 'owner').length;

  const renderMemberLabel = (userId: string) => {
    const p = profiles[userId];
    return p?.full_name || p?.email || userId;
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !businessId) return;
    setInviting(true);
    try {
      const result = await inviteUserToBusiness(
        inviteEmail.trim(),
        isManager && !isOwner ? 'staff' : inviteRole,
        businessId,
        currentBusiness.name
      );
      if (result.status === 'already_member') {
        toast({ title: 'Sin cambios', description: 'Este usuario ya tiene acceso a este negocio' });
      } else if (result.status === 'access_granted') {
        toast({ title: 'Acceso concedido', description: 'El usuario recibirá una notificación.' });
      } else if (result.status === 'invitation_sent') {
        toast({ title: 'Invitación enviada', description: `Invitación enviada a ${inviteEmail.trim()}` });
      } else {
        toast({ title: 'Error', description: result.message ?? 'No se pudo invitar', variant: 'destructive' });
      }
      setInviteEmail('');
      setInviteRole('staff');
      await refresh();
    } finally {
      setInviting(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!roleChange || !businessId) return;
    try {
      await shareBusinessWithUser(businessId, roleChange.userId, roleChange.to);
      await addRoleHistory(businessId, roleChange.userId, roleChange.from, roleChange.to);
      toast({ title: 'Rol actualizado', description: `Nuevo rol: ${ROLE_LABELS[roleChange.to]}` });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setRoleChange(null);
      refresh();
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget || !businessId) return;
    const r = await removeBusinessMember(businessId, removeTarget.userId);
    if (!r.success) {
      toast({ title: 'No se puede eliminar', description: r.error, variant: 'destructive' });
    } else {
      toast({ title: 'Acceso eliminado' });
    }
    setRemoveTarget(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Gestión de Usuarios</h2>
        <p className="text-muted-foreground">Administra el equipo de tu restaurante</p>
      </div>

      {/* INVITE */}
      {(can.inviteStaff || can.inviteManager || can.inviteOwner) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invitar Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
              <div>
                <Label htmlFor="inviteEmail">Email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <Label>Rol</Label>
                {isOwner ? (
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as BusinessRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">{ROLE_LABELS.owner}</SelectItem>
                      <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
                      <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-10 flex items-center px-3 border border-input rounded-md bg-muted/40 text-sm">
                    {ROLE_LABELS.staff}
                  </div>
                )}
              </div>
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="bg-gradient-primary hover:opacity-90"
              >
                {inviting ? 'Enviando...' : 'Invitar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MEMBERS LIST */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Miembros del negocio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay miembros aún.</p>
            )}
            {members.map(({ userId, role: userRole }) => {
              const isTargetOwner = userRole === 'owner';
              const isSelf = userId === currentUser?.id;
              const profile = profiles[userId];
              const canChangeRole = !isSelf && (
                (isOwner && (userRole === 'manager' || userRole === 'staff')) ||
                (isManager && userRole === 'staff')
              );
              const canRemove = !isSelf && can.removeUser && !isTargetOwner;
              const availableRoles: BusinessRole[] = isOwner ? ['manager', 'staff'] : ['staff'];

              return (
                <div key={userId} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg bg-card flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {profile?.full_name || profile?.email || userId}
                        {isSelf && <span className="ml-2 text-xs text-primary">(Tú)</span>}
                      </div>
                      {profile?.email && profile.full_name && (
                        <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={ROLE_BADGE_CLASS[userRole]}>{ROLE_LABELS[userRole]}</Badge>
                    {isTargetOwner && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>No se puede modificar el rol de un propietario</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {canChangeRole && (
                      <Select
                        value={userRole}
                        onValueChange={(v) => {
                          const newRole = v as BusinessRole;
                          if (newRole === userRole) return;
                          setRoleChange({ userId, from: userRole, to: newRole });
                        }}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {canRemove && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoveTarget({ userId })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* PENDING INVITATIONS */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitaciones pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pending.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg bg-card flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Enviada: {new Date(inv.created_at).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <Badge className={ROLE_BADGE_CLASS[dbRoleToApp(inv.role)]}>
                    {ROLE_LABELS[dbRoleToApp(inv.role)]}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => { await cancelInvitation(inv.id); refresh(); }}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ROLE HISTORY */}
      {can.viewRoleHistory && (
        <Card>
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historial de roles
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((h) => {
                      const date = new Date(h.created_at);
                      const fmt = `${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
                      return (
                        <div key={h.id} className="text-sm text-muted-foreground border-l-2 border-border pl-3">
                          [{fmt}] {renderMemberLabel(h.changed_by)} cambió el rol de {renderMemberLabel(h.target_user_id)}
                          {h.old_role ? ` de ${ROLE_LABELS[dbRoleToApp(h.old_role)]} ` : ' '}
                          a {ROLE_LABELS[dbRoleToApp(h.new_role)]}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Confirm role change */}
      <AlertDialog open={!!roleChange} onOpenChange={(o) => !o && setRoleChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cambiar el rol de {roleChange ? renderMemberLabel(roleChange.userId) : ''}{' '}
              de {roleChange ? ROLE_LABELS[roleChange.from] : ''}{' '}
              a {roleChange ? ROLE_LABELS[roleChange.to] : ''}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm remove */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar acceso</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el acceso de {removeTarget ? renderMemberLabel(removeTarget.userId) : ''} a este negocio?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
