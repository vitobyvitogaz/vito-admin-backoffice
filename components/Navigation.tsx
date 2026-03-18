"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Package,
  Truck,
  Tag,
  FileText,
  Users,
} from "lucide-react";

const VITOGAZ_GREEN = "#008B7F";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resellers", label: "Revendeurs", icon: Building2 },
  { href: "/products", label: "Produits", icon: Package },
  { href: "/delivery-companies", label: "Livraisons", icon: Truck },
  { href: "/promotions", label: "Promotions", icon: Tag },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/users", label: "Utilisateurs", icon: Users },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="px-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {navItems.map((item) => {
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
                    ? {
                        color: VITOGAZ_GREEN,
                        borderBottomColor: VITOGAZ_GREEN,
                        backgroundColor: "#f0faf9",
                        borderRadius: "6px 6px 0 0",
                      }
                    : {}
                }
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}