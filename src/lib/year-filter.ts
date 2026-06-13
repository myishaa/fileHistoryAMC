import type { FileRecord } from "@/lib/files-store";

export const ALL_ACTIVE_FILES_YEAR = "__all_active_files__";

export function isAllActiveFilesYear(year: string | undefined) {
  return year === ALL_ACTIVE_FILES_YEAR;
}

export function normalizeMilestoneName(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function isPaymentCompletedFile(file: Pick<FileRecord, "completedMilestones">) {
  return Boolean(
    file.completedMilestones?.some((milestone) => normalizeMilestoneName(milestone) === "payment"),
  );
}

function isYes(value: string | undefined) {
  return (value ?? "").trim().toLowerCase() === "yes";
}

export function isCancelledFile(
  file: Pick<FileRecord, "demandCancelled" | "soCancelled" | "supplyOrders">,
) {
  return (
    isYes(file.demandCancelled) ||
    isYes(file.soCancelled) ||
    Boolean(
      file.supplyOrders?.some((order) => isYes(order.demandCancelled) || isYes(order.soCancelled)),
    )
  );
}

export function isInactiveFile(
  file: Pick<
    FileRecord,
    "completedMilestones" | "demandCancelled" | "soCancelled" | "supplyOrders"
  >,
) {
  return isPaymentCompletedFile(file) || isCancelledFile(file);
}

export function isFileVisibleForYear(
  file: Pick<
    FileRecord,
    | "year"
    | "activeYears"
    | "completedMilestones"
    | "demandCancelled"
    | "soCancelled"
    | "supplyOrders"
  >,
  year: string | undefined,
) {
  if (!year) return true;
  if (isAllActiveFilesYear(year)) return !isInactiveFile(file);
  return file.year === year || file.activeYears?.includes(year);
}
