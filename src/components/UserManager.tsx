import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Settings, UserPlus } from 'lucide-react';

export default function UserManager() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra el equipo de tu restaurante</p>
        </div>
        
        <Button className="bg-gradient-primary hover:opacity-90">
          <UserPlus className="h-4 w-4 mr-2" />
          Agregar Usuario
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
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
      </div>
    </div>
  );
}