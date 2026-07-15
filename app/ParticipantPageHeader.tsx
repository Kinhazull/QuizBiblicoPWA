"use client";
import { useEffect,useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
const supported=new Set(["/jornada","/rankings","/medalhas","/perfil"]);
export function ParticipantPageHeader(){const path=usePathname(),[target,setTarget]=useState<Element|null>(null);useEffect(()=>{if(!supported.has(path))return;const main=document.querySelector("main"),slot=document.createElement("div");slot.className="participant-section-header-slot";main?.prepend(slot);setTarget(main?slot:null);return()=>slot.remove()},[path]);if(!target)return null;return createPortal(<header className="participant-section-header"><a href="/" aria-label="Ir para o início"><span aria-hidden="true">✦</span><strong>CONTE OS FEITOS</strong></a></header>,target)}
