import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import { UserPlus, Trash2, Loader2, Mail, Users } from 'lucide-react';

interface BusinessUser {
  id: string;
  user_id: string;
  role: 'admin' | 'staff';
  profiles: {
    full_name: string;
  };
}

export default function BusinessUserManager() {
  const { currentBusiness, userRole, refreshBusinesses } = useBusinessContext();
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      loadUsers();
    }
  }, [currentBusiness]);

  const loadUsers = async () => {
    if (!currentBusiness) return;

    try {
      const { data, error } = await supabase
        .from('business_members')
        .select(`
          id,
          user_id,
          role,
          profiles (
            full_name
          )
        `)
        .eq('business_id', currentBusiness.id);

      if (error) throw error;
      setUsers(data as any || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBusiness) return;

    setSubmitting(true);

    try {
      // Check if user exists
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', inviteEmail)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (!existingUser) {
        toast.error('Este usuario no existe en el sistema. Debe registrarse primero.');
        return;
      }

      // Check if already member
      const { data: existingMember } = await supabase
        .from('business_members')
        .select('id')
        .eq('business_id', currentBusiness.id)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        toast.error('Este usuario ya es miembro del negocio');
        return;
      }

      // Add user to business
      const { error: insertError } = await supabase
        .from('business_members')
        .insert({
          business_id: currentBusiness.id,
          user_id: existingUser.id,
          role: inviteRole
        });

      if (insertError) throw insertError;

      toast.success('Usuario agregado exitosamente');
      setInviteEmail('');
      setInviteRole('staff');
      setIsDialogOpen(false);
      await loadUsers();
      await refreshBusinesses();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error('Error al invitar usuario: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (memberId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario del negocio?')) return;

    try {
      const { error } = await supabase
        .from('business_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Usuario eliminado del negocio');
      await loadUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Error al eliminar usuario');
    }
  };

  if (!currentBusiness) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Selecciona un negocio primero</p>
        </CardContent>
      </Card>
    );
  }

  if (userRole !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Usuarios</CardTitle>
          <CardDescription>Solo los administradores pueden gestionar usuarios</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tienes permisos de administrador en este negocio</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Usuarios del Negocio</h2>
          <p className="text-muted-foreground">Gestiona los usuarios de {currentBusiness.name}</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Agregar Usuario
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay usuarios en este negocio</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.profiles?.full_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? 'Administrador' : 'Staff'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(user.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Usuario al Negocio</DialogTitle>
            <DialogDescription>
              El usuario debe estar registrado en el sistema previamente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email del Usuario</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={submitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                El usuario recibirá acceso a este negocio
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Rol</Label>
              <Select 
                value={inviteRole} 
                onValueChange={(value: 'admin' | 'staff') => setInviteRole(value)}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar Usuario
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}