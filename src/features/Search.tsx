import { useEffect, useState } from "react";
import { all } from "../db";
import { SearchBar, EmptyState } from "../ui";
import type { Novel, Chapter, PasswordEntry, Counter, Habit } from "../types";
type R = { title: string; subtitle: string; path: string; kind: string };
export function GlobalSearch({ nav }: { nav: (p: string) => void }) {
  const [q, setQ] = useState("");
  const [data, setData] = useState<R[]>([]);
  useEffect(() => {
    Promise.all([
      all<Novel>("novels"),
      all<Chapter>("chapters"),
      all<PasswordEntry>("passwords"),
      all<Counter>("counters"),
      all<Habit>("habits"),
    ]).then(([n, ch, p, c, h]) =>
      setData([
        ...n.map((x) => ({
          title: x.title,
          subtitle: x.description,
          path: `/novels/${x.id}`,
          kind: "Novel",
        })),
        ...ch.map((x) => ({
          title: x.title,
          subtitle: "Chapter",
          path: `/novels/${x.novelId}/${x.id}`,
          kind: "Chapter",
        })),
        ...p.map((x) => ({
          title: x.site,
          subtitle: x.username,
          path: "/passwords",
          kind: "Password",
        })),
        ...c.map((x) => ({
          title: x.title,
          subtitle: x.description || "",
          path: "/counters",
          kind: "Counter",
        })),
        ...h.map((x) => ({
          title: x.name,
          subtitle: x.active ? "Active" : "Disabled",
          path: "/habits",
          kind: "Habit",
        })),
      ]),
    );
  }, []);
  const hits = q.trim()
    ? data
        .filter((x) =>
          (x.title + " " + x.subtitle).toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 30)
    : [];
  return (
    <>
      <SearchBar
        autoFocus
        placeholder="Novels, chapters, sites…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q &&
        (!hits.length ? (
          <EmptyState
            icon="⌕"
            title="No matches"
            body="Try another word or title."
          />
        ) : (
          <div className="search-results">
            {hits.map((x, i) => (
              <button key={i} onClick={() => nav(x.path)}>
                <span>
                  <b>{x.title}</b>
                  <small>{x.subtitle}</small>
                </span>
                <em>{x.kind}</em>
              </button>
            ))}
          </div>
        ))}
    </>
  );
}
