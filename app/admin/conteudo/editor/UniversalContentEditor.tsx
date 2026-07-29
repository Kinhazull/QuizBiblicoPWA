"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ContentStatus,
  Difficulty,
  contentSchemas,
  getContentSchema,
  validateContent,
  type ContentTemplate,
  type ContentValidationIssue,
  type ContentValidationResult,
  type GameType,
} from "../../../../shared/content";
import {
  aliasForGame,
  applyTemplate,
  createEditorDraft,
  gameFromQuery,
  type EditorDraft,
} from "./editor-model";
import { ReferenceField, UniversalFieldRenderer } from "./UniversalFields";

type PersistedContent = {
  id: string;
  gameType: GameType;
  status: typeof ContentStatus.DRAFT | typeof ContentStatus.PUBLISHED;
  category: string;
  difficulty: EditorDraft["metadata"]["difficulty"];
  biblicalReference: string | null;
  tags: string[];
  payload: Record<string, unknown>;
  reference: EditorDraft["reference"] | null;
  templateId: string | null;
  version: number;
  authorId: string;
  reviewerId: string | null;
  createdAt: number;
  updatedAt: number;
  internalNotes: string | null;
};

const difficultyLabels = {
  [Difficulty.VERY_EASY]: "Muito fácil",
  [Difficulty.EASY]: "Fácil",
  [Difficulty.MEDIUM]: "Média",
  [Difficulty.HARD]: "Difícil",
  [Difficulty.SPECIAL]: "Especial",
} as const;

function initialState() {
  const selection = gameFromQuery(null);
  const schema = getContentSchema(selection.gameType);
  const template = schema?.templates[0] ?? null;
  return {
    selection,
    draft: createEditorDraft(selection.gameType, template),
    templateId: template?.id ?? "",
  };
}

function GameTypeSelector(props: {
  value: GameType;
  disabled?: boolean;
  onChange: (value: GameType) => void;
}) {
  return <label className="editor-selector">
    Jogo
    <select disabled={props.disabled} value={props.value} onChange={event => props.onChange(event.target.value as GameType)}>
      {contentSchemas.map(schema => (
        <option value={schema.gameType} key={schema.gameType}>{schema.label}</option>
      ))}
    </select>
  </label>;
}

function ContentTemplateSelector(props: {
  templates: readonly ContentTemplate[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return <label className="editor-selector">
    Template
    <select disabled={props.disabled} value={props.value} onChange={event => props.onChange(event.target.value)}>
      {props.templates.length === 0 && <option value="">Sem template</option>}
      {props.templates.map(template => (
        <option value={template.id} key={template.id}>{template.label}</option>
      ))}
    </select>
  </label>;
}

function MetadataError(props: { field: string; errors: readonly ContentValidationIssue[] }) {
  const errors = props.errors.filter(issue => issue.field === `metadata.${props.field}`);
  return errors.map((issue, index) => (
    <span
      className="editor-field-error"
      id={`metadata-${props.field}-error-${index}`}
      role="alert"
      key={`${issue.code}:${index}`}
    >
      {issue.message}
    </span>
  ));
}

function MetadataEditor(props: {
  draft: EditorDraft;
  errors: readonly ContentValidationIssue[];
  onChange: (draft: EditorDraft) => void;
}) {
  const update = (key: keyof EditorDraft["metadata"], value: unknown) => props.onChange({
    ...props.draft,
    metadata: { ...props.draft.metadata, [key]: value, updatedAt: Date.now() },
  });
  return <fieldset className="editor-metadata">
    <legend>Metadados universais</legend>
    <div className="editor-metadata-grid">
      <label>Categoria
        <input
          value={props.draft.metadata.category}
          aria-invalid={props.errors.some(issue => issue.field === "metadata.category")}
          aria-describedby={props.errors.some(issue => issue.field === "metadata.category") ? "metadata-category-error-0" : undefined}
          onChange={event => update("category", event.target.value)}
        />
        <MetadataError field="category" errors={props.errors} />
      </label>
      <label>Tags <small>separadas por vírgula</small>
        <input
          value={props.draft.metadata.tags.join(", ")}
          onChange={event => update("tags", event.target.value.split(",").map(item => item.trim()).filter(Boolean))}
        />
      </label>
      <label>Dificuldade
        <select value={props.draft.metadata.difficulty} onChange={event => update("difficulty", event.target.value)}>
          {Object.entries(difficultyLabels).map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>Status editorial
        <input value={props.draft.metadata.status} readOnly aria-readonly="true" />
      </label>
      <label className="wide">Notas internas
        <textarea
          value={props.draft.metadata.internalNotes ?? ""}
          onChange={event => update("internalNotes", event.target.value || null)}
        />
      </label>
    </div>
    <ReferenceField value={props.draft.reference} onChange={reference => props.onChange({
      ...props.draft,
      reference,
      metadata: {
        ...props.draft.metadata,
        biblicalReference: reference.label.trim() || null,
        updatedAt: Date.now(),
      },
    })} />
  </fieldset>;
}

function ValidationSummary(props: { result: ContentValidationResult; manual: boolean }) {
  return <section
    className={`editor-validation ${props.result.valid ? "valid" : "invalid"}`}
    aria-live="polite"
    aria-labelledby="editor-validation-title"
  >
    <h2 id="editor-validation-title">Validação</h2>
    <strong>
      {props.result.valid
        ? "Conteúdo válido para prévia"
        : `${props.result.errors.length} pendência(s) encontrada(s)`}
    </strong>
    {!props.result.valid && <ul>
      {props.result.errors.map((issue, index) => (
        <li key={`${issue.field}:${issue.code}:${index}`}>
          <b>{issue.field}</b>: {issue.message}
        </li>
      ))}
    </ul>}
    {props.result.warnings.length > 0 && <ul>
      {props.result.warnings.map((issue, index) => (
        <li key={`${issue.field}:${issue.code}:warning:${index}`}>{issue.message}</li>
      ))}
    </ul>}
    {props.manual && <small>Validação solicitada manualmente. Nada foi salvo.</small>}
  </section>;
}

function PreviewValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (depth > 3) return <span>Estrutura profunda</span>;
  if (Array.isArray(value)) {
    return <ol>{value.map((item, index) => (
      <li key={index}><PreviewValue value={item} depth={depth + 1} /></li>
    ))}</ol>;
  }
  if (value && typeof value === "object") {
    return <dl>{Object.entries(value as Record<string, unknown>).map(([key, item]) => (
      <div key={key}>
        <dt>{key}</dt>
        <dd><PreviewValue value={item} depth={depth + 1} /></dd>
      </div>
    ))}</dl>;
  }
  if (typeof value === "boolean") return <span>{value ? "Sim" : "Não"}</span>;
  return <span>{String(value ?? "—") || "—"}</span>;
}

function ContentPreview(props: {
  draft: EditorDraft;
  templateLabel: string;
  result: ContentValidationResult;
}) {
  const schema = getContentSchema(props.draft.gameType);
  const primaryField = schema?.fields.find(field => (
    typeof props.draft.payload[field.key] === "string"
    && String(props.draft.payload[field.key]).trim()
  ));
  return <aside className="editor-preview" aria-labelledby="editor-preview-title">
    <header>
      <span>Prévia editorial local</span>
      <strong className={`content-status ${props.draft.metadata.status.toLowerCase()}`}>
        {props.draft.metadata.status}
      </strong>
    </header>
    <h2 id="editor-preview-title">
      {primaryField ? String(props.draft.payload[primaryField.key]) : schema?.label}
    </h2>
    <p>{schema?.description}</p>
    <dl className="editor-preview-meta">
      <div><dt>Jogo</dt><dd>{schema?.label}</dd></div>
      <div><dt>Template</dt><dd>{props.templateLabel || "Sem template"}</dd></div>
      <div><dt>Categoria</dt><dd>{props.draft.metadata.category || "Não informada"}</dd></div>
      <div><dt>Dificuldade</dt><dd>{difficultyLabels[props.draft.metadata.difficulty]}</dd></div>
      <div><dt>Referência</dt><dd>{props.draft.reference.label || "Não informada"}</dd></div>
      <div><dt>Versão local</dt><dd>{props.draft.metadata.version}</dd></div>
    </dl>
    <section>
      <h3>Conteúdo específico</h3>
      <PreviewValue value={props.draft.payload} />
    </section>
    <footer className={props.result.valid ? "valid" : "invalid"}>
      {props.result.valid
        ? "Sem pendências de validação."
        : `${props.result.errors.length} pendência(s) na prévia.`}
    </footer>
  </aside>;
}

export default function UniversalContentEditor() {
  const [initial] = useState(initialState);
  const [draft, setDraft] = useState(initial.draft);
  const [templateId, setTemplateId] = useState(initial.templateId);
  const [dirty, setDirty] = useState(false);
  const [contentId, setContentId] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [warning, setWarning] = useState(
    initial.selection.invalid
      ? "O jogo informado não existe. O Quiz Bíblico foi carregado como padrão."
      : "",
  );
  const [manualValidation, setManualValidation] = useState(false);
  const [validation, setValidation] = useState(
    () => validateContent(draft.gameType, draft.metadata, draft.payload),
  );
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schema = useMemo(() => getContentSchema(draft.gameType), [draft.gameType]);
  const selectedTemplate = schema?.templates.find(template => template.id === templateId) ?? null;
  const isPublished = draft.metadata.status === ContentStatus.PUBLISHED;

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const existingId = search.get("id");
    if (existingId) {
      const controller = new AbortController();
      setLoadingContent(true);
      fetch(`/api/admin/content/${encodeURIComponent(existingId)}`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      })
        .then(async response => {
          if (!response.ok) throw new Error(response.status === 404 ? "not_found" : "load_failed");
          return response.json() as Promise<{ content: PersistedContent }>;
        })
        .then(({ content }) => {
          setContentId(content.id);
          setTemplateId(content.templateId ?? "");
          setDraft({
            gameType: content.gameType,
            templateId: content.templateId,
            metadata: {
              id: content.id,
              gameType: content.gameType,
              category: content.category,
              tags: content.tags,
              difficulty: content.difficulty,
              biblicalReference: content.biblicalReference,
              status: content.status,
              authorId: content.authorId,
              reviewerId: content.reviewerId,
              createdAt: content.createdAt,
              updatedAt: content.updatedAt,
              version: content.version,
              internalNotes: content.internalNotes,
            },
            payload: content.payload,
            reference: content.reference ?? { id: "", label: content.biblicalReference ?? "", type: "passage" },
          });
          setDirty(false);
          setSaveState("saved");
          setSaveMessage(`Rascunho carregado. Versão ${content.version}.`);
        })
        .catch(reason => {
          if (!(reason instanceof DOMException && reason.name === "AbortError")) {
            setSaveState("error");
            setSaveMessage(reason instanceof Error && reason.message === "not_found"
              ? "O rascunho não foi encontrado ou pertence a outra organização."
              : "Não foi possível carregar o rascunho.");
          }
        })
        .finally(() => { if (!controller.signal.aborted) setLoadingContent(false); });
      return () => controller.abort();
    }
    const selection = gameFromQuery(search.get("game"));
    const initialSchema = getContentSchema(selection.gameType);
    const initialTemplate = initialSchema?.templates[0] ?? null;
    setDraft(createEditorDraft(selection.gameType, initialTemplate));
    setTemplateId(initialTemplate?.id ?? "");
    setWarning(selection.invalid
      ? "O jogo informado não existe. O Quiz Bíblico foi carregado como padrão."
      : "");
    return undefined;
  }, []);

  useEffect(() => {
    if (validationTimer.current) clearTimeout(validationTimer.current);
    validationTimer.current = setTimeout(() => {
      setValidation(validateContent(draft.gameType, draft.metadata, draft.payload));
      setManualValidation(false);
    }, 180);
    return () => {
      if (validationTimer.current) clearTimeout(validationTimer.current);
    };
  }, [draft]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  if (!schema) {
    return <section className="cms-state error">
      <p>Não foi possível carregar o Schema Registry.</p>
    </section>;
  }

  const setChangedDraft = (next: EditorDraft) => {
    setDraft(next);
    setDirty(true);
    setSaveState("idle");
    setSaveMessage("Alterações não salvas.");
  };

  const changeGame = (gameType: GameType) => {
    if (gameType === draft.gameType) return;
    if (dirty && !window.confirm("Descartar as alterações locais e trocar de jogo?")) return;
    const nextSchema = getContentSchema(gameType);
    if (!nextSchema) return;
    const nextTemplate = nextSchema.templates[0] ?? null;
    setDraft(createEditorDraft(gameType, nextTemplate));
    setContentId(null);
    setTemplateId(nextTemplate?.id ?? "");
    setDirty(false);
    setWarning("");
    window.history.replaceState(
      {},
      "",
      `/admin/conteudo/editor?game=${aliasForGame(gameType)}`,
    );
  };

  const applySelectedTemplate = () => {
    if (!selectedTemplate) return;
    if (dirty && !window.confirm(
      `Aplicar o template “${selectedTemplate.label}” e substituir o conteúdo específico atual?`,
    )) return;
    setDraft(current => applyTemplate(current, selectedTemplate));
    setDirty(true);
  };

  const resetTemplate = () => {
    const activeTemplate = schema.templates.find(template => template.id === draft.templateId)
      ?? selectedTemplate;
    if (dirty && !window.confirm("Reiniciar o formulário e descartar as alterações locais?")) return;
    setDraft(current => activeTemplate
      ? applyTemplate(current, activeTemplate)
      : createEditorDraft(current.gameType));
    setTemplateId(activeTemplate?.id ?? "");
    setDirty(false);
  };

  const clearDraft = () => {
    if (dirty && !window.confirm("Limpar todo o rascunho local?")) return;
    setDraft(createEditorDraft(draft.gameType));
    setTemplateId("");
    setDirty(false);
  };

  const validateNow = () => {
    if (validationTimer.current) clearTimeout(validationTimer.current);
    setValidation(validateContent(draft.gameType, draft.metadata, draft.payload));
    setManualValidation(true);
  };

  const saveDraft = async () => {
    const currentValidation = validateContent(draft.gameType, draft.metadata, draft.payload);
    setValidation(currentValidation);
    if (!currentValidation.valid) {
      setSaveState("error");
      setSaveMessage("Corrija os campos indicados antes de salvar.");
      return;
    }
    setSaveState("saving");
    setSaveMessage("Salvando rascunho…");
    try {
      const response = await fetch(
        contentId ? `/api/admin/content/${encodeURIComponent(contentId)}` : "/api/admin/content",
        {
          method: contentId ? "PATCH" : "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            gameType: draft.gameType,
            status: ContentStatus.DRAFT,
            templateId: draft.templateId,
            version: draft.metadata.version,
            metadata: draft.metadata,
            payload: draft.payload,
            reference: draft.reference,
          }),
        },
      );
      const data = await response.json() as {
        content?: PersistedContent;
        error?: string;
        currentVersion?: number;
        fields?: ContentValidationIssue[];
      };
      if (response.status === 409) {
        setSaveState("conflict");
        setSaveMessage(`Conflito: o servidor já possui a versão ${data.currentVersion}. Recarregue antes de editar.`);
        return;
      }
      if (!response.ok || !data.content) {
        if (Array.isArray(data.fields)) {
          setValidation({ valid: false, errors: data.fields, warnings: [], normalizedValue: null });
        }
        throw new Error(data.error || "save_failed");
      }
      const persisted = data.content;
      setContentId(persisted.id);
      setDraft(current => ({
        ...current,
        metadata: {
          ...current.metadata,
          id: persisted.id,
          authorId: persisted.authorId,
          createdAt: persisted.createdAt,
          updatedAt: persisted.updatedAt,
          version: persisted.version,
          status: persisted.status,
        },
      }));
      setDirty(false);
      setSaveState("saved");
      setSaveMessage(`Rascunho salvo. Versão ${persisted.version}.`);
      window.history.replaceState({}, "", `/admin/conteudo/editor?id=${encodeURIComponent(persisted.id)}`);
    } catch {
      setSaveState("error");
      setSaveMessage("Não foi possível salvar o rascunho. Tente novamente.");
    }
  };

  const transitionStatus = async (
    target: typeof ContentStatus.DRAFT | typeof ContentStatus.PUBLISHED,
  ) => {
    if (!contentId || dirty || saveState === "saving") return;
    const currentValidation = validateContent(draft.gameType, {
      ...draft.metadata,
      status: target,
    }, draft.payload);
    setValidation(currentValidation);
    if (target === ContentStatus.PUBLISHED && !currentValidation.valid) {
      setSaveState("error");
      setSaveMessage("Corrija os campos indicados antes de publicar.");
      return;
    }
    setSaveState("saving");
    setSaveMessage(target === ContentStatus.PUBLISHED
      ? "Publicando conteúdo…"
      : "Retornando para Draft…");
    try {
      const action = target === ContentStatus.PUBLISHED ? "publish" : "unpublish";
      const response = await fetch(
        `/api/admin/content/${encodeURIComponent(contentId)}/${action}`,
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ version: draft.metadata.version }),
        },
      );
      const data = await response.json() as {
        content?: PersistedContent;
        error?: string;
        currentVersion?: number;
        fields?: ContentValidationIssue[];
      };
      if (response.status === 409) {
        setSaveState("conflict");
        setSaveMessage(`Conflito: o servidor já possui a versão ${data.currentVersion}. Recarregue antes de continuar.`);
        return;
      }
      if (!response.ok || !data.content) {
        if (Array.isArray(data.fields)) {
          setValidation({ valid: false, errors: data.fields, warnings: [], normalizedValue: null });
        }
        throw new Error(data.error || "transition_failed");
      }
      const persisted = data.content;
      setDraft(current => ({
        ...current,
        metadata: {
          ...current.metadata,
          status: persisted.status,
          updatedAt: persisted.updatedAt,
          version: persisted.version,
        },
      }));
      setDirty(false);
      setSaveState("saved");
      setSaveMessage(target === ContentStatus.PUBLISHED
        ? `Conteúdo publicado. Versão ${persisted.version}.`
        : `Conteúdo voltou para Draft. Versão ${persisted.version}.`);
    } catch {
      setSaveState("error");
      setSaveMessage(target === ContentStatus.PUBLISHED
        ? "Não foi possível publicar o conteúdo."
        : "Não foi possível retornar o conteúdo para Draft.");
    }
  };

  return <main className="admin-page content-editor-page">
    <header className="admin-title">
      <span className="eyebrow">Conteúdo</span>
      <h1>Editor universal</h1>
      <p>Crie e edite rascunhos universais orientados pelo Schema Registry.</p>
    </header>

    {loadingContent && (
      <div className="editor-warning" role="status" aria-live="polite">
        Carregando rascunho…
      </div>
    )}
    {warning && <div className="editor-warning" role="status">{warning}</div>}

    <section className="editor-controls" aria-label="Configuração do editor">
      <GameTypeSelector disabled={isPublished} value={draft.gameType} onChange={changeGame} />
      <ContentTemplateSelector
        templates={schema.templates}
        value={templateId}
        disabled={isPublished}
        onChange={setTemplateId}
      />
      <button type="button" onClick={applySelectedTemplate} disabled={!selectedTemplate || isPublished}>
        Aplicar template
      </button>
      <p>{selectedTemplate?.description ?? "Este schema não possui templates."}</p>
    </section>

    <div className="editor-workspace">
      <fieldset
        disabled={isPublished}
        aria-label="Conteúdo editorial"
        style={{ display: "contents" }}
      >
      <section className="editor-form" aria-labelledby="editor-form-title">
        <header>
          <div>
            <span>{schema.label}</span>
            <h2 id="editor-form-title">Rascunho universal</h2>
          </div>
          {draft.templateId && <em>
            Template ativo: {schema.templates.find(item => item.id === draft.templateId)?.label}
          </em>}
        </header>
        <MetadataEditor draft={draft} errors={validation.errors} onChange={setChangedDraft} />
        <fieldset className="editor-payload">
          <legend>Conteúdo específico</legend>
          {schema.fields.length === 0
            ? <p className="editor-empty">Não há campos configurados para este jogo.</p>
            : schema.fields.map(field => (
              <UniversalFieldRenderer
                key={field.key}
                field={field}
                value={draft.payload[field.key]}
                errors={validation.errors}
                onChange={value => setChangedDraft({
                  ...draft,
                  payload: { ...draft.payload, [field.key]: value },
                  metadata: { ...draft.metadata, updatedAt: Date.now() },
                })}
              />
            ))}
        </fieldset>
      </section>

      <div className="editor-side">
        <ValidationSummary result={validation} manual={manualValidation} />
        <ContentPreview
          draft={draft}
          templateLabel={schema.templates.find(item => item.id === draft.templateId)?.label ?? ""}
          result={validation}
        />
      </div>
      </fieldset>
    </div>

    <footer className="editor-actions">
      <button type="button" disabled={isPublished} onClick={resetTemplate}>Reiniciar</button>
      <button type="button" disabled={isPublished} onClick={validateNow}>Validar conteúdo</button>
      <button type="button" disabled={isPublished} onClick={clearDraft}>Limpar rascunho local</button>
      <button
        type="button"
        disabled={saveState === "saving" || loadingContent || isPublished}
        onClick={saveDraft}
      >
        {saveState === "saving" ? "Salvando…" : "Salvar rascunho"}
      </button>
      {!isPublished && contentId && (
        <button
          type="button"
          disabled={dirty || saveState === "saving" || !validation.valid}
          onClick={() => transitionStatus(ContentStatus.PUBLISHED)}
        >
          Publicar
        </button>
      )}
      {isPublished && contentId && (
        <button
          type="button"
          disabled={saveState === "saving"}
          onClick={() => transitionStatus(ContentStatus.DRAFT)}
        >
          Voltar para Draft
        </button>
      )}
      <span aria-live="polite" data-save-state={saveState}>
        {saveMessage || (dirty ? "Alterações não salvas." : contentId ? `Rascunho ${contentId}.` : "Novo rascunho.")}
      </span>
    </footer>
  </main>;
}
