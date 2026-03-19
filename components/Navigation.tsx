"use client";

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

const baseNavItems = [
  { href: "/", label: "Dashboard", minRole: "VIEWER", icon: LayoutDashboard },
  { href: "/resellers", label: "Revendeurs", minRole: "VIEWER", icon: Building2 },
  { href: "/products", label: "Produits", minRole: "VIEWER", icon: GasBottleIcon },
  { href: "/delivery-companies", label: "Livraisons", minRole: "VIEWER", icon: Truck },
  { href: "/promotions", label: "Promotions", minRole: "VIEWER", icon: Tag },
  { href: "/documents", label: "Documents", minRole: "VIEWER", icon: FileText },
  { href: "/users", label: "Utilisateurs", minRole: "ADMIN", icon: Users },
  { href: "/audit", label: "Journal", minRole: "SUPER_ADMIN", icon: ScrollText },
];

const ROLE_HIERARCHY = ["API_CLIENT", "VIEWER", "EDITOR", "ADMIN", "SUPER_ADMIN"];

function hasAccess(userRole: string | null, minRole: string): boolean {
  if (!userRole) return false;
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);
  if (userLevel === -1 || requiredLevel === -1) return false;
  return userLevel >= requiredLevel;
}

export function Navigation() {
  const pathname = usePathname();
  const { role } = useCurrentUser();

  const visibleItems = baseNavItems.filter((item) =>
    hasAccess(role, item.minRole)
  );

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="px-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {visibleItems.map((item) => {
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
        </div>
      </div>
    </nav>
  );
}