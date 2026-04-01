"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Truck,
  Tag,
  FileText,
  Users,
  ScrollText,
  Bell,
  QrCode,
  Gift,
  Menu,
  X,
  ChevronDown,
  Package,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const VITOGAZ_GREEN = "#008B7F";

const GasBottleIcon = ({ className, strokeWidth }: { className?: string; strokeWidth?: number }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2h4" />
    <path d="M12 2v2" />
    <path d="M8 6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
    <path d="M8 10h8" />
    <path d="M8 14h8" />
    <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  minRole: string;
  extraRoles: string[];
  excludedRoles: string[];
  icon: any;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Vue d'ensemble",
    items: [
      { href: "/", label: "Dashboard", minRole: "VIEWER", extraRoles: [], excludedRoles: ["GESTIONNAIRE_PROMO"], icon: LayoutDashboard },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/resellers", label: "Revendeurs", minRole: "VIEWER", extraRoles: [], excludedRoles: [], icon: Building2 },
      { href: "/products", label: "Produits", minRole: "VIEWER", extraRoles: [], excludedRoles: [], icon: GasBottleIcon },
      { href: "/delivery-companies", label: "Livraisons", minRole: "VIEWER", extraRoles: [], excludedRoles: [], icon: Truck },
      { href: "/promotions", label: "Promotions", minRole: "VIEWER", extraRoles: [], excludedRoles: [], icon: Tag },
      { href: "/documents", label: "Documents", minRole: "VIEWER", extraRoles: [], excludedRoles: [], icon: FileText },
    ],
  },
  {
    title: "Programme Fidélité",
    items: [
      { href: "/scans", label: "Participants", minRole: "ADMIN", extraRoles: ["GESTIONNAIRE_PROMO"], excludedRoles: [], icon: QrCode },
      { href: "/points-exchange", label: "Échanges", minRole: "ADMIN", extraRoles: ["GESTIONNAIRE_PROMO"], excludedRoles: [], icon: Gift },
      { href: "/reward-items", label: "Articles Cadeaux", minRole: "ADMIN", extraRoles: ["GESTIONNAIRE_PROMO"], excludedRoles: [], icon: Package },
    ],
  },
  {
    title: "Système",
    items: [
      { href: "/notifications", label: "Notifications", minRole: "ADMIN", extraRoles: [], excludedRoles: [], icon: Bell },
      { href: "/departments", label: "Départements", minRole: "SUPER_ADMIN", extraRoles: [], excludedRoles: [], icon: Building2 },
      { href: "/users", label: "Utilisateurs", minRole: "ADMIN", extraRoles: [], excludedRoles: [], icon: Users },
      { href: "/audit", label: "Journal", minRole: "SUPER_ADMIN", extraRoles: [], excludedRoles: [], icon: ScrollText },
    ],
  },
];

const ROLE_HIERARCHY = ["API_CLIENT", "VIEWER", "EDITOR", "ADMIN", "SUPER_ADMIN"];

function hasAccess(userRole: string | null, minRole: string, extraRoles: string[] = [], excludedRoles: string[] = []): boolean {
  if (!userRole) return false;
  if (excludedRoles.includes(userRole)) return false;
  if (extraRoles.includes(userRole)) return true;
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);
  if (userLevel === -1 || requiredLevel === -1) return false;
  return userLevel >= requiredLevel;
}

export function Navigation() {
  const pathname = usePathname();
  const { role, loading } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Vue d'ensemble", "Catalogue", "Programme Fidélité", "Système"]);

  // Attendre que le rôle soit chargé
  if (loading) {
    return (
      <nav className="bg-white border-b border-gray-200">
        <div className="px-6 py-3.5">
          <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
      </nav>
    );
  }

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const filterAccessibleGroups = () => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          hasAccess(role, item.minRole, item.extraRoles, item.excludedRoles)
        ),
      }))
      .filter((group) => group.items.length > 0);
  };

  const accessibleGroups = filterAccessibleGroups();

  return (
    <>
      {/* DESKTOP NAVIGATION */}
      <nav className="hidden lg:block bg-white border-b border-gray-200">
        <div className="px-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {accessibleGroups.map((group, groupIndex) => (
              <div key={group.title} className="flex items-center">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-3.5 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap",
                        isActive
                          ? "border-b-2"
                          : "text-gray-500 border-transparent hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50 rounded-t-md"
                      )}
                      style={
                        isActive
                          ? { color: VITOGAZ_GREEN, borderBottomColor: VITOGAZ_GREEN, backgroundColor: "#f0faf9", borderRadius: "6px 6px 0 0" }
                          : {}
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {/* Séparateur visuel entre groupes */}
                {groupIndex < accessibleGroups.length - 1 && (
                  <div className="h-8 w-px bg-gray-200 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* MOBILE NAVIGATION */}
      <nav className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-gray-700">Menu</span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold" style={{ color: VITOGAZ_GREEN }}>
                  Navigation
                </h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Menu Groups */}
              <div className="py-2">
                {accessibleGroups.map((group) => {
                  const isExpanded = expandedGroups.includes(group.title);
                  return (
                    <div key={group.title} className="border-b border-gray-100 last:border-0">
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(group.title)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {group.title}
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-gray-400 transition-transform",
                            isExpanded ? "rotate-180" : ""
                          )}
                        />
                      </button>

                      {/* Group Items */}
                      {isExpanded && (
                        <div className="pb-2">
                          {group.items.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5 transition-colors",
                                  isActive
                                    ? "text-white"
                                    : "text-gray-700 hover:bg-gray-50"
                                )}
                                style={
                                  isActive
                                    ? { backgroundColor: VITOGAZ_GREEN }
                                    : {}
                                }
                              >
                                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
                                <span className="text-sm font-medium">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}