import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Home,
  Grid2X2,
  ContactRound,
  WalletCards,
  KeyRound,
  WifiOff,
} from "lucide-react";
import { seed } from "./db";
import { Button, ErrorNote, Sheet, Toast } from "./ui";
import { useOnline } from "./hooks";
import { applyTheme } from "./theme";
import { Dashboard } from "./features/Dashboard";
import { Utilities } from "./features/Utilities";
import { SettingsPage } from "./features/Settings";
import { GlobalSearch } from "./features/Search";
import Contacts from "./features/Contacts";
const Novels = lazy(() => import("./features/Novels"));
const Finance = lazy(() => import("./features/Finance"));
const Habits = lazy(() => import("./features/Habits"));
const Counters = lazy(() => import("./features/Counters"));
const Passwords = lazy(() => import("./features/Passwords"));
export type Route = { page: string; id?: string; subId?: string };
const parse = (): Route => {
  const p = location.pathname.split("/").filter(Boolean);
  return { page: p[0] || "home", id: p[1], subId: p[2] };
};
export function App() {
  const [route, setRoute] = useState(parse);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState(false);
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState("");
  const online = useOnline();
  const nav = (path: string) => {
    history.pushState({}, "", path);
    setRoute(parse());
    scrollTo(0, 0);
  };
  const refresh = () => setVersion((v) => v + 1);
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 2200);
  };
  useEffect(() => {
    seed()
      .then(() => setReady(true))
      .catch((e) => setDbError(e.message));
    const pop = () => setRoute(parse());
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const pref = localStorage.getItem("nook-theme") || "dark";
    applyTheme(pref);
    const media = matchMedia("(prefers-color-scheme: light)");
    const update = () => applyTheme(localStorage.getItem("nook-theme") || "dark");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const ctx = { nav, refresh, version, notify };
  const content = useMemo(() => {
    if (!ready) return <div className="loading">Opening your Nook…</div>;
    switch (route.page) {
      case "home":
        return <Dashboard {...ctx} />;
      case "utilities":
        return <Utilities nav={nav} onSearch={() => setSearch(true)} />;
      case "settings":
        return <SettingsPage {...ctx} />;
      case "novels":
        return <Novels {...ctx} novelId={route.id} chapterId={route.subId} />;
      case "finance":
        return <Finance {...ctx} />;
      case "habits":
        return <Habits {...ctx} />;
      case "counters":
        return <Counters {...ctx} />;
      case "passwords":
        return <Passwords {...ctx} />;
      case "contacts":
        return <Contacts {...ctx} contactId={route.id} />;
      default:
        return <Utilities nav={nav} onSearch={() => setSearch(true)} />;
    }
  }, [route, ready, version]);
  const showNav = !(route.page === "novels" && route.subId);
  const morePage = ["utilities", "habits", "counters", "settings", "novels"].includes(route.page);
  return (
    <>
      <div className={`app ${showNav ? "has-bottom-nav" : ""}`}>
        <ErrorNote>{dbError}</ErrorNote>
        {!online && (
          <div className="offline">
            <WifiOff size={15} /> Offline — your local tools still work
          </div>
        )}
        <main>
          <Suspense fallback={<div className="loading">Opening…</div>}>
            {content}
          </Suspense>
        </main>
        {showNav && (
          <nav className="bottom-nav" aria-label="Primary">
            <button
              className={route.page === "home" ? "active" : ""}
              aria-current={route.page === "home" ? "page" : undefined}
              onClick={() => nav("/")}
            >
              <Home />
              <span>Home</span>
            </button>
            <button
              className={route.page === "finance" ? "active" : ""}
              aria-current={route.page === "finance" ? "page" : undefined}
              onClick={() => nav("/finance")}
            >
              <WalletCards />
              <span>Finance</span>
            </button>
            <button
              className={route.page === "contacts" ? "active" : ""}
              aria-current={route.page === "contacts" ? "page" : undefined}
              onClick={() => nav("/contacts")}
            >
              <ContactRound />
              <span>People</span>
            </button>
            <button
              className={route.page === "passwords" ? "active" : ""}
              aria-current={route.page === "passwords" ? "page" : undefined}
              onClick={() => nav("/passwords")}
            >
              <KeyRound />
              <span>Passwords</span>
            </button>
            <button
              className={morePage ? "active" : ""}
              aria-current={morePage ? "page" : undefined}
              onClick={() => nav("/utilities")}
            >
              <Grid2X2 />
              <span>More</span>
            </button>
          </nav>
        )}
      </div>
      <Sheet open={search} title="Search Nook" onClose={() => setSearch(false)}>
        <GlobalSearch
          nav={(p) => {
            setSearch(false);
            nav(p);
          }}
        />
      </Sheet>
      <InstallPrompt />
      <Toast message={toast} />
    </>
  );
}
function InstallPrompt() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (
      !localStorage.getItem("nook-install-dismissed") &&
      !matchMedia("(display-mode: standalone)").matches
    )
      setTimeout(() => setShow(true), 800);
  }, []);
  return (
    <Sheet
      open={show}
      title="Install Nook on your iPhone"
      onClose={() => {
        localStorage.setItem("nook-install-dismissed", "1");
        setShow(false);
      }}
    >
      <ol className="install">
        <li>
          Tap <strong>Share</strong> in Safari.
        </li>
        <li>
          Choose <strong>Add to Home Screen</strong>.
        </li>
        <li>
          Tap <strong>Add</strong>.
        </li>
      </ol>
      <p className="muted">
        Nook will open full screen and stay available offline.
      </p>
      <Button
        onClick={() => {
          localStorage.setItem("nook-install-dismissed", "1");
          setShow(false);
        }}
      >
        Got it
      </Button>
    </Sheet>
  );
}
