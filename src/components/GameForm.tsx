"use client";

import { useState } from "react";
import { z } from "zod";
import { gameInputSchema, type Game, type GameInput } from "@/lib/schema";

const FIELDS: { name: keyof GameInput; label: string; type: "text" | "number"; step?: string }[] = [
  { name: "title", label: "Title", type: "text" },
  { name: "developer", label: "Developer", type: "text" },
  { name: "genre", label: "Genre", type: "text" },
  { name: "monthly_revenue_usd", label: "Monthly revenue (USD)", type: "number", step: "1" },
  { name: "monthly_downloads", label: "Monthly downloads", type: "number", step: "1" },
  { name: "average_rating", label: "Average rating (0–5)", type: "number", step: "0.1" },
];

type Values = Record<keyof GameInput, string>;

const toValues = (g: Game | null): Values =>
  Object.fromEntries(FIELDS.map((f) => [f.name, g ? String(g[f.name]) : ""])) as Values;

export function GameForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Game | null;
  onSubmit: (input: GameInput) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<Values>(() => toValues(initial));
  const [errors, setErrors] = useState<Partial<Record<keyof GameInput, string[]>>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = Object.fromEntries(
      FIELDS.map((f) => {
        const v = values[f.name].trim();
        return [f.name, f.type === "number" ? (v === "" ? undefined : Number(v)) : v];
      }),
    );
    const parsed = gameInputSchema.safeParse(raw); // same schema the API uses
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const ok = await onSubmit(parsed.data);
    setSubmitting(false);
    if (ok && !initial) setValues(toValues(null));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
      {FIELDS.map((f) => (
        <label key={f.name} className="block text-sm">
          <span className="text-xs text-ink-2">{f.label}</span>
          <input
            name={f.name}
            type={f.type}
            step={f.step}
            value={values[f.name]}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            aria-invalid={!!errors[f.name]}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/20 aria-invalid:border-danger"
          />
          {errors[f.name] && <span className="mt-1 block text-xs text-danger">{errors[f.name]![0]}</span>}
        </label>
      ))}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Add game"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-line px-3 py-2 text-sm text-ink-2 hover:text-ink">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
