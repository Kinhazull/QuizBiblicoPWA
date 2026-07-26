"use client";

import { useEffect, useState } from "react";
import styles from "./shop.module.css";

type ShopItem = {
  id: string;
  category: "frame" | "avatar";
  name: string;
  description: string;
  price: number;
  icon: string;
  owned: boolean;
  equipped: boolean;
};

type ShopData = { items: ShopItem[]; balance: number };

export default function ShopPage() {
  const [data, setData] = useState<ShopData | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/platform/shop", { cache: "no-store" });
      if (response.status === 401) {
        location.href = "/";
        return;
      }
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      setError("Não foi possível carregar a Loja. Tente novamente.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function buy(item: ShopItem) {
    if (busyId || item.owned) return;
    setBusyId(item.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/platform/shop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error === "insufficient_coins"
          ? "Você ainda não possui moedas suficientes para este item."
          : "Não foi possível concluir a compra.");
        return;
      }
      setData({ items: result.items, balance: result.balance });
      setSuccess(`${item.name} foi adicionado ao seu Inventário.`);
    } catch {
      setError("Sem conexão. Tente novamente.");
    } finally {
      setBusyId("");
    }
  }

  async function equip(item: ShopItem) {
    if (busyId || !item.owned || item.equipped) return;
    setBusyId(item.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/platform/inventory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!response.ok) throw new Error();
      const inventory = await response.json();
      setData(current => current ? {
        ...current,
        items: current.items.map(candidate => ({
          ...candidate,
          equipped: inventory.equipped[candidate.category] === candidate.id,
        })),
      } : current);
      window.dispatchEvent(new Event("platform-equipment-changed"));
      setSuccess(`${item.name} está equipado.`);
    } catch {
      setError("Não foi possível equipar o item.");
    } finally {
      setBusyId("");
    }
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <a href="/" aria-label="Voltar para a Home">←</a>
      <div><p>Economia da plataforma</p><h1>Loja</h1><span>Use suas moedas para ampliar sua coleção.</span></div>
      <strong aria-label={`${data?.balance || 0} moedas`}>🪙 {(data?.balance || 0).toLocaleString("pt-BR")}</strong>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {success && <p className={styles.success} role="status" aria-live="polite">{success}</p>}
    {!data && !error && <div className={styles.skeletonGrid} role="status" aria-label="Carregando itens da Loja"><i /><i /><i /></div>}
    {data && ([
      { id: "frame" as const, title: "Molduras", description: "Destaque seu avatar com um acabamento especial." },
      { id: "avatar" as const, title: "Avatares", description: "Escolha um símbolo para representar seu perfil." },
    ]).map(category => <section className={styles.catalogSection} key={category.id} aria-labelledby={`shop-${category.id}`}>
      <header><div><h2 id={`shop-${category.id}`}>{category.title}</h2><p>{category.description}</p></div><span>{data.items.filter(item => item.category === category.id && item.owned).length} adquirido(s)</span></header>
      <div className={styles.grid}>
        {data.items.filter(item => item.category === category.id).map(item => <article className={`${styles.card} ${item.equipped ? styles.equipped : ""}`} key={item.id}>
          <span className={styles.category}>{item.equipped ? "Equipado" : item.owned ? "Adquirido" : category.title.slice(0, -1)}</span>
          <b className={styles.icon} aria-hidden="true">{item.icon}</b>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
          <div><strong>🪙 {item.price}</strong>
            <button type="button" disabled={item.equipped || Boolean(busyId)} onClick={() => item.owned ? equip(item) : buy(item)}>
              {item.equipped ? "Equipado" : busyId === item.id ? "Aguarde..." : item.owned ? "Equipar" : "Comprar"}
            </button>
          </div>
        </article>)}
      </div>
    </section>)}
  </main>;
}
