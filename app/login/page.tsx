"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { setAuthToken } from "@/lib/auth";
import { toast } from "@/lib/use-toast";

const VITOGAZ_GREEN = "#008B7F";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = "Email ou mot de passe incorrect";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Réponse invalide du serveur");
      }

      setAuthToken(data.access_token);

      toast({
        title: "Connexion réussie !",
        description: `Bienvenue ${email}`,
        variant: "success",
      });

      router.push("/");
    } catch (error: any) {
      console.error("Erreur de connexion :", error);
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, #f0faf9 0%, #e6f4f3 100%)` }}
    >
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-1 text-center pb-8 pt-10">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo-vito-dark.png"
              alt="VitoByVitogaz"
              width={160}
              height={54}
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Backoffice</CardTitle>
          <p className="text-sm text-gray-500">Vitogaz Madagascar</p>
        </CardHeader>

        <CardContent className="pb-10">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@vitogaz.mg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  href="/login/forgot-password"
                  className="text-xs hover:underline transition-colors"
                  style={{ color: VITOGAZ_GREEN }}
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full text-white mt-2"
              style={{ backgroundColor: VITOGAZ_GREEN }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Se connecter
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}