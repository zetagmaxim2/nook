import {
  BookOpen,
  WalletCards,
  ListChecks,
  Timer,
  KeyRound,
  ChevronRight,
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
export function Utilities({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="page">
      <PageHeader title="Utilities" subtitle="Everything in its place." />
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
