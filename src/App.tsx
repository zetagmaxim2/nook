import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Home,
  Grid2X2,
  Settings as SettingsIcon,
  Search,
  WifiOff,
} from "lucide-react";
import { seed } from "./db";
import { Button, ErrorNote, Sheet, Toast } from "./ui";
import { useOnline } from "./hooks";
import { Dashboard } from "./features/Dashboard";
import { Utilities } from "./features/Utilities";
import { SettingsPage } from "./features/Settings";
import { GlobalSearch } from "./features/Search";
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
    const pref = localStorage.getItem("nook-theme") || "system";
    document.documentElement.dataset.theme = pref;
  }, []);
  const ctx = { nav, refresh, version, notify };
  const content = useMemo(() => {
    if (!ready) return <div className="loading">Opening your Nook…</div>;
    switch (route.page) {
      case "home":
        return <Dashboard {...ctx} />;
      case "utilities":
        return <Utilities nav={nav} />;
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
      default:
        return <Utilities nav={nav} />;
    }
  }, [route, ready, version]);
  const main =
    route.page === "home" ||
    route.page === "utilities" ||
    route.page === "settings";
  return (
    <>
      <div className="app">
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
        {main && (
          <nav className="bottom-nav" aria-label="Primary">
            <button
              className={route.page === "home" ? "active" : ""}
              onClick={() => nav("/")}
            >
              <Home />
              <span>Home</span>
            </button>
            <button
              className={route.page === "utilities" ? "active" : ""}
              onClick={() => nav("/utilities")}
            >
              <Grid2X2 />
              <span>Utilities</span>
            </button>
            <button onClick={() => setSearch(true)}>
              <Search />
              <span>Search</span>
            </button>
            <button
              className={route.page === "settings" ? "active" : ""}
              onClick={() => nav("/settings")}
            >
              <SettingsIcon />
              <span>Settings</span>
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
