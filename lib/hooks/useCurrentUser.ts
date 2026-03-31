"use client";

import { useState, useEffect } from "react";
import { getUserRole, getUserEmail } from "@/lib/auth";

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "EDITOR"
  | "VIEWER"
  | "API_CLIENT"
  | "GESTIONNAIRE_PROMO"
  | null;

interface CurrentUser {
  role: UserRole;
  email: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canViewAudit: boolean;
  isGestionnairePromo: boolean;
  canManageScans: boolean;
}

export function useCurrentUser(): CurrentUser {
  const [role, setRole] = useState<UserRole>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setRole(getUserRole() as UserRole);
    setEmail(getUserEmail());
  }, []);

  const isSuperAdmin        = role === "SUPER_ADMIN";
  const isGestionnairePromo = role === "GESTIONNAIRE_PROMO";
  const isAdmin             = isSuperAdmin || role === "ADMIN";
  const isEditor            = isAdmin || role === "EDITOR";
  const canRead             = role !== null && role !== "API_CLIENT";
  const canWrite            = isEditor;
  const canDelete           = isAdmin;
  const canManageUsers      = isSuperAdmin;
  const canViewAudit        = isSuperAdmin;
  const canManageScans      = isAdmin || isGestionnairePromo;

  return {
    role, email,
    isSuperAdmin, isAdmin, isEditor,
    canRead, canWrite, canDelete,
    canManageUsers, canViewAudit,
    isGestionnairePromo, canManageScans,
  };
}