"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle, KeyRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { toast } from "@/lib/use-toast";

const VITOGAZ_GREEN = "#008B7F";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "PASSWORD_RECOVERY") {
          setSessionReady(true);
        } else if (event === "SIGNED_IN" && session) {
          setSessionReady(true);
        }
      }
    );

    const timeout = setTimeout(() => {
      setSessionError((prev) => {
        if (!prev) return true;
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const passwordsMatch = password === confirmPassword && confirmPassword !== "";
  const passwordStrong = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordStrong) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 8 caractères", variant: "destructive" });
      return;
    }

    if (!passwordsMatch) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (error: any) {
      console.error("Erreur reset:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de réinitialiser le mot de passe",
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
          <CardTitle className="text-2xl font-bold text-gray-900">
            Nouveau mot de passe
          </CardTitle>
          <p className="text-sm text-gray-500">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </CardHeader>

        <CardContent className="pb-10">
          {/* Lien invalide ou expiré */}
          {sessionError && !sessionReady && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Lien invalide ou expiré</p>
                <p className="text-sm text-gray-500">
                  Ce lien de réinitialisation n'est plus valide. Veuillez en demander un nouveau.
                </p>
              </div>
              <Link
                href="/login/forgot-password"
                className="inline-block text-sm font-medium hover:underline"
                style={{ color: VITOGAZ_GREEN }}
              >
                Demander un nouveau lien
              </Link>
            </div>
          )}

          {/* Chargement session */}
          {!sessionReady && !sessionError && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: VITOGAZ_GREEN }} />
              <p className="text-sm text-gray-500">Vérification du lien...</p>
            </div>
          )}

          {/* Succès */}
          {done && (
            <div className="text-center space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ backgroundColor: "#e6f4f3" }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Mot de passe mis à jour !</p>
                <p className="text-sm text-gray-500">
                  Vous allez être redirigé vers la page de connexion...
                </p>
              </div>
            </div>
          )}

          {/* Formulaire */}
          {sessionReady && !done && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nouveau mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 caractères"
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
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <p className={`text-xs ${passwordStrong ? "text-emerald-600" : "text-red-500"}`}>
                    {passwordStrong ? "✓ Longueur suffisante" : "Minimum 8 caractères requis"}
                  </p>
                )}
              </div>

              {/* Confirmation */}
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-xs ${passwordsMatch ? "text-emerald-600" : "text-red-500"}`}>
                    {passwordsMatch ? "✓ Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: VITOGAZ_GREEN }}
                disabled={loading || !passwordStrong || !passwordsMatch}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Mettre à jour le mot de passe
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}