import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { store, useDivisions } from "@/lib/files-store";
import { Save, Eraser, Info } from "lucide-react";

export const Route = createFileRoute("/add")({
  component: AddFilePage,
});

const empty = { title: "", division: "", officer: "", imms: "", date: "" };

function AddFilePage() {
  const divisions = useDivisions();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    store.addFile({
      title: form.title || undefined,
      division: form.division || undefined,
      officer: form.officer || undefined,
      imms: form.imms || undefined,
      date: form.date || undefined,
    });
    setSaved(true);
    setTimeout(() => {
      navigate({ to: "/search" });
    }, 700);
  };

  return (
    <div className="max-w-3xl">
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-base font-semibold">Add a new file</h2>
          <p className="text-xs text-muted-foreground mt-1">
            All fields are optional — save now and complete missing details later.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Title" hint="A short descriptive name">
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Gear assembly inspection report"
              className={inputCls}
            />
          </Field>

          <Field label="Division">
            <select
              value={form.division}
              onChange={(e) => update("division", e.target.value)}
              className={inputCls}
            >
              <option value="">Select division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Demand Officer">
            <input
              value={form.officer}
              onChange={(e) => update("officer", e.target.value)}
              placeholder="Officer name"
              className={inputCls}
            />
          </Field>

          <Field label="IMMS Number">
            <input
              value={form.imms}
              onChange={(e) => update("imms", e.target.value)}
              placeholder="IMMS-XXXX"
              className={inputCls}
            />
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="md:col-span-2 flex items-start gap-2 text-xs text-muted-foreground bg-accent/40 border border-border rounded-md p-3">
            <Info className="size-4 mt-0.5 text-primary" />
            <p>
              Tip: incomplete entries are flagged with a status badge so you can find and update them
              from <span className="font-medium text-foreground">Search Files</span>.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-secondary/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setForm(empty)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-border bg-card text-sm hover:bg-accent"
          >
            <Eraser className="size-4" /> Clear
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Save className="size-4" /> {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1.5 flex items-center justify-between">
        <span>{label} <span className="text-muted-foreground font-normal">(optional)</span></span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
