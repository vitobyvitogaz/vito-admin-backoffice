"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { removeAuthToken } from "@/lib/auth";
import { toast } from "@/lib/use-toast";

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
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">

          {/* Branding + contexte page */}
          <div className="flex items-center gap-4">
            {/* Logo / marque */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: VITOGAZ_GREEN }}
              >
                {/* Icône bouteille de gaz */}
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2h4" />
                  <path d="M12 2v2" />
                  <path d="M8 6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
                  <path d="M8 10h8" />
                  <path d="M8 14h8" />
                  <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  VitoByVitogaz
                  <span className="ml-1.5 text-xs font-medium text-gray-400 tracking-wide uppercase">
                    Backoffice
                  </span>
                </h1>
              </div>
            </div>

            {/* Séparateur vertical */}
            <div className="h-6 w-px bg-gray-200" />

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