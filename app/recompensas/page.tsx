"use client";

import { useEffect, useState } from "react";
import styles from "./collections.module.css";
import { RewardArt } from "../RewardArt";

type Item = { id:string;name:string;icon:string;rarity:string;origin:string;originRef:string|null;owned:boolean;equipped:boolean };
type Collection = { id:string;name:string;description:string;coverIcon:string;progress:{acquired:number;total:number;percent:number;status:"IN_PROGRESS"|"COMPLETE"};items:Item[] };
type Achievement = { code:string;name:string;description:string;rarity:string|null;reward:{xp:number;coins:number}|null;state:"LOCKED"|"IN_PROGRESS"|"UNLOCKED";unlockedAt:number|null;progress:{current:number;target:number;percent:number}|null };
type Data = { summary:{completedCollections:number;collections:number;ownedCollectibles:number;collectibles:number;unlockedAchievements:number;achievements:number};collections:Collection[];achievements:Achievement[] };

const rarity:Record<string,string>={COMMON:"Comum",UNCOMMON:"Incomum",RARE:"Raro",EPIC:"Épico",bronze:"Bronze",silver:"Prata",gold:"Ouro",legendary:"Lendária"};
const origin:Record<string,string>={SHOP:"Loja",DAILY:"Desafio Diário",ACHIEVEMENT:"Conquista",MISSION:"Missão",EVENT:"Evento"};
const stateLabel={LOCKED:"Bloqueada",IN_PROGRESS:"Em progresso",UNLOCKED:"Conquistada"};

export default function RewardsPage(){
  const[data,setData]=useState<Data|null>(null),[error,setError]=useState("");
  async function load(){setError("");try{const response=await fetch("/api/platform/collections",{cache:"no-store"});if(response.status===401){location.href="/";return}if(!response.ok)throw new Error();setData(await response.json())}catch{setError("Não foi possível carregar suas coleções e conquistas.")}}
  useEffect(()=>{void load()},[]);
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.hero}><div><p className={styles.eyebrow}>Recompensas da plataforma</p><h1>Minha coleção</h1><p>Acompanhe itens permanentes e conquistas construídos ao jogar. Nenhum colecionável oferece vantagem competitiva.</p></div><nav className={styles.actions} aria-label="Ações da coleção"><a href="/loja">Abrir Loja</a><a href="/inventario">Meu Inventário</a><a href="/perfil">Ver Perfil</a></nav></header>
    {error?<section className={styles.error} role="alert"><strong>{error}</strong><br/><button type="button" onClick={()=>void load()}>Tentar novamente</button></section>:null}
    {!data&&!error?<p className={styles.loading} role="status">Carregando sua coleção...</p>:null}
    {data?<>
      <section className={styles.summary} aria-label="Resumo da coleção"><article><strong>{data.summary.ownedCollectibles}/{data.summary.collectibles}</strong><span>itens adquiridos</span></article><article><strong>{data.summary.completedCollections}/{data.summary.collections}</strong><span>coleções completas</span></article><article><strong>{data.summary.unlockedAchievements}/{data.summary.achievements}</strong><span>conquistas desbloqueadas</span></article></section>
      <section aria-labelledby="collections-title"><header className={styles.sectionHeader}><div><h2 id="collections-title">Coleções</h2><p>Itens temáticos permanentes. Complete no seu ritmo.</p></div></header><div className={styles.collectionGrid}>{data.collections.map(collection=><article className={styles.collection} key={collection.id}><header className={styles.collectionTop}><span className={styles.cover} aria-hidden="true">{collection.coverIcon}</span><div><h3>{collection.name}</h3><small>{collection.progress.status==="COMPLETE"?"Coleção completa":"Em progresso"}</small></div><span>{collection.progress.acquired}/{collection.progress.total}</span></header><p>{collection.description}</p><progress className={styles.progress} max={collection.progress.total} value={collection.progress.acquired} aria-label={`${collection.name}: ${collection.progress.acquired} de ${collection.progress.total} itens`}/><div className={styles.items}>{collection.items.map(item=><div className={`${styles.item} ${item.equipped?styles.equipped:""}`} key={item.id} aria-disabled={!item.owned} title={item.name}><b aria-hidden="true">{item.owned?item.icon:"🔒"}</b><span>{item.name}</span><small>{rarity[item.rarity]} · {origin[item.origin]}{item.owned?` · ${item.equipped?"Equipado":"Adquirido"}`:""}</small></div>)}</div></article>)}</div></section>
      <section aria-labelledby="achievements-title"><header className={styles.sectionHeader}><RewardArt type="achievement" variant="card" className={styles.achievementTitleArt} sizes="90px"/><div><h2 id="achievements-title">Conquistas</h2><p>Feitos permanentes avaliados pelos serviços oficiais da plataforma.</p></div></header><div className={styles.achievementGrid}>{data.achievements.map(item=><article className={`${styles.achievement} ${item.state==="UNLOCKED"?styles.unlocked:styles.locked}`} key={item.code}><header><RewardArt type="achievement"/><h3>{item.name}</h3><span className={styles.badge}>{stateLabel[item.state]}</span></header><p>{item.description}</p>{item.progress?<progress className={styles.progress} max={item.progress.target} value={item.progress.current} aria-label={`${item.name}: ${item.progress.current} de ${item.progress.target}`}/>:null}<footer><span>{item.rarity?rarity[item.rarity]:"Raridade não definida"}</span><span>{item.progress?`${item.progress.current}/${item.progress.target}`:"Progresso oculto"}</span><span>{item.reward?<><RewardArt type="xp"/> +{item.reward.xp} XP · <RewardArt type="coin"/> +{item.reward.coins} moedas</>:"Sem recompensa"}</span>{item.unlockedAt?<time dateTime={new Date(item.unlockedAt).toISOString()}>{new Date(item.unlockedAt).toLocaleDateString("pt-BR")}</time>:null}</footer></article>)}</div></section>
    </>:null}
  </div></main>;
}
