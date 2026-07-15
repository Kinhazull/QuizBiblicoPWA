"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
export function AuthRecoveryLink() {
  const path = usePathname(), [target, setTarget] = useState<Element | null>(null), [visible, setVisible] = useState(false);
  useEffect(() => {
    if (path !== "/") { setVisible(false); return; }
    let stopped = false;
    const check = () => fetch("/api/auth/me", { cache: "no-store" }).then(r => { if (!stopped) setVisible(!r.ok); }).catch(() => { if (!stopped) setVisible(true); });
    check(); const timer = window.setInterval(check, 800);
    const card=document.querySelector(".auth-card"),legal=card?.querySelector(".legal-links");let slot:HTMLDivElement|null=null;if(card&&legal){slot=document.createElement("div");slot.className="auth-recovery-slot";card.insertBefore(slot,legal);setTarget(slot)}
    return () => { stopped = true; clearInterval(timer); slot?.remove(); };
  }, [path]);
  if (!visible || !target) return null;
  return createPortal(<a className="auth-recovery-link" href="/recuperar-conta">Esqueci minha senha</a>, target);
}
