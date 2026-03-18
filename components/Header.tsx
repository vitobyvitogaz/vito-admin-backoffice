"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { removeAuthToken } from "@/lib/auth";
import { toast } from "@/lib/use-toast";
import Image from "next/image";

const VITOGAZ_GREEN = "#008B7F";

interface HeaderProps {
  title?: string;
  subtitle: string;
}

export function Header({ subtitle }: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    removeAuthToken();
    toast({
      title: "Déconnexion réussie",
      description: "À bientôt !",
    });
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">

          {/* Branding + contexte page */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Image
                src="/vito-logo-dark.png"
                alt="VitoByVitogaz"
                width={120}
                height={40}
                className="object-contain"
                priority
              />
            </div>

            {/* Séparateur vertical */}
            <div className="h-7 w-px bg-gray-200" />

            {/* Page courante */}
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>

          {/* Zone utilisateur */}
          <div className="flex items-center gap-3">
            {/* Infos texte */}
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-800">Administrateur</div>
              <div className="text-xs text-gray-400">Vitogaz Madagascar</div>
            </div>

            {/* Avatar avec indicateur en ligne */}
            <div className="relative">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm select-none"
                style={{ background: `linear-gradient(135deg, ${VITOGAZ_GREEN}, #005f58)` }}
              >
                A
              </div>
              {/* Point vert — session active */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
            </div>

            {/* Séparateur vertical */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Bouton déconnexion — icône seule avec tooltip */}
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}