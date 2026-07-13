"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
export function AuthRecoveryLink(){const path=usePathname(),[visible,setVisible]=useState(false);useEffect(()=>{if(path!=="/")return;fetch('/api/auth/me').then(r=>setVisible(!r.ok)).catch(()=>setVisible(true))},[path]);if(!visible)return null;return <a className="auth-recovery-link" href="/recuperar-conta">Esqueci minha senha</a>}
