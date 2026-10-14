import type { Contact } from "./types";

export function nextBirthday(contact: Contact, today = new Date()) {
  if (!contact.birthday || !/^\d{2}-\d{2}$/.test(contact.birthday)) return null;
  const [month, day] = contact.birthday.split("-").map(Number);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let year = start.getFullYear(); year <= start.getFullYear() + 4; year++) {
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day || date < start) continue;
    const days = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
    return { date, days, age: contact.birthYear ? year - contact.birthYear : undefined };
  }
  return null;
}

export function birthdayLabel(contact: Contact) {
  if (!contact.birthday) return "";
  const [month, day] = contact.birthday.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(new Date(2024, month - 1, day)) + (contact.birthYear ? `, ${contact.birthYear}` : "");
}
