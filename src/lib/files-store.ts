// Backend-backed store for files, divisions, users, and settings.
import * as React from "react";
import { defaultTableFieldPresets, type TableFieldPreset } from "@/lib/table-field-presets";

export type FileRecord = {
  id: string;
  title?: string;
  division?: string;
  officer?: string;
  imms?: string;
  date?: string; // ISO yyyy-mm-dd
  year?: string;
  uniqueCode?: string;
  receivedDate?: string;
  scrutinyDate?: string;
  scrutinyResponseDate?: string;
  scrutinyCompletionDate?: string;
  immsDate?: string;
  fileNo?: string;
  indentor?: string;
  demandDescription?: string;
  valueCapital?: string;
  valueRevenue?: string;
  currency?: string;
  exchangeRate?: string;
  gte?: string;
  fileType?: string;
  tcec?: string;
  mode?: string;
  gem?: string;
  highValue?: string;
  ad?: string;
  rqa?: string;
  ifa?: string;
  psb?: string;
  bg?: string;
  rfpVetting?: string;
  highValueMeetingDate?: string;
  highValueMinutesDate?: string;
  preTcecDate?: string;
  preTcecMinutesDate?: string;
  preTcecCommitteeNo?: string;
  adVettingDate?: string;
  rqaApprovalDate?: string;
  ifaSentDate?: string;
  ifaFinalDate?: string;
  cfaSentDate?: string;
  cfaDate?: string;
  gemUndertakingDate?: string;
  rfpVettingInitiationDate?: string;
  rfpVettingApprovalDate?: string;
  tenderLive?: string;
  bidDate?: string;
  bidOpeningDate?: string;
  bidOpened?: string;
  refloat?: string;
  postTcecDate?: string;
  postTcecMinutesDate?: string;
  postTcecCommitteeNumber?: string;
  refloatBiddingDate?: string;
  refloatBidOpeningDate?: string;
  refloatPostTcecDate?: string;
  refloatPostTcecMinutesDate?: string;
  refloatPostTcecCommitteeNo?: string;
  rst?: string;
  biddingStageOver?: string;
  cncDate?: string;
  cncApprovalDate?: string;
  noOfSo?: string;
  soNo?: string;
  gemSoNo?: string;
  soDate?: string;
  soValueCapital?: string;
  soValueRevenue?: string;
  dpDate?: string;
  firm?: string;
  bgValidityDate?: string;
  dpExtension?: string;
  dpExtensionCount?: string;
  ld?: string;
  revisedDp?: string;
  materialReceiptDate?: string;
  billSentForPaymentDate?: string;
  paymentDate?: string;
  paymentMode?: string;
  bgReturnDate?: string;
  demandCancelled?: string;
  soCancelled?: string;
  soCancelledDate?: string;
  invitedFirms?: FirmDetail[];
  bidderFirms?: FirmDetail[];
  supplyOrders?: SupplyOrderDetail[];
  remarks?: FileRemark[];
  currentMilestone?: string;
  completedMilestones?: string[];
  createdAt: string;
};

export type FileRemark = {
  id: string;
  section: string;
  text: string;
  createdAt: string;
};

export type SupplyOrderDetail = {
  soNo?: string;
  gemSoNo?: string;
  soDate?: string;
  soValueCapital?: string;
  soValueRevenue?: string;
  dpDate?: string;
  firm?: string;
  bgValidityDate?: string;
  dpExtension?: string;
  dpExtensionCount?: string;
  ld?: string;
  revisedDp?: string;
  materialReceiptDate?: string;
  billSentForPaymentDate?: string;
  paymentDate?: string;
  paymentMode?: string;
  bgReturnDate?: string;
  demandCancelled?: string;
  soCancelled?: string;
  soCancelledDate?: string;
};

export type FirmDetail = {
  firmName?: string;
  city?: string;
  emailId?: string;
};

export type Division = {
  id: string;
  name: string;
  code?: string;
  allocatedCapital?: string;
  allocatedRevenue?: string;
  ad?: string;
};
export type AppUserRole = "admin" | "division_user";
export type AppUser = {
  id: string;
  name: string;
  username: string;
  role: AppUserRole;
  divisionIds: string[];
};
export type AppTheme = "light" | "dark";
export type AppThemeTint = "plain" | "yellow" | "green" | "blue" | "pink" | "lavender";
export type AppSettings = {
  financialYear: string;
  selectedYear: string;
  theme: AppTheme;
  themeTint: AppThemeTint;
  deletionPassword: string;
  tcecCommittees: string[];
  milestones: string[];
  tableFieldPresets: TableFieldPreset[];
  activeUserId?: string;
};

function currentYear() {
  return String(new Date().getFullYear());
}

const defaultSettings: AppSettings = {
  financialYear: currentYear(),
  selectedYear: currentYear(),
  theme: "light",
  themeTint: "plain",
  deletionPassword: "",
  tcecCommittees: [],
  milestones: [],
  tableFieldPresets: defaultTableFieldPresets,
};

const defaultUsers: AppUser[] = [];

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

type StoreState = {
  files: FileRecord[];
  divisions: Division[];
  settings: AppSettings;
  users: AppUser[];
  loading: boolean;
  loaded: boolean;
  error?: string;
};

let state: StoreState = {
  files: [],
  divisions: [],
  settings: defaultSettings,
  users: defaultUsers,
  loading: false,
  loaded: false,
};

let loadPromise: Promise<void> | undefined;

function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  emit();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      // Keep the status-based message if the backend did not send JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function loadAll(force = false) {
  if (typeof window === "undefined") return;
  if (loadPromise && !force) return loadPromise;

  loadPromise = (async () => {
    setState({ loading: true, error: undefined });
    try {
      const [files, divisions, users, settings] = await Promise.all([
        request<{ files: FileRecord[] }>("/api/files"),
        request<{ divisions: Division[] }>("/api/divisions"),
        request<{ users: AppUser[] }>("/api/users"),
        request<{ settings: AppSettings }>("/api/settings"),
      ]);

      setState({
        files: files.files,
        divisions: divisions.divisions,
        users: users.users,
        settings: {
          ...defaultSettings,
          ...settings.settings,
          tableFieldPresets: settings.settings.tableFieldPresets?.length
            ? settings.settings.tableFieldPresets
            : defaultTableFieldPresets,
        },
        loading: false,
        loaded: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load backend data.";
      console.error(error);
      setState({ loading: false, loaded: true, error: message });
    } finally {
      loadPromise = undefined;
    }
  })();

  return loadPromise;
}

function ensureLoaded() {
  if (typeof window === "undefined") return;
  if (!state.loaded && !state.loading) void loadAll();
}

function runMutation(mutation: () => Promise<unknown>) {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      await mutation();
      await loadAll(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backend save failed.";
      console.error(error);
      setState({ error: message });
    }
  })();
}

export const store = {
  getFiles(): FileRecord[] {
    ensureLoaded();
    return state.files;
  },
  getDivisions(): Division[] {
    ensureLoaded();
    return state.divisions;
  },
  getSettings(): AppSettings {
    ensureLoaded();
    const financialYear = state.settings.financialYear ?? defaultSettings.financialYear;
    return { ...defaultSettings, ...state.settings, financialYear };
  },
  getUsers(): AppUser[] {
    ensureLoaded();
    return state.users;
  },
  updateSettings(patch: Partial<AppSettings>) {
    setState({ settings: { ...store.getSettings(), ...patch } });
    runMutation(() =>
      request("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
  },
  addFile(f: Omit<FileRecord, "id" | "createdAt">) {
    runMutation(() =>
      request("/api/files", {
        method: "POST",
        body: JSON.stringify(f),
      }),
    );
  },
  updateFile(id: string, patch: Partial<FileRecord>) {
    setState({ files: state.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
    runMutation(() =>
      request(`/api/files/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
  },
  deleteFile(id: string) {
    setState({ files: state.files.filter((f) => f.id !== id) });
    runMutation(() => request(`/api/files/${id}`, { method: "DELETE" }));
  },
  addDivision(
    name: string,
    code?: string,
    allocatedCapital?: string,
    allocatedRevenue?: string,
    ad?: string,
  ) {
    runMutation(() =>
      request("/api/divisions", {
        method: "POST",
        body: JSON.stringify({ name, code, allocatedCapital, allocatedRevenue, ad }),
      }),
    );
  },
  updateDivision(id: string, patch: Partial<Division>) {
    setState({ divisions: state.divisions.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
    runMutation(() =>
      request(`/api/divisions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
  },
  deleteDivision(id: string) {
    setState({
      divisions: state.divisions.filter((d) => d.id !== id),
      users: state.users.map((user) => ({
        ...user,
        divisionIds: user.divisionIds.filter((divId) => divId !== id),
      })),
    });
    runMutation(() => request(`/api/divisions/${id}`, { method: "DELETE" }));
  },
  addUser(user: Omit<AppUser, "id">) {
    runMutation(() =>
      request("/api/users", {
        method: "POST",
        body: JSON.stringify(user),
      }),
    );
  },
  updateUser(id: string, patch: Partial<AppUser>) {
    setState({ users: state.users.map((user) => (user.id === id ? { ...user, ...patch } : user)) });
    runMutation(() =>
      request(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
  },
  deleteUser(id: string) {
    setState({ users: state.users.filter((user) => user.id !== id) });
    runMutation(() => request(`/api/users/${id}`, { method: "DELETE" }));
  },
  subscribe(fn: () => void) {
    ensureLoaded();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  reload() {
    return loadAll(true);
  },
};

export function useFiles() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const u = store.subscribe(() => setTick((t) => t + 1));
    return () => {
      u();
    };
  }, []);
  return store.getFiles();
}

export function useDivisions() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const u = store.subscribe(() => setTick((t) => t + 1));
    return () => {
      u();
    };
  }, []);
  return store.getDivisions();
}

export function useSettings() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const u = store.subscribe(() => setTick((t) => t + 1));
    return () => {
      u();
    };
  }, []);
  return store.getSettings();
}

export function useUsers() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const u = store.subscribe(() => setTick((t) => t + 1));
    return () => {
      u();
    };
  }, []);
  return store.getUsers();
}

export function useActiveUser() {
  const users = useUsers();
  const settings = useSettings();
  return users.find((user) => user.id === settings.activeUserId);
}

export function useAccessibleDivisions() {
  const divisions = useDivisions();
  const activeUser = useActiveUser();
  if (!activeUser || activeUser.role === "admin") return divisions;
  return divisions.filter((division) => activeUser.divisionIds.includes(division.id));
}

export function useAccessibleFiles() {
  const files = useFiles();
  const settings = useSettings();
  const accessibleDivisions = useAccessibleDivisions();
  const activeUser = useActiveUser();
  const yearFilteredFiles = settings.selectedYear
    ? files.filter((file) => file.year === settings.selectedYear)
    : files;
  if (!activeUser || activeUser.role === "admin") return yearFilteredFiles;
  const allowedDivisionNames = new Set(accessibleDivisions.map((division) => division.name));
  return yearFilteredFiles.filter(
    (file) => file.division && allowedDivisionNames.has(file.division),
  );
}

export function isIncomplete(f: FileRecord) {
  return !f.title || !f.division || !f.officer || !f.imms || !f.date;
}
