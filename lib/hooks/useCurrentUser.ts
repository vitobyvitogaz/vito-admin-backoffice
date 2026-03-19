"use client";

import { useState, useEffect } from "react";
import { getUserRole, getUserEmail } from "@/lib/auth";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER" | "API_CLIENT" | null;

interface CurrentUser {
  role: UserRole;
  email: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;       // ADMIN ou SUPER_ADMIN
  isEditor: boolean;      // EDITOR, ADMIN ou SUPER_ADMIN
  canRead: boolean;       // tous sauf API_CLIENT
  canWrite: boolean;      // ADMIN ou SUPER_ADMIN
  canDelete: boolean;     // ADMIN ou SUPER_ADMIN
  canManageUsers: boolean; // SUPER_ADMIN uniquement
  canViewAudit: boolean;  // SUPER_ADMIN uniquement
}

export function useCurrentUser(): CurrentUser {
  const [role, setRole] = useState<UserRole>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setRole(getUserRole() as UserRole);
    setEmail(getUserEmail());
  }, []);

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isEditor = role === "SUPER_ADMIN" || role === "ADMIN" || role === "EDITOR";
  const canRead = role !== null && role !== "API_CLIENT";
  const canWrite = isAdmin;
  const canDelete = isAdmin;
  const canManageUsers = isSuperAdmin;
  const canViewAudit = isSuperAdmin;

  return {
    role,
    email,
    isSuperAdmin,
    isAdmin,
    isEditor,
    canRead,
    canWrite,
    canDelete,
    canManageUsers,
    canViewAudit,
  };
}