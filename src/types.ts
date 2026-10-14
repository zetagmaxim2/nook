export type Id = string;
export interface Novel {
  id: Id;
  title: string;
  description: string;
  cover?: string;
  createdAt: string;
  updatedAt: string;
}
export interface Chapter {
  id: Id;
  novelId: Id;
  title: string;
  content: string;
  wordCount: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}
export interface FinanceEntry {
  id: Id;
  date: string;
  amount: number;
  dailyTarget: number;
  periodStart: string;
  periodEnd: string;
  completed: boolean;
  loggedAt?: string;
}
export interface FinancePlan {
  id: Id;
  month: string;
  amount: number;
  includeToday: boolean;
  periodStart?: string;
  periodEnd?: string;
  dailyTarget?: number;
  createdAt: string;
}
export interface Habit {
  id: Id;
  name: string;
  icon: string;
  createdAt: string;
  active: boolean;
}
export interface HabitCompletion {
  id: Id;
  habitId: Id;
  date: string;
  completed: boolean;
}
export interface Counter {
  id: Id;
  type: "up" | "down";
  title: string;
  date: string;
  time?: string;
  description?: string;
  icon: string;
  color: string;
  pinned?: boolean;
  createdAt: string;
}
export interface PasswordEntry {
  id: Id;
  site: string;
  username: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}
export interface ContactRelative {
  id: Id;
  name: string;
  relation: string;
  contactId?: Id;
}
export interface Contact {
  id: Id;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  birthday?: string; // MM-DD; birth year is optional
  birthYear?: number;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  otherSocial?: string;
  notes?: string;
  relatives: ContactRelative[];
  createdAt: string;
  updatedAt: string;
}
export type WidgetType = "finance" | "habits" | "counters" | "novels";
export interface DashboardWidget {
  id: Id;
  type: WidgetType;
  order: number;
  visible: boolean;
  configuration?: Record<string, unknown>;
}
export interface Setting {
  key: string;
  value: unknown;
}
export type StoreName =
  | "novels"
  | "chapters"
  | "financeEntries"
  | "financePlans"
  | "habits"
  | "habitCompletions"
  | "counters"
  | "passwords"
  | "contacts"
  | "widgets"
  | "settings";
