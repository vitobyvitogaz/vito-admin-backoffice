"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/resellers", label: "Revendeurs" },
  { href: "/delivery-companies", label: "Livraisons" },
  { href: "/documents", label: "Documents" },
  { href: "/promotions", label: "Promotions" },
  { href: "/users", label: "Utilisateurs" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="px-6">
        <div className="flex gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-4 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "text-blue-600 border-blue-600"
                    : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
