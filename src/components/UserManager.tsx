import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Edit2, Shield, User, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemUser {
  id: string;
  name: string;
  role: 'admin' | 'user';
  pin: string;
  createdAt: Date;
}

// Mock current user - in real app this would come from authentication
const currentUser: SystemUser = {
  id: '1',
  name: 'Admin Principal',
  role: 'admin',
  pin: '1234',
  createdAt: new Date()
};

export default function UserManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<SystemUser[]>([
    currentUser,
    {
      id: '2',
      name: 'Carlos Mesero',
      role: 'user',
      pin: '5678',
      createdAt: new Date(Date.now() - 86400000)
    }
  ]);
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [changePinUser, setChangePinUser] = useState<SystemUser | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    role: 'user' as 'admin' | 'user',
    pin: ''
  });
  const [newPin, setNewPin] = useState('');

  const handleAddUser = () => {
    if (!newUser.name || !newUser.pin || newUser.pin.length !== 4) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios y el PIN debe tener 4 dígitos",
        variant: "destructive"
      });
      return;
    }

    if (!/^\d{4}$/.test(newUser.pin)) {
      toast({
        title: "Error", 
        description: "El PIN debe contener exactamente 4 números",
        variant: "destructive"
      });
      return;
    }

    const user: SystemUser = {
      id: Date.now().toString(),
      name: newUser.name,
      role: newUser.role,
      pin: newUser.pin,
      createdAt: new Date()
    };

    setUsers([...users, user]);
    setNewUser({ name: '', role: 'user', pin: '' });
    setIsAddUserOpen(false);
    
    toast({
      title: "Usuario creado",
      description: `Usuario ${user.name} creado exitosamente`
    });
  };

  const handleChangePin = () => {
    if (!changePinUser || !newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({
        title: "Error",
        description: "El PIN debe contener exactamente 4 números",
        variant: "destructive"
      });
      return;
    }

    setUsers(users.map(user => 
      user.id === changePinUser.id 
        ? { ...user, pin: newPin }
        : user
    ));

    setChangePinUser(null);
    setNewPin('');
    
    toast({
      title: "PIN actualizado",
      description: "PIN cambiado exitosamente"
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      toast({
        title: "Error",
        description: "No puedes eliminar tu propio usuario",
        variant: "destructive"
      });
      return;
    }

    setUsers(users.filter(user => user.id !== userId));
    toast({
      title: "Usuario eliminado",
      description: "Usuario eliminado exitosamente"
    });
  };

  const canAccessFeature = (userRole: 'admin' | 'user', feature: string) => {
    if (userRole === 'admin') return true;
    
    const restrictedFeatures = ['Dashboard', 'Ajustes-Usuarios', 'Ajustes-Ingredientes', 'Ajustes-Moneda'];
    return !restrictedFeatures.includes(feature);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra el equipo de tu restaurante</p>
        </div>
        
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="userName">Nombre</Label>
                <Input
                  id="userName"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del usuario"
                />
              </div>
              
              <div>
                <Label htmlFor="userRole">Acceso</Label>
                <Select value={newUser.role} onValueChange={(value: 'admin' | 'user') => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Usuario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="userPin">PIN (4 dígitos)</Label>
                <Input
                  id="userPin"
                  type="password"
                  maxLength={4}
                  value={newUser.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNewUser(prev => ({ ...prev, pin: value }));
                  }}
                  placeholder="0000"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddUser}>
                  Crear Usuario
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Administrador
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Usuario
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>••••</TableCell>
                  <TableCell>
                    {user.createdAt.toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChangePinUser(user)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Cambiar PIN
                      </Button>
                      {user.id !== currentUser.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permisos por Rol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" />
                Administrador
              </h4>
              <p className="text-sm text-muted-foreground">
                Acceso completo a todas las funcionalidades del sistema
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                Usuario
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Acceso limitado. Sin acceso a:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Dashboard</li>
                <li>Ajustes - Usuarios</li>
                <li>Ajustes - Ingredientes</li>
                <li>Ajustes - Moneda</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change PIN Dialog */}
      <Dialog open={!!changePinUser} onOpenChange={() => setChangePinUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar PIN - {changePinUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPin">Nuevo PIN (4 dígitos)</Label>
              <Input
                id="newPin"
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setNewPin(value);
                }}
                placeholder="0000"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setChangePinUser(null)}>
                Cancelar
              </Button>
              <Button onClick={handleChangePin}>
                Cambiar PIN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}