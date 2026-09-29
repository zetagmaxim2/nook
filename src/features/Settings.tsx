import { useRef, useState } from "react";
import { Download, Upload, Trash2, ChevronRight } from "lucide-react";
import {
  PageHeader,
  Card,
  Toggle,
  Button,
  Confirm,
  Sheet,
  ErrorNote,
} from "../ui";
import { dump, replaceAll, clearAll } from "../db";
import { downloadJson, localDate } from "../utils";
import { applyTheme } from "../theme";
import type { StoreName } from "../types";
const validStores: StoreName[] = [
  "novels",
  "chapters",
  "financeEntries",
  "financePlans",
  "habits",
  "habitCompletions",
  "counters",
  "passwords",
  "widgets",
  "settings",
];
export function SettingsPage({
  refresh,
  notify,
}: {
  refresh: () => void;
  notify: (s: string) => void;
}) {
  const [theme, setTheme] = useState(
    localStorage.getItem("nook-theme") || "dark",
  );
  const [confirm, setConfirm] = useState<"export" | "import" | "clear" | null>(
    null,
  );
  const [pending, setPending] = useState<any>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const changeTheme = (v: string) => {
    setTheme(v);
    localStorage.setItem("nook-theme", v);
    applyTheme(v);
  };
  const exportData = async () => {
    try {
      downloadJson(
        {
          format: "nook-backup",
          version: 1,
          exportedAt: new Date().toISOString(),
          data: await dump(),
        },
        `nook-backup-${localDate()}.json`,
      );
      notify("Backup exported");
    } catch (e: any) {
      setError(e.message);
    }
    setConfirm(null);
  };
  const file = async (f?: File) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      if (
        parsed.format !== "nook-backup" ||
        !parsed.data ||
        typeof parsed.data !== "object"
      )
        throw new Error("This is not a valid Nook backup.");
      for (const key of Object.keys(parsed.data))
        if (!validStores.includes(key as StoreName))
          throw new Error("The backup contains unsupported data.");
      setPending(parsed.data);
      setConfirm("import");
    } catch (e: any) {
      setError(e.message);
    }
  };
  const restore = async () => {
    try {
      await replaceAll(pending);
      notify("Backup restored");
      refresh();
      location.reload();
    } catch (e: any) {
      setError(e.message);
    }
    setConfirm(null);
  };
  const wipe = async () => {
    await clearAll();
    localStorage.removeItem("nook-install-dismissed");
    setConfirm(null);
    location.reload();
  };
  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Make Nook yours." />
      <ErrorNote>{error}</ErrorNote>
      <h2 className="section-title">Appearance</h2>
      <Card className="segmented" role="group" aria-label="Appearance">
        {["system", "light", "dark"].map((x) => (
          <button
            className={theme === x ? "active" : ""}
            onClick={() => changeTheme(x)}
            key={x}
          >
            {x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </Card>
      <h2 className="section-title">Home</h2>
      <Card
        className="settings-row"
        onClick={() => location.assign("/?configure=1")}
      >
        <span>
          Pinned counters<small>Choose what appears on your Home screen</small>
        </span>
        <ChevronRight />
      </Card>
      <h2 className="section-title">Data</h2>
      <Card className="settings-list">
        <button onClick={() => setConfirm("export")}>
          <Download />
          <span>
            Export backup<small>Includes passwords and all local data</small>
          </span>
        </button>
        <button onClick={() => input.current?.click()}>
          <Upload />
          <span>
            Import backup<small>Restore from a Nook JSON file</small>
          </span>
        </button>
        <button className="danger-text" onClick={() => setConfirm("clear")}>
          <Trash2 />
          <span>
            Clear all data<small>This cannot be undone</small>
          </span>
        </button>
      </Card>
      <input
        ref={input}
        hidden
        type="file"
        accept="application/json,.json"
        onChange={(e) => file(e.target.files?.[0])}
      />
      <h2 className="section-title">About</h2>
      <Card>
        <h3>Nook 1.0.0</h3>
        <p className="muted">
          A private, offline home for everyday tools. Your data stays on this
          device.
        </p>
      </Card>
      <Confirm
        open={confirm === "export"}
        title="Export private data?"
        body="This backup includes saved passwords in readable form. Store the downloaded file somewhere private."
        confirm="Export backup"
        onClose={() => setConfirm(null)}
        onConfirm={exportData}
      />
      <Confirm
        open={confirm === "import"}
        title="Replace all Nook data?"
        body="Importing will replace everything currently stored in Nook on this device."
        confirm="Replace and restore"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={restore}
      />
      <Confirm
        open={confirm === "clear"}
        title="Clear absolutely everything?"
        body="All novels, chapters, budgets, habits, counters, passwords, and preferences will be permanently removed."
        confirm="Clear all data"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={wipe}
      />
    </div>
  );
}
