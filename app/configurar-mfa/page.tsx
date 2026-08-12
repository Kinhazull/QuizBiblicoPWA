"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";

export default function ConfigureMfa() {
  const { user, loading, refreshUser } = useAuth();
  const [setup, setSetup] = useState<{secret:string;otpauthUri:string}|null>(null);
  const [code,setCode]=useState(""), [codes,setCodes]=useState<string[]>([]), [message,setMessage]=useState("");
  useEffect(()=>{if(!loading&&!user)location.replace("/");},[loading,user]);
  async function begin(){setMessage("");const response=await fetch("/api/auth/mfa/setup",{method:"POST"});const data=await response.json();if(response.ok)setSetup(data);else setMessage("Não foi possível iniciar a configuração.");}
  async function confirm(){const response=await fetch("/api/auth/mfa/confirm",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});const data=await response.json();if(response.ok){setCodes(data.recoveryCodes);await refreshUser();}else setMessage("Código inválido ou expirado.");}
  if(loading||!user)return <main className="platform-loading-screen"><p role="status">Preparando segurança…</p></main>;
  return <main className="profile-shell"><section className="profile-section profile-form" aria-labelledby="mfa-title"><p className="eyebrow">SEGURANÇA DA CONTA</p><h1 id="mfa-title">Verificação em duas etapas</h1><p>Use um aplicativo autenticador compatível com TOTP. Não existe bypass por senha ou suporte.</p>{!setup&&!codes.length&&<button className="primary" onClick={begin}>CONFIGURAR AUTENTICADOR</button>}{setup&&<><p>Adicione manualmente esta chave ao aplicativo:</p><code className="mfa-secret">{setup.secret}</code><label>Código de 6 dígitos<input value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6}/></label><button className="primary" onClick={confirm}>CONFIRMAR E ATIVAR</button></>}{codes.length>0&&<div className="recovery-codes"><h2>Códigos de recuperação</h2><p>Guarde-os agora. Cada código funciona uma única vez e não será exibido novamente.</p>{codes.map(item=><code key={item}>{item}</code>)}<button onClick={()=>navigator.clipboard.writeText(codes.join("\n"))}>Copiar todos</button><a className="primary" href="/">CONTINUAR</a></div>}{message&&<p className="auth-message" role="alert">{message}</p>}</section></main>;
}
