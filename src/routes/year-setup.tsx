import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GitMerge, Landmark, Plus, RotateCw, Save } from "lucide-react";
import { store, type Division, useActiveUser, useFiles, useSettings } from "@/lib/files-store";
import { formatThousandsAndLakhs, getInrAmount, parseAmount } from "@/lib/money";
import { isAllActiveFilesYear, isCancelledFile, isFileVisibleForYear } from "@/lib/year-filter";

export const Route = createFileRoute("/year-setup")({
  component: YearSetupPage,
});

type DraftAllocation = {
  allocatedCapital: string;
  allocatedRevenue: string;
  active: boolean;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function YearSetupPage() {
  return <YearSetupPanel />;
}

export function YearSetupPanel() {
  const activeUser = useActiveUser();
  const settings = useSettings();
  const files = useFiles();
  const [currentDivisions, setCurrentDivisions] = useState<Division[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftAllocation>>({});
  const [savingId, setSavingId] = useState<string | undefined>();
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCapital, setNewCapital] = useState("");
  const [newRevenue, setNewRevenue] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [mergeSourceIds, setMergeSourceIds] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeTargetName, setMergeTargetName] = useState("");
  const [mergeTargetCode, setMergeTargetCode] = useState("");
  const [mergeEffectiveDate, setMergeEffectiveDate] = useState(todayIsoDate);
  const [mergeNotes, setMergeNotes] = useState("");
  const [moveActiveFiles, setMoveActiveFiles] = useState(true);
  const [deactivateSourceDivisions, setDeactivateSourceDivisions] = useState(true);
  const [mergeSaving, setMergeSaving] = useState(false);
  const [mergeMessage, setMergeMessage] = useState("");
  const setupYear = isAllActiveFilesYear(settings.selectedYear)
    ? settings.financialYear
    : settings.selectedYear;

  const yearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            settings.financialYear,
            setupYear,
            ...settings.financialYears,
            ...files.map((file) => file.year),
            ...files.flatMap((file) => file.activeYears ?? []),
          ]
            .map((year) => year?.trim())
            .filter((year): year is string => Boolean(year) && !isAllActiveFilesYear(year)),
        ),
      ).sort((a, b) => b.localeCompare(a)),
    [files, settings.financialYear, settings.financialYears, setupYear],
  );

  useEffect(() => {
    let cancelled = false;
    store
      .getDivisionsForYear(setupYear, true)
      .then((payload) => {
        if (!cancelled) setCurrentDivisions(payload.divisions);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setCurrentDivisions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, setupYear]);

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      currentDivisions.forEach((division) => {
        if (!next[division.id]) {
          next[division.id] = {
            allocatedCapital: division.allocatedCapital ?? "",
            allocatedRevenue: division.allocatedRevenue ?? "",
            active: division.active ?? false,
          };
        }
      });
      return next;
    });
  }, [currentDivisions]);

  const currentFilesByDivision = useMemo(
    () => getYearFileCounts(files, setupYear),
    [files, setupYear],
  );
  const currentValuesByDivision = useMemo(
    () => getYearFileValues(files, setupYear),
    [files, setupYear],
  );

  const rows = useMemo(
    () =>
      currentDivisions.map((division) => {
        const draft = drafts[division.id] ?? {
          allocatedCapital: division.allocatedCapital ?? "",
          allocatedRevenue: division.allocatedRevenue ?? "",
          active: division.active ?? false,
        };
        const currentFileCount = currentFilesByDivision.get(division.name) ?? 0;
        const currentValues = currentValuesByDivision.get(division.name) ?? {
          capital: 0,
          revenue: 0,
        };
        return {
          division,
          draft,
          currentFileCount,
          currentValues,
        };
      }),
    [currentDivisions, currentFilesByDivision, currentValuesByDivision, drafts],
  );

  const activeDivisions = useMemo(
    () => currentDivisions.filter((division) => division.active),
    [currentDivisions],
  );
  const targetOptions = useMemo(
    () => currentDivisions.filter((division) => !mergeSourceIds.includes(division.id)),
    [currentDivisions, mergeSourceIds],
  );
  const selectedSourceFileCount = useMemo(
    () =>
      currentDivisions
        .filter((division) => mergeSourceIds.includes(division.id))
        .reduce((total, division) => total + (currentFilesByDivision.get(division.name) ?? 0), 0),
    [currentDivisions, currentFilesByDivision, mergeSourceIds],
  );

  if (activeUser?.role !== "admin") {
    return (
      <div className="max-w-xl rounded-md border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h1 className="text-sm font-semibold">Year setup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This yearly allocation setup is available only to administrators.
        </p>
      </div>
    );
  }

  const updateDraft = (id: string, patch: Partial<DraftAllocation>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        allocatedCapital: current[id]?.allocatedCapital ?? "",
        allocatedRevenue: current[id]?.allocatedRevenue ?? "",
        active: current[id]?.active ?? false,
        ...patch,
      },
    }));
  };

  const saveAllocation = async (division: Division, allocation: DraftAllocation) => {
    setSavingId(division.id);
    try {
      await store.saveDivisionAllocation(division.id, setupYear, allocation);
    } finally {
      setSavingId(undefined);
    }
  };

  const addDivision = () => {
    if (!newName.trim()) return;
    store.addDivision(
      newName.trim(),
      newCode.trim() || undefined,
      newCapital.trim() || undefined,
      newRevenue.trim() || undefined,
      undefined,
      setupYear,
    );
    setNewName("");
    setNewCode("");
    setNewCapital("");
    setNewRevenue("");
  };

  const toggleMergeSource = (divisionId: string, checked: boolean) => {
    setMergeMessage("");
    setMergeSourceIds((current) =>
      checked ? [...current, divisionId] : current.filter((id) => id !== divisionId),
    );
    if (checked && mergeTargetId === divisionId) setMergeTargetId("");
  };

  const mergeDivisions = async () => {
    setMergeMessage("");
    if (mergeSourceIds.length < 2) {
      setMergeMessage("Select at least two source divisions.");
      return;
    }
    const targetName = mergeTargetName.trim();
    if (!targetName && !mergeTargetId) {
      setMergeMessage("Choose a target division or enter a new merged division name.");
      return;
    }

    setMergeSaving(true);
    try {
      await store.mergeDivisions({
        financialYear: setupYear,
        sourceDivisionIds: mergeSourceIds,
        targetDivisionId: targetName ? undefined : mergeTargetId,
        targetDivisionName: targetName || undefined,
        targetDivisionCode: targetName ? mergeTargetCode.trim() || undefined : undefined,
        effectiveDate: mergeEffectiveDate || undefined,
        notes: mergeNotes.trim() || undefined,
        moveActiveFiles,
        deactivateSourceDivisions,
      });
      setMergeSourceIds([]);
      setMergeTargetId("");
      setMergeTargetName("");
      setMergeTargetCode("");
      setMergeNotes("");
      setReloadKey((value) => value + 1);
      setMergeMessage("Division merge saved.");
    } catch (error) {
      setMergeMessage(error instanceof Error ? error.message : "Merge failed.");
    } finally {
      setMergeSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Year setup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a financial year and decide which divisions are active for that year. Enter that
            year's capital and revenue funds here; each new year starts with its own allocation and
            committee setup.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Files can continue into another year, and active files can be moved when divisions merge
            without changing the old division master record.
          </p>
        </div>
        <label className="block">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Setup year</div>
          <select
            value={setupYear}
            onChange={(event) => store.updateSettings({ selectedYear: event.target.value })}
            className="h-9 min-w-36 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-md border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Add a division for {setupYear}</h2>
            <p className="text-xs text-muted-foreground">
              Use this when the year has a new office, section, or budget head.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_auto]">
          <AllocationInput value={newName} onChange={setNewName} placeholder="Division name" />
          <AllocationInput value={newCode} onChange={setNewCode} placeholder="Code" />
          <AllocationInput
            value={newCapital}
            onChange={setNewCapital}
            placeholder="Capital"
            amount
          />
          <AllocationInput
            value={newRevenue}
            onChange={setNewRevenue}
            placeholder="Revenue"
            amount
          />
          <button
            type="button"
            onClick={addDivision}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" />
            Add
          </button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Merge divisions for {setupYear}</h2>
            <p className="text-xs text-muted-foreground">
              Active files from selected divisions will continue under the merged division.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <GitMerge className="size-4" />
            {selectedSourceFileCount} active files
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Source divisions</div>
            <div className="grid max-h-52 gap-2 overflow-auto rounded-md border border-border bg-background p-2 sm:grid-cols-2">
              {activeDivisions.map((division) => (
                <label
                  key={division.id}
                  className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={mergeSourceIds.includes(division.id)}
                    onChange={(event) => toggleMergeSource(division.id, event.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  <span className="min-w-0 flex-1 truncate">{division.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {currentFilesByDivision.get(division.name) ?? 0}
                  </span>
                </label>
              ))}
              {!activeDivisions.length && (
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  No active divisions in this year.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Existing merged division
                </div>
                <select
                  value={mergeTargetId}
                  onChange={(event) => {
                    setMergeTargetId(event.target.value);
                    if (event.target.value) setMergeTargetName("");
                  }}
                  disabled={Boolean(mergeTargetName.trim())}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                >
                  <option value="">Select target</option>
                  {targetOptions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Effective date
                </div>
                <input
                  type="date"
                  value={mergeEffectiveDate}
                  onChange={(event) => setMergeEffectiveDate(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_0.45fr]">
              <AllocationInput
                value={mergeTargetName}
                onChange={(value) => {
                  setMergeTargetName(value);
                  if (value.trim()) setMergeTargetId("");
                }}
                placeholder="New merged division name"
              />
              <AllocationInput
                value={mergeTargetCode}
                onChange={setMergeTargetCode}
                placeholder="Code"
              />
            </div>

            <textarea
              value={mergeNotes}
              onChange={(event) => setMergeNotes(event.target.value)}
              placeholder="Notes"
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                <input
                  type="checkbox"
                  checked={moveActiveFiles}
                  onChange={(event) => setMoveActiveFiles(event.target.checked)}
                  className="size-4 rounded border-input"
                />
                Move active files
              </label>
              <label className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                <input
                  type="checkbox"
                  checked={deactivateSourceDivisions}
                  onChange={(event) => setDeactivateSourceDivisions(event.target.checked)}
                  className="size-4 rounded border-input"
                />
                Deactivate source divisions
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">{mergeMessage}</div>
              <button
                type="button"
                onClick={() => void mergeDivisions()}
                disabled={mergeSaving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {mergeSaving ? (
                  <RotateCw className="size-4 animate-spin" />
                ) : (
                  <GitMerge className="size-4" />
                )}
                Merge
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[980px] table-fixed text-sm">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="bg-secondary text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Division</th>
              <th className="px-4 py-2.5 text-left font-medium">Active</th>
              <th className="px-4 py-2.5 text-right font-medium">Current intended</th>
              <th className="px-4 py-2.5 text-left font-medium">Capital allocation</th>
              <th className="px-4 py-2.5 text-left font-medium">Revenue allocation</th>
              <th className="px-4 py-2.5 text-left font-medium">Files</th>
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSaving = savingId === row.division.id;
              return (
                <tr key={row.division.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        <Landmark className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{row.division.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.division.code || "No code"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    <label className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3">
                      <input
                        type="checkbox"
                        checked={row.draft.active}
                        onChange={(event) =>
                          updateDraft(row.division.id, { active: event.target.checked })
                        }
                        className="size-4 rounded border-input"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    <AmountBreakup
                      capital={String(Math.round(row.currentValues.capital))}
                      revenue={String(Math.round(row.currentValues.revenue))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <AllocationInput
                      value={row.draft.allocatedCapital}
                      onChange={(value) =>
                        updateDraft(row.division.id, { allocatedCapital: value })
                      }
                      placeholder="0"
                      amount
                    />
                  </td>
                  <td className="px-4 py-3">
                    <AllocationInput
                      value={row.draft.allocatedRevenue}
                      onChange={(value) =>
                        updateDraft(row.division.id, { allocatedRevenue: value })
                      }
                      placeholder="0"
                      amount
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>
                      {row.currentFileCount} in {setupYear}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void saveAllocation(row.division, row.draft)}
                        disabled={isSaving}
                        title="Save allocation"
                        aria-label="Save allocation"
                        className="grid size-8 place-items-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50"
                      >
                        {isSaving ? (
                          <RotateCw className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllocationInput({
  value,
  onChange,
  placeholder,
  amount = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  amount?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={amount ? "decimal" : undefined}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
    />
  );
}

function AmountBreakup({ capital, revenue }: { capital?: string; revenue?: string }) {
  const capitalValue = parseAmount(capital) ?? 0;
  const revenueValue = parseAmount(revenue) ?? 0;
  return (
    <div className="space-y-0.5 tabular-nums">
      <div>C {formatAmount(capitalValue)}</div>
      <div>R {formatAmount(revenueValue)}</div>
      <div className="text-xs">Total {formatAmount(capitalValue + revenueValue)}</div>
    </div>
  );
}

function getYearFileCounts(files: ReturnType<typeof useFiles>, year: string) {
  const counts = new Map<string, number>();
  if (!year) return counts;
  files.forEach((file) => {
    if (!isFileVisibleForYear(file, year) || !file.division) return;
    counts.set(file.division, (counts.get(file.division) ?? 0) + 1);
  });
  return counts;
}

function getYearFileValues(files: ReturnType<typeof useFiles>, year: string) {
  const values = new Map<string, { capital: number; revenue: number }>();
  if (!year) return values;
  files.forEach((file) => {
    if (!isFileVisibleForYear(file, year) || !file.division) return;
    if (isCancelledFile(file)) return;
    const current = values.get(file.division) ?? { capital: 0, revenue: 0 };
    values.set(file.division, {
      capital: current.capital + (getInrAmount(file.valueCapital, file) ?? 0),
      revenue: current.revenue + (getInrAmount(file.valueRevenue, file) ?? 0),
    });
  });
  return values;
}

function formatAmount(value: number) {
  if (!value) return "0";
  return formatThousandsAndLakhs(value);
}
