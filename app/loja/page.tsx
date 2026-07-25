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
};

type ShopData = { items: ShopItem[]; balance: number };

export default function ShopPage() {
  const [data, setData] = useState<ShopData | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
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
    } catch {
      setError("Sem conexão. Tente novamente.");
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
    {!data && !error && <p className={styles.loading} role="status">Carregando itens...</p>}
    {data && <section className={styles.grid} aria-label="Itens disponíveis">
      {data.items.map(item => <article className={styles.card} key={item.id}>
        <span className={styles.category}>{item.category === "frame" ? "Moldura" : "Avatar"}</span>
        <b className={styles.icon} aria-hidden="true">{item.icon}</b>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <div><strong>🪙 {item.price}</strong>
          <button type="button" disabled={item.owned || Boolean(busyId)} onClick={() => buy(item)}>
            {item.owned ? "Comprado" : busyId === item.id ? "Aguarde..." : "Comprar"}
          </button>
        </div>
      </article>)}
    </section>}
  </main>;
}
