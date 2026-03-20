"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LogOut, KeyRound, ChevronDown, Shield, ShieldCheck, Eye, User } from "lucide-react";
import { removeUserSession } from "@/lib/auth";
import { toast } from "@/lib/use-toast";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import Image from "next/image";

const VITOGAZ_GREEN = "#008B7F";

// Couleur d'avatar déterministe basée sur l'email
function getAvatarColor(email: string): string {
  const colors = [
    "#008B7F", "#0EA5E9", "#8B5CF6", "#F59E0B",
    "#EF4444", "#10B981", "#EC4899", "#6366F1",
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
  VIEWER: "Lecteur",
  API_CLIENT: "Client API",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  SUPER_ADMIN: { bg: "bg-red-100", text: "text-red-700" },
  ADMIN: { bg: "bg-orange-100", text: "text-orange-700" },
  EDITOR: { bg: "bg-blue-100", text: "text-blue-700" },
  VIEWER: { bg: "bg-gray-100", text: "text-gray-600" },
  API_CLIENT: { bg: "bg-purple-100", text: "text-purple-700" },
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  SUPER_ADMIN: <ShieldCheck className="w-3 h-3" />,
  ADMIN: <Shield className="w-3 h-3" />,
  EDITOR: <KeyRound className="w-3 h-3" />,
  VIEWER: <Eye className="w-3 h-3" />,
  API_CLIENT: <User className="w-3 h-3" />,
};

interface HeaderProps {
  title?: string;
  subtitle: string;
}

export function Header({ subtitle }: HeaderProps) {
  const router = useRouter();
  const { email, role, isSuperAdmin } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const avatarLetter = email ? email.charAt(0).toUpperCase() : "?";
  const avatarColor = email ? getAvatarColor(email) : VITOGAZ_GREEN;
  const roleLabel = role ? (ROLE_LABELS[role] || role) : "—";
  const roleColor = role ? ROLE_COLORS[role] : { bg: "bg-gray-100", text: "text-gray-600" };
  const roleIcon = role ? ROLE_ICONS[role] : null;

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    removeUserSession();
    toast({ title: "Déconnexion réussie", description: "À bientôt !" });
    router.push("/login");
  };

  const handleChangePassword = () => {
    setOpen(false);
    router.push("/login/forgot-password");
  };

  // Tronquer l'email pour l'affichage
  const truncateEmail = (e: string, max = 24) =>
    e.length > max ? e.slice(0, max) + "…" : e;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">

          {/* Branding */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Image
              src="/logo-vito-dark.png"
              alt="VitoByVitogaz"
              width={110}
              height={36}
              className="object-contain flex-shrink-0"
              priority
            />
            <div className="hidden sm:block h-6 w-px bg-gray-200 flex-shrink-0" />
            <p className="hidden sm:block text-sm text-gray-400 truncate">{subtitle}</p>
          </div>

          {/* Zone utilisateur — dropdown */}
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors duration-150 group"
              aria-expanded={open}
              aria-haspopup="true"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm select-none flex-shrink-0 relative"
                style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)` }}
              >
                {avatarLetter}
                {/* Point de présence */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
              </div>

              {/* Infos — masquées sur très petit écran */}
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[140px]">
                  {email ? truncateEmail(email) : "—"}
                </span>
                {role && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${roleColor.bg} ${roleColor.text}`}>
                    {roleIcon}
                    {roleLabel}
                  </span>
                )}
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown menu */}
            {open && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

                {/* Entête du dropdown */}
                <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)` }}
                    >
                      {avatarLetter}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{email || "—"}</p>
                      {role && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 ${roleColor.bg} ${roleColor.text}`}>
                          {roleIcon}
                          {roleLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1.5">
                  <button
                    onClick={handleChangePassword}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    Changer mon mot de passe
                  </button>
                </div>

                <div className="border-t border-gray-100 py-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}