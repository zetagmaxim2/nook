import { useEffect, useState } from "react";
import {
  Plus,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Trash2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { all, put, remove } from "../db";
import type { PasswordEntry } from "../types";
import { id, now } from "../utils";
import {
  Button,
  Card,
  Confirm,
  EmptyState,
  ErrorNote,
  Field,
  IconButton,
  PageHeader,
  SearchBar,
  Sheet,
  TextInput,
  Toggle,
} from "../ui";
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
export default function Passwords({ notify }: { notify: (s: string) => void }) {
  const lockHash = localStorage.getItem("nook-password-lock");
  const [unlocked, setUnlocked] = useState(!lockHash);
  const [pin, setPin] = useState("");
  const [lockError, setLockError] = useState("");
  if (!unlocked)
    return (
      <div className="page lock-page">
        <PageHeader title="Passwords" subtitle="This section is locked." />
        <Card>
          <Lock className="lock-icon" />
          <Field label="Privacy PIN">
            <TextInput
              autoFocus
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  if ((await hash(pin)) === lockHash) setUnlocked(true);
                  else setLockError("That PIN does not match.");
                }
              }}
            />
          </Field>
          <ErrorNote>{lockError}</ErrorNote>
          <Button
            onClick={async () => {
              if ((await hash(pin)) === lockHash) setUnlocked(true);
              else setLockError("That PIN does not match.");
            }}
          >
            Unlock
          </Button>
          <p className="muted privacy-note">
            This is a local privacy screen, not guaranteed biometric or
            hardware-backed security.
          </p>
        </Card>
      </div>
    );
  return <PasswordList notify={notify} onLock={() => setUnlocked(false)} />;
}
function PasswordList({
  notify,
  onLock,
}: {
  notify: (s: string) => void;
  onLock: () => void;
}) {
  const [items, setItems] = useState<PasswordEntry[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PasswordEntry>();
  const [del, setDel] = useState<PasswordEntry>();
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState(false);
  const [error, setError] = useState("");
  const load = () =>
    all<PasswordEntry>("passwords").then((x) =>
      setItems(x.sort((a, b) => a.site.localeCompare(b.site))),
    );
  useEffect(() => {
    load();
  }, []);
  const save = async (
    v: Pick<PasswordEntry, "site" | "username" | "password">,
  ) => {
    const t = now();
    await put("passwords", {
      ...v,
      id: editing?.id || id(),
      createdAt: editing?.createdAt || t,
      updatedAt: t,
    });
    setOpen(false);
    setEditing(undefined);
    load();
    notify(editing ? "Password updated" : "Password saved");
  };
  const erase = async () => {
    if (del) {
      await remove("passwords", del.id);
      setDel(undefined);
      load();
      notify("Password deleted");
    }
  };
  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s);
      notify("Copied");
    } catch {
      setError("Copy failed. Touch and hold the field to copy manually.");
    }
  };
  const results = items.filter((x) =>
    (x.site + " " + x.username).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="page">
      <PageHeader
        title="Passwords"
        subtitle="Local to this device."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Add
          </Button>
        }
      />
      <div className="privacy-banner">
        <ShieldCheck />
        <span>
          <b>Private by design</b>
          <small>Never synced or sent anywhere.</small>
        </span>
        <button onClick={() => setSettings(true)}>Lock</button>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <SearchBar
        placeholder="Search sites or usernames"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {!results.length ? (
        <EmptyState
          icon="⌘"
          title={q ? "No matches" : "No passwords saved"}
          body={
            q
              ? "Try another site or username."
              : "Add an entry when you’re ready."
          }
        />
      ) : (
        <div className="password-list">
          {results.map((p) => (
            <Card className="password-card" key={p.id}>
              <div className="site-avatar">
                {p.site.slice(0, 1).toUpperCase()}
              </div>
              <div className="password-info">
                <h2>{p.site}</h2>
                <label>
                  Name <span>{p.username}</span>
                  <IconButton
                    label="Copy username"
                    onClick={() => copy(p.username)}
                  >
                    <Copy />
                  </IconButton>
                </label>
                <label>
                  Password{" "}
                  <span className="password-value">
                    {shown.has(p.id) ? p.password : "••••••••••"}
                  </span>
                  <IconButton
                    label={shown.has(p.id) ? "Hide password" : "Show password"}
                    onClick={() =>
                      setShown((s) => {
                        const n = new Set(s);
                        n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                        return n;
                      })
                    }
                  >
                    {shown.has(p.id) ? <EyeOff /> : <Eye />}
                  </IconButton>
                  <IconButton
                    label="Copy password"
                    onClick={() => copy(p.password)}
                  >
                    <Copy />
                  </IconButton>
                </label>
              </div>
              <div className="password-actions">
                <IconButton
                  label="Edit entry"
                  onClick={() => {
                    setEditing(p);
                    setOpen(true);
                  }}
                >
                  <Pencil />
                </IconButton>
                <IconButton label="Delete entry" onClick={() => setDel(p)}>
                  <Trash2 />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
      <PasswordForm
        open={open}
        initial={editing}
        onClose={() => {
          setOpen(false);
          setEditing(undefined);
        }}
        onSave={save}
      />
      <LockSettings
        open={settings}
        onClose={() => setSettings(false)}
        onEnabled={() => {
          setSettings(false);
          onLock();
          notify("Privacy lock enabled");
        }}
      />
      <Confirm
        open={!!del}
        title="Delete this password?"
        body="This saved password will be permanently removed from this device."
        confirm="Delete password"
        danger
        onClose={() => setDel(undefined)}
        onConfirm={erase}
      />
    </div>
  );
}
function PasswordForm({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: PasswordEntry;
  onClose: () => void;
  onSave: (v: Pick<PasswordEntry, "site" | "username" | "password">) => void;
}) {
  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => {
    setSite(initial?.site || "");
    setUsername(initial?.username || "");
    setPassword(initial?.password || "");
  }, [initial, open]);
  return (
    <Sheet
      open={open}
      title={initial ? "Edit password" : "New password"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (site.trim() && username.trim() && password)
            onSave({ site: site.trim(), username: username.trim(), password });
        }}
      >
        <Field label="Site">
          <TextInput
            autoFocus
            required
            value={site}
            onChange={(e) => setSite(e.target.value)}
            autoCapitalize="words"
          />
        </Field>
        <Field label="Name, username, or email">
          <TextInput
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
          />
        </Field>
        <Field label="Password">
          <div className="password-input">
            <TextInput
              required
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoCapitalize="none"
            />
            <IconButton
              type="button"
              label={show ? "Hide password" : "Show password"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff /> : <Eye />}
            </IconButton>
          </div>
        </Field>
        <Button
          type="submit"
          disabled={!site.trim() || !username.trim() || !password}
        >
          Save password
        </Button>
      </form>
    </Sheet>
  );
}
function LockSettings({
  open,
  onClose,
  onEnabled,
}: {
  open: boolean;
  onClose: () => void;
  onEnabled: () => void;
}) {
  const [enabled, setEnabled] = useState(
    !!localStorage.getItem("nook-password-lock"),
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setEnabled(!!localStorage.getItem("nook-password-lock"));
    setPin("");
    setError("");
  }, [open]);
  const apply = async () => {
    if (enabled) {
      if (!/^\d{4,8}$/.test(pin)) {
        setError("Choose a 4–8 digit PIN.");
        return;
      }
      localStorage.setItem("nook-password-lock", await hash(pin));
      onEnabled();
    } else {
      localStorage.removeItem("nook-password-lock");
      onClose();
    }
  };
  return (
    <Sheet open={open} title="Privacy lock" onClose={onClose}>
      <p className="muted">
        Adds a local PIN screen when opening Passwords. It discourages casual
        access but is not a replacement for a dedicated password manager.
      </p>
      <Toggle label="Require a PIN" checked={enabled} onChange={setEnabled} />
      {enabled && (
        <Field label="New 4–8 digit PIN">
          <TextInput
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 8))
            }
          />
        </Field>
      )}
      <ErrorNote>{error}</ErrorNote>
      <Button onClick={apply}>
        {enabled ? "Save and lock" : "Remove lock"}
      </Button>
    </Sheet>
  );
}
