"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createSingleFlight } from "./auth-single-flight";

export type AuthenticatedUser = {
  id: string;
  displayName: string;
  role: string;
  mustChangePassword?: boolean;
};

type AuthState = {
  user: AuthenticatedUser | null;
  loading: boolean;
  unreadNotifications: number;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  setAuthenticatedUser: (user: AuthenticatedUser) => void;
  clearUser: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const authRequest = useRef(createSingleFlight());
  const notificationsRequest = useRef(createSingleFlight());
  const userRef = useRef<AuthenticatedUser | null>(null);
  const lastValidation = useRef(0);

  const applyUser = useCallback((next: AuthenticatedUser | null) => {
    userRef.current = next;
    setUser(next);
    setLoading(false);
    if (!next) setUnreadNotifications(0);
  }, []);

  const refreshUser = useCallback(() => {
    return authRequest.current.run(() => fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then(async response => {
        lastValidation.current = Date.now();
        if (!response.ok) { applyUser(null); return; }
        const data = await response.json();
        applyUser(data.user || null);
      })
      .catch(() => setLoading(false))
    );
  }, [applyUser]);

  const refreshNotifications = useCallback(() => {
    if (!userRef.current) { setUnreadNotifications(0); return Promise.resolve(); }
    const expectedUserId = userRef.current.id;
    return notificationsRequest.current.run(() => fetch("/api/notifications", { cache: "no-store", credentials: "same-origin" })
      .then(async response => {
        if (response.status === 401) { applyUser(null); return; }
        if (response.ok && userRef.current?.id === expectedUserId) setUnreadNotifications(Number((await response.json()).unread || 0));
      })
      .catch(() => undefined)
    );
  }, [applyUser]);

  const setAuthenticatedUser = useCallback((next: AuthenticatedUser) => {
    lastValidation.current = Date.now();
    applyUser(next);
  }, [applyUser]);

  const clearUser = useCallback(() => applyUser(null), [applyUser]);

  useEffect(() => { void refreshUser(); }, [refreshUser]);
  useEffect(() => { if (user) void refreshNotifications(); }, [user, refreshNotifications]);
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => { if (!document.hidden) void refreshNotifications(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [user, refreshNotifications]);
  useEffect(() => {
    const onFocus = () => {
      if (document.hidden || Date.now() - lastValidation.current < 60_000) return;
      void refreshUser();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshUser]);

  return <AuthContext.Provider value={{ user, loading, unreadNotifications, refreshUser, refreshNotifications, setAuthenticatedUser, clearUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
