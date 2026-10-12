import {
  BookOpen,
  WalletCards,
  ListChecks,
  Timer,
  KeyRound,
  ChevronRight,
  Search,
  Settings,
} from "lucide-react";
import { PageHeader, Card } from "../ui";
const tools = [
  [
    "Novels",
    "Write, organize, and keep every chapter.",
    "/novels",
    BookOpen,
    "peach",
  ],
  [
    "Finance",
    "Plan daily spending through the 28th.",
    "/finance",
    WalletCards,
    "mint",
  ],
  [
    "Habits",
    "Build streaks without losing history.",
    "/habits",
    ListChecks,
    "lavender",
  ],
  [
    "Counters",
    "Count up from milestones or down to moments.",
    "/counters",
    Timer,
    "blue",
  ],
  [
    "Passwords",
    "A private list stored only on this device.",
    "/passwords",
    KeyRound,
    "gold",
  ],
] as const;
export function Utilities({ nav, onSearch }: { nav: (p: string) => void; onSearch: () => void }) {
  return (
    <div className="page">
      <PageHeader title="More" subtitle="All your spaces and app options." />
      <div className="more-actions">
        <button onClick={onSearch}><Search /> Search everything</button>
        <button onClick={() => nav("/settings")}><Settings /> Settings</button>
      </div>
      <h2 className="section-title">Your spaces</h2>
      <div className="tool-list">
        {tools.map(([name, body, path, Icon, tone]) => (
          <Card
            className="tool"
            key={path}
            onClick={() => nav(path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && nav(path)}
          >
            <span className={`tool-icon ${tone}`}>
              <Icon />
            </span>
            <div>
              <h2>{name}</h2>
              <p>{body}</p>
            </div>
            <ChevronRight />
          </Card>
        ))}
      </div>
    </div>
  );
}
