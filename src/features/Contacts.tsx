import { useEffect, useState } from "react";
import { Cake, ChevronRight, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { all, put, remove } from "../db";
import type { Contact, ContactRelative } from "../types";
import { id, now } from "../utils";
import { birthdayLabel, nextBirthday } from "../contacts";
import { Button, Card, Confirm, EmptyState, ErrorNote, Field, PageHeader, SearchBar, TextArea, TextInput } from "../ui";

type Props = { nav: (path: string) => void; contactId?: string; version: number; refresh: () => void; notify: (message: string) => void };
const blank = (): Contact => ({ id: id(), name: "", relatives: [], createdAt: now(), updatedAt: now() });
const optional = ["phone", "email", "address", "instagram", "tiktok", "facebook", "otherSocial", "notes"] as const;
type Optional = typeof optional[number];
const labels: Record<Optional, string> = { phone: "Phone", email: "Email", address: "Address", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", otherSocial: "Other social", notes: "Notes" };
const placeholders: Record<Optional, string> = { phone: "+1 555 123 4567", email: "name@example.com", address: "Street, city…", instagram: "Username", tiktok: "Username", facebook: "Profile name or link", otherSocial: "Profile or link", notes: "Anything worth remembering" };
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
const socialLink = (field: Optional, value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "").trim();
  if (field === "instagram") return `https://instagram.com/${encodeURIComponent(handle)}`;
  if (field === "tiktok") return `https://tiktok.com/@${encodeURIComponent(handle)}`;
  if (field === "facebook") return `https://facebook.com/${encodeURIComponent(handle)}`;
  return undefined;
};

export default function Contacts({ nav, contactId, version, refresh, notify }: Props) {
  const [people, setPeople] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Contact | null>(null);
  const [visible, setVisible] = useState<Optional[]>([]);
  const [relative, setRelative] = useState({ name: "", relation: "", contactId: "" });
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { all<Contact>("contacts").then(setPeople).catch((e) => setError(e.message)); }, [version]);
  const selected = people.find((p) => p.id === contactId);
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = sorted.filter((p) => [p.name, p.phone, p.email, ...(p.relatives || []).map((r) => r.name)].join(" ").toLowerCase().includes(query.toLowerCase()));
  const startEdit = (person?: Contact) => {
    const value = person ? { ...person, relatives: [...(person.relatives || [])] } : blank();
    setDraft(value);
    setVisible(optional.filter((key) => !!value[key]));
    setRelative({ name: "", relation: "", contactId: "" });
    setError("");
  };
  const update = (key: Optional, value: string) => setDraft((current) => current && ({ ...current, [key]: value }));
  const addRelative = () => {
    if (!draft || !relative.relation.trim() || !(relative.contactId || relative.name.trim())) return;
    const linked = people.find((p) => p.id === relative.contactId);
    const item: ContactRelative = { id: id(), name: linked?.name || relative.name.trim(), relation: relative.relation.trim(), ...(linked ? { contactId: linked.id } : {}) };
    setDraft({ ...draft, relatives: [...draft.relatives, item] });
    setRelative({ name: "", relation: "", contactId: "" });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft?.name.trim()) { setError("Add a name first."); return; }
    const birthday = draft.birthday;
    if (birthday) {
      const [m, d] = birthday.split("-").map(Number);
      const date = new Date(2024, m - 1, d);
      if (date.getMonth() !== m - 1 || date.getDate() !== d) { setError("Choose a valid birthday."); return; }
    }
    if (draft.birthYear && (draft.birthYear < 1800 || draft.birthYear > new Date().getFullYear())) { setError("Choose a valid birth year."); return; }
    try {
      const cleaned = { ...draft, name: draft.name.trim(), updatedAt: now() };
      for (const key of optional) {
        const value = cleaned[key]?.trim();
        if (value) cleaned[key] = value;
        else delete cleaned[key];
      }
      await put("contacts", cleaned);
      setPeople((current) => [...current.filter((p) => p.id !== cleaned.id), cleaned]);
      setDraft(null);
      refresh();
      nav(`/contacts/${cleaned.id}`);
      notify("Person saved");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save person."); }
  };
  const createRelativeCard = async (person: Contact, item: ContactRelative) => {
    const contact = { ...blank(), name: item.name };
    try {
      await put("contacts", contact);
      const updated = { ...person, relatives: person.relatives.map((r) => r.id === item.id ? { ...r, contactId: contact.id } : r), updatedAt: now() };
      await put("contacts", updated);
      setPeople((current) => [...current.filter((p) => p.id !== person.id), updated, contact]);
      refresh();
      nav(`/contacts/${contact.id}`);
      startEdit(contact);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create profile."); }
  };
  const destroy = async () => {
    if (!deleteContact) return;
    try {
      await remove("contacts", deleteContact.id);
      setPeople((current) => current.filter((p) => p.id !== deleteContact.id));
      setDeleteContact(null);
      nav("/contacts");
      refresh();
      notify("Person deleted");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete person."); }
  };

  if (draft) return <div className="page contacts-page">
    <PageHeader title={people.some((p) => p.id === draft.id) ? "Edit person" : "New person"} back={() => setDraft(null)} />
    <form onSubmit={save} className="contact-form">
      <ErrorNote>{error}</ErrorNote>
      <Field label="Name"><TextInput autoFocus required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Their name" /></Field>
      <div className="contact-form-heading"><h2>Details</h2><span>Add only what you know</span></div>
      {visible.map((key) => <div className="contact-edit-field" key={key}>
        <Field label={labels[key]}>{key === "notes" ? <TextArea value={draft[key] || ""} onChange={(e) => update(key, e.target.value)} placeholder={placeholders[key]} /> : <TextInput type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} autoComplete={key === "phone" ? "tel" : key === "email" ? "email" : "off"} value={draft[key] || ""} onChange={(e) => update(key, e.target.value)} placeholder={placeholders[key]} />}</Field>
        <button type="button" className="contact-remove-field" onClick={() => { update(key, ""); setVisible(visible.filter((item) => item !== key)); }} aria-label={`Remove ${labels[key]}`}><Trash2 size={17} /></button>
      </div>)}
      {optional.some((key) => !visible.includes(key)) && <select className="input contact-add-field" value="" aria-label="Add a detail" onChange={(e) => setVisible([...visible, e.target.value as Optional])}><option value="">+ Add a detail</option>{optional.filter((key) => !visible.includes(key)).map((key) => <option key={key} value={key}>{labels[key]}</option>)}</select>}
      <div className="contact-form-heading"><h2>Birthday</h2><span>Year is optional</span></div>
      <div className="contact-birthday-fields">
        <Field label="Month"><select className="input" value={draft.birthday?.slice(0, 2) || ""} onChange={(e) => setDraft({ ...draft, birthday: e.target.value ? `${e.target.value}-${draft.birthday?.slice(3) || ""}` : undefined })}><option value="">Month</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2024, i, 1))}</option>)}</select></Field>
        <Field label="Day"><select className="input" disabled={!draft.birthday?.slice(0, 2)} value={draft.birthday?.slice(3) || ""} onChange={(e) => setDraft({ ...draft, birthday: `${draft.birthday?.slice(0, 2)}-${e.target.value}` })}><option value="">Day</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>)}</select></Field>
        <Field label="Year"><TextInput inputMode="numeric" type="number" min="1800" max={new Date().getFullYear()} placeholder="Optional" value={draft.birthYear || ""} onChange={(e) => setDraft({ ...draft, birthYear: e.target.value ? Number(e.target.value) : undefined })} /></Field>
      </div>
      <div className="contact-form-heading"><h2>Family & relatives</h2><span>Link a person or save a name</span></div>
      {draft.relatives.map((r) => <div className="contact-relative-edit" key={r.id}><span><b>{r.name}</b><small>{r.relation}{r.contactId ? " · linked profile" : ""}</small></span><button type="button" aria-label={`Remove ${r.name}`} onClick={() => setDraft({ ...draft, relatives: draft.relatives.filter((item) => item.id !== r.id) })}><Trash2 size={17} /></button></div>)}
      <div className="contact-relative-inputs">
        <TextInput aria-label="Relationship" placeholder="Relationship (e.g. sister)" value={relative.relation} onChange={(e) => setRelative({ ...relative, relation: e.target.value })} />
        <select className="input" aria-label="Link existing person" value={relative.contactId} onChange={(e) => setRelative({ ...relative, contactId: e.target.value, name: "" })}><option value="">New name or choose a person</option>{sorted.filter((p) => p.id !== draft.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        {!relative.contactId && <TextInput aria-label="Relative name" placeholder="Relative’s name" value={relative.name} onChange={(e) => setRelative({ ...relative, name: e.target.value })} />}
        <Button type="button" kind="secondary" disabled={!relative.relation.trim() || !(relative.contactId || relative.name.trim())} onClick={addRelative}><Plus size={17} /> Add relative</Button>
      </div>
      <div className="contact-form-actions"><Button type="button" kind="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button type="submit">Save person</Button></div>
    </form>
  </div>;

  if (contactId && selected) {
    const birthday = nextBirthday(selected);
    const listedBy = people.filter((person) => person.id !== selected.id && person.relatives?.some((r) => r.contactId === selected.id));
    return <div className="page contacts-page">
      <PageHeader title="Person" back={() => nav("/contacts")} action={<Button kind="secondary" onClick={() => startEdit(selected)}><Pencil size={17} /> Edit</Button>} />
      <ErrorNote>{error}</ErrorNote>
      <div className="contact-identity"><span className="contact-avatar large">{initials(selected.name)}</span><h2>{selected.name}</h2>{selected.birthday && <p><Cake size={17} /> {birthdayLabel(selected)}{birthday && birthday.days <= 30 ? ` · ${birthday.days === 0 ? "Today!" : `in ${birthday.days} days`}` : ""}</p>}</div>
      {(["phone", "email", "address"] as Optional[]).some((key) => selected[key]) && <section className="contact-section"><h3>Reach out</h3><Card className="contact-detail-list">{(["phone", "email", "address"] as Optional[]).filter((key) => selected[key]).map((key) => <div className="contact-detail-row" key={key}><span>{labels[key]}</span>{key === "phone" ? <a href={`tel:${selected.phone}`}>{selected.phone}</a> : key === "email" ? <a href={`mailto:${selected.email}`}>{selected.email}</a> : <p>{selected.address}</p>}</div>)}</Card></section>}
      {(["instagram", "tiktok", "facebook", "otherSocial"] as Optional[]).some((key) => selected[key]) && <section className="contact-section"><h3>Socials</h3><Card className="contact-detail-list">{(["instagram", "tiktok", "facebook", "otherSocial"] as Optional[]).filter((key) => selected[key]).map((key) => { const value = selected[key]!; const href = socialLink(key, value); return <div className="contact-detail-row" key={key}><span>{labels[key]}</span>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{value} ↗</a> : <p>{value}</p>}</div>; })}</Card></section>}
      {!!selected.relatives?.length && <section className="contact-section"><h3>Family & relatives</h3><Card className="contact-detail-list">{selected.relatives.map((r) => <div className="contact-relative-row" key={r.id}><span className="contact-avatar small">{initials(r.name)}</span><span><b>{people.find((p) => p.id === r.contactId)?.name || r.name}</b><small>{r.relation}</small></span>{r.contactId && people.some((p) => p.id === r.contactId) ? <button aria-label={`View ${r.name}`} onClick={() => nav(`/contacts/${r.contactId}`)}><ChevronRight size={19} /></button> : <button className="text-link" onClick={() => createRelativeCard(selected, r)}>Create card</button>}</div>)}</Card></section>}
      {!!listedBy.length && <section className="contact-section"><h3>Also connected to</h3><Card className="contact-detail-list">{listedBy.map((person) => <div className="contact-relative-row" key={person.id}><span className="contact-avatar small">{initials(person.name)}</span><span><b>{person.name}</b><small>Saved on their card</small></span><button aria-label={`View ${person.name}`} onClick={() => nav(`/contacts/${person.id}`)}><ChevronRight size={19} /></button></div>)}</Card></section>}
      {selected.notes && <section className="contact-section"><h3>Notes</h3><Card><p className="contact-notes">{selected.notes}</p></Card></section>}
      <button className="contact-delete" onClick={() => setDeleteContact(selected)}><Trash2 size={17} /> Delete person</button>
      <Confirm open={!!deleteContact} title="Delete this person?" body="Their card will be removed. Other people's cards and their saved relative names stay." confirm="Delete person" danger onClose={() => setDeleteContact(null)} onConfirm={destroy} />
    </div>;
  }

  return <div className="page contacts-page">
    <PageHeader title="People" subtitle="The little details that matter." action={<Button onClick={() => startEdit()}><Plus size={18} /> Add</Button>} />
    <ErrorNote>{error}</ErrorNote>
    {people.length ? <><SearchBar placeholder="Find a person" value={query} onChange={(e) => setQuery(e.target.value)} /><div className="contact-list">{filtered.map((person) => { const birthday = nextBirthday(person); return <button className="contact-list-card" key={person.id} onClick={() => nav(`/contacts/${person.id}`)}><span className="contact-avatar">{initials(person.name)}</span><span className="contact-list-copy"><b>{person.name}</b><small>{birthday && birthday.days <= 30 ? `🎂 ${birthday.days === 0 ? "Birthday today" : `Birthday in ${birthday.days} days`}` : person.phone || person.email || (person.relatives?.length ? `${person.relatives.length} relatives` : "View card")}</small></span><ChevronRight size={19} /></button>; })}{!filtered.length && <p className="muted contact-no-results">No people match that search.</p>}</div></> : <EmptyState icon="♡" title="Your people, all in one place" body="Save the details you want to remember. Add only the fields you know." action={<Button onClick={() => startEdit()}><UserRound size={18} /> Add a person</Button>} />}
  </div>;
}
