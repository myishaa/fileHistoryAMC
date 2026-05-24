import { store } from "@/lib/files-store";

export function requestDeletionPassword(action: string) {
  const password = store.getSettings().deletionPassword;
  if (!password) {
    alert("Set a deletion password in Settings before deleting anything.");
    return false;
  }

  const entered = prompt(`Enter deletion password to ${action}:`);
  if (entered === password) return true;
  if (entered !== null) alert("Incorrect deletion password.");
  return false;
}
