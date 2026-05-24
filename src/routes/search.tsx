import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFiles, useDivisions, isIncomplete, store, type FileRecord } from "@/lib/files-store";
import { Search, X, Eye, Pencil, SlidersHorizontal, Filter } from "lucide-react";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

function SearchPage() {
  const files = useFiles();
  const divisions = useDivisions();

  const officers = useMemo(
    () => Array.from(new Set(files.map((f) => f.officer).filter(Boolean))) as string[],
    [files],
  );

  const [q, setQ] = useState("");
  const [division, setDivision] = useState<string>("");
  const [officer, setOfficer] = useState<string>("");
  const [imms, setImms] = useState("");
  const [date, setDate] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return files.filter((f) => {
      if (division && f.division !== division) return false;
      if (officer && f.officer !== officer) return false;
      if (imms && !(f.imms ?? "").toLowerCase().includes(imms.toLowerCase())) return false;
      if (date && f.date !== date) return false;
      if (onlyIncomplete && !isIncomplete(f)) return false;
      if (query) {
        const hay = [f.title, f.division, f.officer, f.imms, f.date]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [files, q, division, officer, imms, date, onlyIncomplete]);

  const clearAll = () => {
    setQ("");
    setDivision("");
    setOfficer("");
    setImms("");
    setDate("");
    setOnlyIncomplete(false);
  };

  const [viewing, setViewing] = useState<FileRecord | null>(null);
  const [editing, setEditing] = useState<FileRecord | null>(null);

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-3 shadow-[var(--shadow-card)] flex items-center gap-2">
        <Search className="size-4 text-muted-foreground ml-2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search across title, division, officer, IMMS, date…"
          className="flex-1 h-10 bg-transparent outline-none text-sm"
        />
        {(q || division || officer || imms || date || onlyIncomplete) && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent"
          >
            <X className="size-3.5" /> Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <aside className="bg-card border border-border rounded-xl p-5 shadow-[var(--shadow-card)] h-fit space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4" /> Filters
          </div>

          <FilterGroup label="Division">
            <div className="space-y-1.5">
              <RadioRow label="All divisions" checked={!division} onClick={() => setDivision("")} />
              {divisions.map((d) => (
                <RadioRow
                  key={d.id}
                  label={d.name}
                  count={files.filter((f) => f.division === d.name).length}
                  checked={division === d.name}
                  onClick={() => setDivision(d.name)}
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Demand Officer">
            <select
              value={officer}
              onChange={(e) => setOfficer(e.target.value)}
              className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
            >
              <option value="">All officers</option>
              {officers.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="IMMS Number">
            <input
              value={imms}
              onChange={(e) => setImms(e.target.value)}
              placeholder="e.g. IMMS-1005"
              className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
            />
          </FilterGroup>

          <FilterGroup label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
            />
          </FilterGroup>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={onlyIncomplete}
              onChange={(e) => setOnlyIncomplete(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Only incomplete files
          </label>
        </aside>

        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Filter className="size-3.5" />
              <span className="font-medium text-foreground">{results.length}</span> result{results.length !== 1 && "s"}
            </span>
            <span>Showing all matching files</span>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-5 py-2.5">Title</th>
                    <th className="text-left font-medium px-5 py-2.5">Division</th>
                    <th className="text-left font-medium px-5 py-2.5">Officer</th>
                    <th className="text-left font-medium px-5 py-2.5">IMMS</th>
                    <th className="text-left font-medium px-5 py-2.5">Date</th>
                    <th className="text-left font-medium px-5 py-2.5">Status</th>
                    <th className="text-right font-medium px-5 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                        No files match your filters.
                      </td>
                    </tr>
                  )}
                  {results.map((f) => (
                    <tr key={f.id} className="border-t border-border hover:bg-secondary/40">
                      <td className="px-5 py-3 font-medium">{f.title ?? <em className="text-muted-foreground">Untitled</em>}</td>
                      <td className="px-5 py-3 text-muted-foreground">{f.division ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{f.officer ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{f.imms ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{f.date ?? "—"}</td>
                      <td className="px-5 py-3">
                        {isIncomplete(f) ? (
                          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                            Incomplete
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">
                            Complete
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewing(f)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:bg-accent"
                          >
                            <Eye className="size-3.5" /> View
                          </button>
                          <button
                            onClick={() => setEditing(f)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/15"
                          >
                            <Pencil className="size-3.5" /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {viewing && <DetailsModal file={viewing} onClose={() => setViewing(null)} />}
      {editing && <EditModal file={editing} onClose={() => setEditing(null)} divisions={divisions.map((d) => d.name)} />}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      {children}
    </div>
  );
}

function RadioRow({
  label, count, checked, onClick,
}: { label: string; count?: number; checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full flex items-center justify-between text-sm px-2 py-1.5 rounded-md transition " +
        (checked ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground/80")
      }
    >
      <span className="flex items-center gap-2">
        <span className={"size-3.5 rounded-full border " + (checked ? "border-primary bg-primary" : "border-border")} />
        {label}
      </span>
      {typeof count === "number" && <span className="text-[11px] text-muted-foreground">{count}</span>}
    </button>
  );
}

function DetailsModal({ file, onClose }: { file: FileRecord; onClose: () => void }) {
  return (
    <ModalShell title="File details" onClose={onClose}>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        {[
          ["Title", file.title],
          ["Division", file.division],
          ["Demand Officer", file.officer],
          ["IMMS Number", file.imms],
          ["Date", file.date],
          ["Created", new Date(file.createdAt).toLocaleString()],
        ].map(([k, v]) => (
          <div key={k as string}>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 font-medium">{v || <span className="text-muted-foreground italic">Not set</span>}</dd>
          </div>
        ))}
      </dl>
    </ModalShell>
  );
}

function EditModal({
  file, onClose, divisions,
}: { file: FileRecord; onClose: () => void; divisions: string[] }) {
  const [f, setF] = useState({
    title: file.title ?? "",
    division: file.division ?? "",
    officer: file.officer ?? "",
    imms: file.imms ?? "",
    date: file.date ?? "",
  });
  const save = () => {
    store.updateFile(file.id, {
      title: f.title || undefined,
      division: f.division || undefined,
      officer: f.officer || undefined,
      imms: f.imms || undefined,
      date: f.date || undefined,
    });
    onClose();
  };
  const del = () => {
    store.deleteFile(file.id);
    onClose();
  };
  return (
    <ModalShell title="Edit file" onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Title" value={f.title} onChange={(v) => setF({ ...f, title: v })} />
        <SelectInput label="Division" value={f.division} options={divisions} onChange={(v) => setF({ ...f, division: v })} />
        <Input label="Demand Officer" value={f.officer} onChange={(v) => setF({ ...f, officer: v })} />
        <Input label="IMMS Number" value={f.imms} onChange={(v) => setF({ ...f, imms: v })} />
        <Input label="Date" type="date" value={f.date} onChange={(v) => setF({ ...f, date: v })} />
      </div>
      <div className="mt-6 flex justify-between">
        <button onClick={del} className="text-xs text-destructive hover:underline">Delete file</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-border bg-card text-sm hover:bg-accent">Cancel</button>
          <button onClick={save} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-[var(--shadow-elevated)] w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="size-7 grid place-items-center rounded-md hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1.5">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
