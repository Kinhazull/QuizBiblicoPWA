"use client";

import { useEffect, useState } from "react";
import styles from "../loja/shop.module.css";
import { CollectibleArt } from "../CollectibleArt";

type InventoryItem = {
  id: string;
  category: "frame" | "avatar";
  name: string;
  description: string;
  icon: string;
  equipped: boolean;
};

type InventoryData = { items: InventoryItem[] };

export default function InventoryPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/platform/inventory", { cache: "no-store" });
      if (response.status === 401) {
        location.href = "/";
        return;
      }
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      setError("Não foi possível carregar seu Inventário. Tente novamente.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function equip(item: InventoryItem) {
    if (busyId || item.equipped) return;
    setBusyId(item.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/platform/inventory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error === "shop_item_not_owned"
          ? "Este item ainda não pertence ao seu Inventário."
          : "Não foi possível equipar o item.");
        return;
      }
      setData(result);
      window.dispatchEvent(new Event("platform-equipment-changed"));
      setSuccess(`Item equipado: ${item.name}.`);
    } catch {
      setError("Sem conexão. Tente novamente.");
    } finally {
      setBusyId("");
    }
  }

  const categories = [
    { id: "avatar" as const, label: "Avatares" },
    { id: "frame" as const, label: "Molduras" },
  ];

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p>Sua coleção</p><h1>Inventário</h1><span>Escolha os itens que representam você.</span></div>
      <a className={styles.storeLink} href="/loja">Ir para a Loja</a>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {success && <p className={styles.success} role="status" aria-live="polite">{success}</p>}
    {!data && !error && <div className={styles.skeletonGrid} role="status" aria-label="Carregando seu Inventário"><i /><i /><i /></div>}
    {data && data.items.length === 0 && <section className={styles.empty}>
      <strong>Seu Inventário ainda está vazio.</strong>
      <p>Visite a Loja para adquirir seu primeiro avatar ou moldura.</p>
      <a href="/loja">Abrir Loja</a>
    </section>}
    {data && categories.map(category => {
      const items = data.items.filter(item => item.category === category.id);
      if (!items.length) return null;
      return <section className={styles.inventorySection} key={category.id}>
        <header><h2>{category.label}</h2><span>{items.length === 1 ? "1 item adquirido" : `${items.length} itens adquiridos`}</span></header>
        <div className={styles.grid}>
          {items.map(item => <article className={`${styles.card} ${item.equipped ? styles.equipped : ""}`} key={item.id}>
            <span className={styles.category}>{item.equipped ? "Equipado" : category.id === "avatar" ? "Avatar" : "Moldura"}</span>
            <div className={styles.artStage}><CollectibleArt id={item.id} fallback={item.icon} className={styles.art} /></div>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <button type="button" disabled={item.equipped || Boolean(busyId)} onClick={() => equip(item)}>
              {item.equipped ? "Equipado" : busyId === item.id ? "Aguarde..." : "Equipar"}
            </button>
          </article>)}
        </div>
      </section>;
    })}
  </main>;
}
