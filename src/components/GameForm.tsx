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
      FIELDS.map((f) => [f.name, f.type === "number" && values[f.name] !== "" ? Number(values[f.name]) : values[f.name]]),
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
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {FIELDS.map((f) => (
        <label key={f.name} className="block text-sm">
          <span className="text-zinc-600">{f.label}</span>
          <input
            name={f.name}
            type={f.type}
            step={f.step}
            value={values[f.name]}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            aria-invalid={!!errors[f.name]}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 aria-invalid:border-red-400"
          />
          {errors[f.name] && <span className="text-xs text-red-600">{errors[f.name]![0]}</span>}
        </label>
      ))}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Add game"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border border-zinc-300 px-3 py-1.5 text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
