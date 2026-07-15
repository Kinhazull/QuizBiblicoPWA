"use client";
import { useEffect } from "react";

export function PasswordVisibility() {
  useEffect(() => {
    const enhance = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => {
        if (input.dataset.passwordToggle === "ready") return;
        input.dataset.passwordToggle = "ready";
        const parent = input.parentElement;
        if (!parent) return;
        parent.classList.add("password-field");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "password-visibility-toggle";
        button.setAttribute("aria-label", "Mostrar senha");
        button.setAttribute("aria-pressed", "false");
        button.textContent = "Mostrar";
        button.addEventListener("click", () => {
          const show = input.type === "password";
          input.type = show ? "text" : "password";
          button.textContent = show ? "Ocultar" : "Mostrar";
          button.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
          button.setAttribute("aria-pressed", String(show));
          input.focus({ preventScroll: true });
        });
        parent.appendChild(button);
      });
    };
    enhance();
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) enhance(node); })));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
