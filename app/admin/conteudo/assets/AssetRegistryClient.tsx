"use client";
import { FormEvent, useEffect, useState } from "react";

type Asset = { id: string; type: string; title: string; alt_text: string; source_url: string; mime_type: string; status: string; width: number; height: number };
export function AssetRegistryClient() {
  const [assets, setAssets] = useState<Asset[]>([]); const [message, setMessage] = useState("");
  const load = () => fetch("/api/admin/assets", { cache: "no-store", credentials: "same-origin" })
    .then(response => response.ok ? response.json() : Promise.reject()).then(data => setAssets(data.assets ?? []))
    .catch(() => setMessage("Nao foi possivel carregar os assets."));
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage("Registrando asset..."); const formElement = event.currentTarget; const form = new FormData(formElement);
    const response = await fetch("/api/admin/assets", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({
      type: form.get("type"), title: form.get("title"), altText: form.get("altText"), sourceUrl: form.get("sourceUrl"),
      source: form.get("source"), attribution: form.get("attribution"), license: form.get("license"), mimeType: form.get("mimeType"),
      width: Number(form.get("width")), height: Number(form.get("height")), byteSize: Number(form.get("byteSize")) || null, status: form.get("status"),
    }) });
    setMessage(response.ok ? "Asset registrado." : "Revise URL, metadados, dimensoes e licenca."); if (response.ok) { formElement.reset(); load(); }
  };
  return <>
    <form className="admin-panel asset-registry-form" onSubmit={submit}>
      <h2>Registrar asset por URL controlada</h2><p>Binarios nao sao armazenados no D1. SVG nao e aceito.</p>
      <label>Titulo<input name="title" required maxLength={160} /></label>
      <label>Texto alternativo<input name="altText" required maxLength={300} /></label>
      <label>URL HTTPS<input name="sourceUrl" required type="url" placeholder="https://..." /></label>
      <label>Tipo<select name="type"><option>IMAGE</option><option>ICON</option><option>BANNER</option></select></label>
      <label>MIME<select name="mimeType"><option>image/png</option><option>image/jpeg</option><option>image/webp</option></select></label>
      <label>Largura<input name="width" required type="number" min="1" max="12000" /></label>
      <label>Altura<input name="height" required type="number" min="1" max="12000" /></label>
      <label>Tamanho em bytes<input name="byteSize" type="number" min="1" max="10485760" /></label>
      <label>Origem<input name="source" /></label><label>Licenca<input name="license" /></label><label>Atribuicao<input name="attribution" /></label>
      <label>Status<select name="status"><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option></select></label>
      <button type="submit">Registrar asset</button><span role="status">{message}</span>
    </form>
    <section className="asset-registry-list" aria-label="Assets registrados">{assets.map(asset => <article className="admin-panel" key={asset.id}>
      {/* Controlled raster URLs only; SVG is rejected server-side. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- registry accepts audited external HTTPS sources without a fixed host allowlist */}
      <img src={asset.source_url} alt={asset.alt_text} width="120" height="80" loading="lazy" />
      <div><strong>{asset.title}</strong><span>{asset.type} - {asset.status}</span><small>{asset.mime_type} - {asset.width}x{asset.height}</small></div>
    </article>)}</section>
  </>;
}
