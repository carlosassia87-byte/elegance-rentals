import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import logoAsset from "@/assets/logo.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — La Casa del Disfraz" },
      { name: "description", content: "Inicia sesión en el panel de administración de La Casa del Disfraz." },
      { property: "og:title", content: "Ingresar — La Casa del Disfraz" },
      { property: "og:description", content: "Inicia sesión en el panel de administración de La Casa del Disfraz." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/admin" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Usuario creado. Ahora avísanos para asignarle el rol de administrador.");
    setMode("login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/90 via-background to-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo y marca */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-900/10">
            <img
              src={logoAsset.url}
              alt="La Casa del Disfraz"
              className="h-28 w-auto drop-shadow-sm sm:h-36"
            />
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Para toda ocasión, sin importar tu edad
          </p>
        </div>

        <Card className="border-emerald-900/10 shadow-lg shadow-emerald-900/5">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {mode === "login" ? "Bienvenido de nuevo" : "Crear usuario"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Ingresa tus credenciales para continuar."
                : "Crea la cuenta principal del negocio."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={loading}
              >
                {loading
                  ? "Procesando..."
                  : mode === "login"
                    ? "Ingresar"
                    : "Crear cuenta"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
