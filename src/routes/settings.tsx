import { createFileRoute } from "@tanstack/react-router";
import { Lock, ScanLine, QrCode, Upload, BarChart3, Shield } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const futureFeatures = [
  { icon: ScanLine, title: "Barcode scanning", desc: "Scan physical file barcodes with any USB or mobile scanner to instantly pull records." },
  { icon: QrCode, title: "QR code integration", desc: "Generate and print QR codes for each file folder for fast lookup." },
  { icon: Upload, title: "File uploads", desc: "Attach scanned PDFs, photos, and digital copies to physical file entries." },
  { icon: BarChart3, title: "Analytics dashboard", desc: "Deep insights on file turnaround, officer load, and division throughput." },
  { icon: Shield, title: "Authentication & roles", desc: "Login with role-based access for staff, supervisors, and administrators." },
];

function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-card border border-border rounded-xl p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-semibold mb-1">Workspace</h2>
        <p className="text-xs text-muted-foreground mb-5">Configure how this records system behaves.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Organisation name" value="Office of Records Management" />
          <Field label="Default division" value="Mechanical" />
          <Field label="Date format" value="YYYY-MM-DD" />
          <Field label="Locale" value="English (India)" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold">Upcoming features</h2>
            <p className="text-xs text-muted-foreground">Planned for future releases.</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-accent text-accent-foreground rounded px-2 py-1">Roadmap</span>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {futureFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="flex gap-3 p-4 rounded-lg border border-dashed border-border bg-secondary/30">
                <div className="size-10 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {f.title}
                    <Lock className="size-3 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1.5">{label}</div>
      <input
        defaultValue={value}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}
