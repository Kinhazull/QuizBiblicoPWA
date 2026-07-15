"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuth } from "./AuthProvider";

export function AuthRecoveryLink() {
  const path = usePathname();
  const { user, loading } = useAuth();
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    if (path !== "/") {
      setTarget(null);
      return;
    }

    let slot: HTMLDivElement | null = null;

    const mount = () => {
      if (slot?.isConnected) return;
      const card = document.querySelector(".auth-card");
      const legal = card?.querySelector(".legal-links");
      if (!card || !legal) return;
      slot = document.createElement("div");
      slot.className = "auth-recovery-slot";
      card.insertBefore(slot, legal);
      setTarget(slot);
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      slot?.remove();
    };
  }, [path, user, loading]);

  if (loading || user || !target) return null;
  return createPortal(
    <a className="auth-recovery-link" href="/recuperar-conta">Esqueci minha senha</a>,
    target,
  );
}
