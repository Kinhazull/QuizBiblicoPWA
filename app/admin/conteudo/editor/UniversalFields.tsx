"use client";

import type { ReactNode } from "react";
import type { ContentField, ContentValidationIssue } from "../../../../shared/content";
import { defaultListItem, updateAtPath, type ReferenceDraft } from "./editor-model";

type FieldProps = {
  field: ContentField;
  value: unknown;
  path?: readonly (string | number)[];
  errors: readonly ContentValidationIssue[];
  onChange: (value: unknown) => void;
  depth?: number;
};

const fieldId = (path: readonly (string | number)[]) => `content-field-${path.join("-")}`;
const issuesAt = (errors: readonly ContentValidationIssue[], path: readonly (string | number)[]) => {
  const key = path.join(".");
  return errors.filter(issue => issue.field === key || issue.field.startsWith(`${key}.`));
};
const errorDescription = (
  errors: readonly ContentValidationIssue[],
  path: readonly (string | number)[],
) => issuesAt(errors, path).map((_, index) => `${fieldId(path)}-error-${index}`).join(" ") || undefined;

function FieldFrame({ field, path, errors, children }: FieldProps & { children: ReactNode }) {
  const id = fieldId(path ?? [field.key]);
  const fieldErrors = issuesAt(errors, path ?? [field.key]);
  return <div className={`editor-field editor-field-${field.type}`}>
    <label htmlFor={id}>{field.label}{field.required && <span aria-label="obrigatório"> *</span>}</label>
    {field.description && <small>{field.description}</small>}
    {children}
    {fieldErrors.map((error, index) => <p className="editor-field-error" id={`${id}-error-${index}`} role="alert" key={`${error.code}:${error.field}`}>{error.message}</p>)}
  </div>;
}

export function TextField(props: FieldProps) {
  const path = props.path ?? [props.field.key], id = fieldId(path);
  return <FieldFrame {...props} path={path}><input id={id} value={typeof props.value === "string" ? props.value : ""} placeholder={props.field.placeholder} minLength={props.field.minimum} maxLength={props.field.maximum} aria-invalid={issuesAt(props.errors, path).length > 0} aria-describedby={errorDescription(props.errors, path)} onChange={event => props.onChange(event.target.value)} /></FieldFrame>;
}

export function TextareaField(props: FieldProps) {
  const path = props.path ?? [props.field.key], id = fieldId(path);
  return <FieldFrame {...props} path={path}><textarea id={id} value={typeof props.value === "string" ? props.value : ""} placeholder={props.field.placeholder} minLength={props.field.minimum} maxLength={props.field.maximum} aria-invalid={issuesAt(props.errors, path).length > 0} aria-describedby={errorDescription(props.errors, path)} onChange={event => props.onChange(event.target.value)} /></FieldFrame>;
}

export function SelectField(props: FieldProps) {
  const path = props.path ?? [props.field.key], id = fieldId(path);
  return <FieldFrame {...props} path={path}><select id={id} value={String(props.value ?? "")} aria-invalid={issuesAt(props.errors, path).length > 0} aria-describedby={errorDescription(props.errors, path)} onChange={event => {
    const option = props.field.options?.find(candidate => String(candidate.value) === event.target.value);
    props.onChange(option?.value ?? event.target.value);
  }}><option value="">Selecione</option>{props.field.options?.map(option => <option value={String(option.value)} key={String(option.value)}>{option.label}</option>)}</select></FieldFrame>;
}

export function NumberField(props: FieldProps) {
  const path = props.path ?? [props.field.key], id = fieldId(path);
  return <FieldFrame {...props} path={path}><input id={id} type="number" value={typeof props.value === "number" ? props.value : ""} min={props.field.minimum} max={props.field.maximum} aria-invalid={issuesAt(props.errors, path).length > 0} aria-describedby={errorDescription(props.errors, path)} onChange={event => props.onChange(event.target.value === "" ? "" : Number(event.target.value))} /></FieldFrame>;
}

export function BooleanField(props: FieldProps) {
  const path = props.path ?? [props.field.key], id = fieldId(path);
  const fieldErrors = issuesAt(props.errors, path);
  return <div className="editor-field editor-field-boolean"><label htmlFor={id}><input id={id} type="checkbox" checked={props.value === true} aria-invalid={fieldErrors.length > 0} aria-describedby={errorDescription(props.errors, path)} onChange={event => props.onChange(event.target.checked)} />{props.field.label}</label>{props.field.description && <small>{props.field.description}</small>}{fieldErrors.map((error, index) => <p className="editor-field-error" id={`${id}-error-${index}`} role="alert" key={`${error.code}:${error.field}`}>{error.message}</p>)}</div>;
}

export function ReferenceField({ value, onChange }: { value: ReferenceDraft; onChange: (value: ReferenceDraft) => void }) {
  return <fieldset className="editor-reference"><legend>Referência bíblica</legend><p>ID e tipo ficam apenas na prévia local; o modelo compartilhado continua recebendo o label textual.</p><div>
    <label htmlFor="reference-label">Referência visível<input id="reference-label" value={value.label} placeholder="Ex.: João 3:16" onChange={event => onChange({ ...value, label: event.target.value })} /></label>
    <label htmlFor="reference-id">ID opcional<input id="reference-id" value={value.id} placeholder="Futuro Asset Registry" onChange={event => onChange({ ...value, id: event.target.value })} /></label>
    <label htmlFor="reference-type">Tipo<select id="reference-type" value={value.type} onChange={event => onChange({ ...value, type: event.target.value })}><option value="passage">Passagem</option><option value="book">Livro</option><option value="entity">Entidade futura</option></select></label>
  </div></fieldset>;
}

export function ObjectField(props: FieldProps) {
  const path = props.path ?? [props.field.key], depth = props.depth ?? 0;
  if (depth >= 4) return <div className="editor-field-error" role="alert">Estrutura interna excede o limite seguro.</div>;
  const object = props.value && typeof props.value === "object" && !Array.isArray(props.value) ? props.value as Record<string, unknown> : {};
  return <fieldset className="editor-object"><legend>{props.field.label}</legend>{props.field.fields?.map(child => <UniversalFieldRenderer field={child} value={object[child.key]} path={[...path, child.key]} errors={props.errors} depth={depth + 1} key={child.key} onChange={value => props.onChange(updateAtPath(object, [child.key], value))} />)}</fieldset>;
}

export function ListField(props: FieldProps) {
  const path = props.path ?? [props.field.key], items = Array.isArray(props.value) ? props.value : [], depth = props.depth ?? 0;
  const atMin = items.length <= (props.field.minimumItems ?? 0), atMax = items.length >= (props.field.maximumItems ?? Infinity);
  const listErrors = props.errors.filter(issue => issue.field === path.join("."));
  return <fieldset className="editor-list"><legend>{props.field.label}</legend><p>{props.field.description} <span>{items.length}{props.field.maximumItems ? `/${props.field.maximumItems}` : ""}</span></p>
    {listErrors.map((error, index) => <p className="editor-field-error" role="alert" key={`${error.code}:${index}`}>{error.message}</p>)}
    <div className="editor-list-items">{items.map((item, index) => <article key={index}>
      <header><strong>Item {index + 1}</strong><div>
        <button type="button" aria-label={`Mover item ${index + 1} para cima`} disabled={index === 0} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; props.onChange(next); }}>↑</button>
        <button type="button" aria-label={`Mover item ${index + 1} para baixo`} disabled={index === items.length - 1} onClick={() => { const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; props.onChange(next); }}>↓</button>
        <button type="button" aria-label={`Remover item ${index + 1}`} disabled={atMin} onClick={() => props.onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Remover</button>
      </div></header>
      {props.field.fields?.length ? <ObjectField field={{ ...props.field, key: String(index), label: "", type: "object", fields: props.field.fields }} value={item} path={[...path, index]} errors={props.errors} depth={depth + 1} onChange={value => props.onChange(updateAtPath(items, [index], value))} /> : <UniversalFieldRenderer field={props.field.itemField ?? { key: String(index), label: `Item ${index + 1}`, description: "", type: "text", required: true }} value={item} path={[...path, index]} errors={props.errors} depth={depth + 1} onChange={value => props.onChange(updateAtPath(items, [index], value))} />}
    </article>)}</div>
    <button className="editor-add-item" type="button" disabled={atMax} onClick={() => props.onChange([...items, defaultListItem(props.field)])}>Adicionar item</button>
  </fieldset>;
}

export function UniversalFieldRenderer(props: FieldProps) {
  if (props.field.type === "textarea") return <TextareaField {...props} />;
  if (props.field.type === "select") return <SelectField {...props} />;
  if (props.field.type === "number") return <NumberField {...props} />;
  if (props.field.type === "boolean") return <BooleanField {...props} />;
  if (props.field.type === "list") return <ListField {...props} />;
  if (props.field.type === "object") return <ObjectField {...props} />;
  if (props.field.type === "reference") return <TextField {...props} />;
  return <TextField {...props} />;
}
