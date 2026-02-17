import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa email y contraseña",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    if (isSignup) {
      const result = await signup(email.trim(), password, fullName.trim() || undefined, businessName.trim() || undefined);
      setIsLoading(false);
      if (result.success) {
        toast({
          title: "Cuenta creada",
          description: "Revisa tu email para confirmar tu cuenta, o inicia sesión si la confirmación está deshabilitada."
        });
        setIsSignup(false);
      } else {
        toast({
          title: "Error al crear cuenta",
          description: result.error || "Error desconocido",
          variant: "destructive"
        });
      }
    } else {
      const result = await login(email.trim(), password);
      setIsLoading(false);
      if (result.success) {
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido`
        });
      } else {
        toast({
          title: "Error de autenticación",
          description: result.error || "Email o contraseña incorrectos",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              {isSignup ? <UserPlus className="h-8 w-8 text-primary" /> : <LogIn className="h-8 w-8 text-primary" />}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {isSignup ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del negocio</Label>
                  <Input
                    id="businessName"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Nombre de tu restaurante"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                disabled={isLoading}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading 
                ? (isSignup ? 'Creando cuenta...' : 'Iniciando sesión...') 
                : (isSignup ? 'Crear Cuenta' : 'Iniciar Sesión')}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setIsSignup(!isSignup)}
                disabled={isLoading}
              >
                {isSignup ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
