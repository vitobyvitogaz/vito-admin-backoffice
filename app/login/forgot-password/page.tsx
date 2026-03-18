"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
//import { supabase } from "@/lib/supabase";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/lib/use-toast";

const VITOGAZ_GREEN = "#008B7F";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login/reset-password`,
      });

      if (error) throw error;

      setSent(true);
    } catch (error: any) {
      console.error("Erreur reset password:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email de réinitialisation",
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
            Mot de passe oublié
          </CardTitle>
          <p className="text-sm text-gray-500">
            Saisissez votre email pour recevoir un lien de réinitialisation
          </p>
        </CardHeader>

        <CardContent className="pb-10">
          {sent ? (
            <div className="text-center space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ backgroundColor: "#e6f4f3" }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: VITOGAZ_GREEN }} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Email envoyé !</p>
                <p className="text-sm text-gray-500">
                  Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
                  Vérifiez votre boîte de réception.
                </p>
              </div>
              <p className="text-xs text-gray-400">
                Le lien expire dans 24 heures. Vérifiez aussi vos spams.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline mt-2"
                style={{ color: VITOGAZ_GREEN }}
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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

              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: VITOGAZ_GREEN }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer le lien
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm hover:underline transition-colors"
                  style={{ color: VITOGAZ_GREEN }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}