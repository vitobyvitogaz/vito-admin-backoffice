"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Image as ImageIcon, X, Upload } from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/use-toast";
import Image from "next/image";

const API_URL = 'https://vito-backend-supabase.onrender.com/api/v1';

interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string | null;
  is_active: boolean;
}

export default function SettingsPage() {
  const [heroBannerUrl, setHeroBannerUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings/hero_banner_url`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }
      
      const data: AppSetting = await response.json();
      setHeroBannerUrl(data.setting_value);
      setPreviewUrl(data.setting_value);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la bannière actuelle",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image (JPG, PNG, WebP, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validation taille
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5 MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/settings/upload-hero-banner`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur upload');
      }

      const data = await response.json();

      setHeroBannerUrl(data.file_url);
      setPreviewUrl(data.file_url);

      toast({
        title: "Succès !",
        description: "Bannière uploadée et mise à jour avec succès",
      });

      // Rafraîchir les settings
      await fetchSettings();

    } catch (error) {
      console.error("Erreur upload:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'upload de la bannière",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePreview = () => {
    setPreviewUrl("");
    setHeroBannerUrl("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vito Admin</h1>
              <p className="text-sm text-gray-500 mt-1">
                Paramètres de l'application
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">← Retour Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex gap-6">
            <Link
              href="/"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Dashboard
            </Link>
            <Link
              href="/resellers"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Revendeurs
            </Link>
            <Link
              href="/delivery-companies"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Livraisons
            </Link>
            <Link
              href="/documents"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Documents
            </Link>
            <Link
              href="/promotions"
              className="px-3 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              Promotions
            </Link>
            <Link
              href="/admin/settings"
              className="px-3 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
            >
              Paramètres
            </Link>
          </div>
        </div>
      </nav>

      <main className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Paramètres de l'application</h2>
            <p className="text-sm text-gray-500">
              Gérer la bannière de la page d'accueil
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bannière de la page d'accueil</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                Chargement...
              </div>
            ) : (
              <div className="space-y-6">
                {/* SECTION 1: APERÇU ACTUEL */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Aperçu de la bannière actuelle
                  </h3>
                  
                  {previewUrl ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-64 md:h-96 border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100">
                        <Image
                          src={previewUrl}
                          alt="Bannière hero actuelle"
                          fill
                          className="object-cover"
                          priority
                        />
                        <button
                          type="button"
                          onClick={handleRemovePreview}
                          className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                          title="Supprimer et changer la bannière"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        📌 Cette bannière est actuellement affichée sur la page d'accueil du PWA
                      </p>
                      <p className="text-xs text-blue-600">
                        💡 Cliquez sur X pour changer la bannière
                      </p>
                    </div>
                  ) : (
                    <div className="w-full h-64 md:h-96 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50">
                      <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-sm">Aucune bannière configurée</p>
                    </div>
                  )}
                </div>

                {/* SECTION 2: UPLOAD NOUVELLE BANNIÈRE */}
                {!previewUrl && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Uploader une nouvelle bannière
                    </h3>
                    
                    <div>
                      <Label htmlFor="banner">
                        Sélectionner une image (JPG, PNG, WebP)
                      </Label>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <Input
                            id="banner"
                            type="file"
                            accept="image/*"
                            onChange={handleBannerUpload}
                            disabled={uploading}
                            className="flex-1"
                          />
                          {uploading && (
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                              <Upload className="w-4 h-4 animate-pulse" />
                              Upload en cours...
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          ℹ️ Recommandations : Format paysage (16:9), taille maximale 5 MB, résolution 1920x1080px ou plus
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: INFORMATIONS */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    ℹ️ Informations importantes
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• La bannière s'affiche sur la page d'accueil du PWA Vito</li>
                    <li>• Le changement est visible immédiatement après l'upload</li>
                    <li>• Format recommandé : 1920x1080px (16:9)</li>
                    <li>• Formats acceptés : JPG, PNG, WebP</li>
                    <li>• Taille maximale : 5 MB</li>
                  </ul>
                </div>

                {/* SECTION 4: URL ACTUELLE */}
                {heroBannerUrl && (
                  <div className="space-y-2">
                    <Label>URL de la bannière actuelle</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={heroBannerUrl}
                        readOnly
                        className="flex-1 bg-gray-50 text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(heroBannerUrl);
                          toast({
                            title: "Copié !",
                            description: "URL copiée dans le presse-papier",
                          });
                        }}
                      >
                        Copier
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}