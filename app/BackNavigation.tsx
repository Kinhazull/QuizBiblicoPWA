"use client";
import { usePathname, useRouter } from "next/navigation";
export function BackNavigation(){const pathname=usePathname();const router=useRouter();if(pathname==="/")return null;function goBack(){if(pathname==="/jogar"&&!confirm("Deseja sair desta tela? Se houver uma tentativa em andamento, ela será abandonada."))return;if(history.length>1)router.back();else router.push("/")}return <button className="global-back" onClick={goBack} aria-label="Voltar para a tela anterior">← Voltar</button>}
