"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

export function AuthRecoveryLink() {
  const path = usePathname();
  const [target, setTarget] = useState<Element | null>(null);
  const [visible, setVisible] = useState(path === "/");

  useEffect(() => {
    if (path !== "/") {
      setVisible(false);
      setTarget(null);
      return;
    }

    let stopped = false;
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

    const checkSession = () => fetch("/api/auth/me", { cache: "no-store" })
      .then(response => { if (!stopped) setVisible(!response.ok); })
      .catch(() => { if (!stopped) setVisible(true); });

    mount();
    checkSession();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      stopped = true;
      observer.disconnect();
      slot?.remove();
    };
  }, [path]);

  if (!visible || !target) return null;
  return createPortal(
    <a className="auth-recovery-link" href="/recuperar-conta">Esqueci minha senha</a>,
    target,
  );
}
