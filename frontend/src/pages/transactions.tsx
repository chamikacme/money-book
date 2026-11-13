import { askToConfirm } from "../components/ui/app-dialog";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, CalendarDays, FilterX, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetTrigger } from "../components/ui/sheet-form";
import { PageFrame } from "../components/page-frame";
import { useApi } from "../lib/use-api";
import { DEFAULT_CURRENCY, PageAction } from "../components/workspace-ui";

type Account = { id: number; name: string; currency: string; type?: string };
type Category = { id: number; name: string; type: "expense" | "revenue" };
type Transaction = { id: number; date: string; description: string; amount: number; kind?: string; category?: Category | null; entries?: Array<{ entry: { accountId: number; type: string }; account?: Account | null }> };
type PageData<T> = { data: T[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } };
type Filters = { search: string; startDate: string; endDate: string; accountId: string; categoryId: string; categoryType: string; sortBy: string; sortOrder: string };
type Draft = { date: string; description: string; amount: string; categoryId: string; type: string; fromAccountId: string; toAccountId: string };
const emptyDraft = (): Draft => ({ date: new Date().toLocaleDateString("en-CA"), description: "", amount: "", categoryId: "", type: "withdrawal", fromAccountId: "", toAccountId: "" });
const initialFilters: Filters = { search: "", startDate: "", endDate: "", accountId: "", categoryId: "", categoryType: "", sortBy: "date", sortOrder: "desc" };
const money = (cents: number, currency = DEFAULT_CURRENCY) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
const localDate = (date: string) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function TransactionsPage() {
  const api = useApi(); const queryClient = useQueryClient();
  const [filters, setFilters] = useState(initialFilters); const [page, setPage] = useState(1); const [showFilters, setShowFilters] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false); const [editing, setEditing] = useState<Transaction | null>(null); const [draft, setDraft] = useState<Draft>(emptyDraft());
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => api<PageData<Account>>("/api/accounts?pageSize=100") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<{ data: Category[] }>("/api/categories") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<{ data: { currency: string } | null }>("/api/settings") });
  const params = new URLSearchParams({ page: String(page), pageSize: "15", sortBy: filters.sortBy, sortOrder: filters.sortOrder });
  for (const key of ["search", "startDate", "endDate", "accountId", "categoryId", "categoryType"] as const) if (filters[key]) {
    const value = key === "startDate" ? new Date(`${filters[key]}T00:00:00`).toISOString() : key === "endDate" ? new Date(`${filters[key]}T23:59:59.999`).toISOString() : filters[key];
    params.set(key, value);
  }
  const transactions = useQuery({ queryKey: ["transactions", page, filters], queryFn: () => api<PageData<Transaction>>(`/api/transactions?${params.toString()}`) });
  const save = useMutation({ mutationFn: () => api(`/api/transactions${editing ? `/${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", body: JSON.stringify({ ...draft, date: new Date(`${draft.date}T12:00:00`).toISOString(), amount: Number(draft.amount), categoryId: draft.categoryId ? Number(draft.categoryId) : null, fromAccountId: Number(draft.fromAccountId), toAccountId: draft.toAccountId ? Number(draft.toAccountId) : null }) }), onSuccess: () => { setSheetOpen(false); setEditing(null); setDraft(emptyDraft()); void queryClient.invalidateQueries({ queryKey: ["transactions"] }); void queryClient.invalidateQueries({ queryKey: ["accounts"] }); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } });
  const remove = useMutation({ mutationFn: (id: number) => api(`/api/transactions/${id}`, { method: "DELETE" }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["transactions"] }); void queryClient.invalidateQueries({ queryKey: ["accounts"] }); } });
  const setFilter = (key: keyof Filters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); };
  const clearFilters = () => { setPage(1); setFilters(initialFilters); };
  const activeFilterCount = [filters.startDate, filters.endDate, filters.accountId, filters.categoryId, filters.categoryType].filter(Boolean).length;
  const startCreate = () => { setEditing(null); setDraft(emptyDraft()); save.reset(); setSheetOpen(true); };
  const startEdit = (row: Transaction) => {
    const credit = row.entries?.find((entry) => entry.entry.type === "credit"); const debit = row.entries?.find((entry) => entry.entry.type === "debit");
    const type = debit?.account?.type === "expense" ? "withdrawal" : credit?.account?.type === "revenue" ? "deposit" : "transfer";
    setEditing(row); setDraft({ date: new Date(row.date).toLocaleDateString("en-CA"), description: row.description, amount: (row.amount / 100).toFixed(2), categoryId: row.category?.id ? String(row.category.id) : "", type, fromAccountId: String(credit?.entry.accountId ?? ""), toAccountId: String(debit?.entry.accountId ?? "") }); save.reset(); setSheetOpen(true);
  };
  const currency = settings.data?.data?.currency ?? DEFAULT_CURRENCY;
  const toggleSort = (sortBy: string) => setFilters((current) => ({ ...current, sortBy, sortOrder: current.sortBy === sortBy && current.sortOrder === "desc" ? "asc" : "desc" }));
  const updateDraft = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return <>
    <PageFrame title="Transactions" description="Every movement, organized and easy to find."><PageAction label="Add transaction" onClick={startCreate} icon={Plus} /></PageFrame>
    <section className="surface-card transaction-workspace">
      <div className="transaction-toolbar"><div><span className="section-kicker">LEDGER</span><h2>All transactions</h2><p>{transactions.data?.meta.totalCount ?? 0} records in your ledger</p></div><div className="transaction-toolbar-actions"><label className="transaction-search"><Search size={16} /><input aria-label="Search descriptions" placeholder="Search descriptions" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} /></label><Button type="button" variant="outline" className={`filter-toggle${showFilters ? " is-open" : ""}`} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} /> Filters{activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}</Button></div></div>
      {showFilters && <div className="transaction-filters"><label>From date<Input type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={(event) => setFilter("startDate", event.target.value)} /></label><label>To date<Input type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={(event) => setFilter("endDate", event.target.value)} /></label><label>Account<select value={filters.accountId} onChange={(event) => setFilter("accountId", event.target.value)}><option value="">All accounts</option>{accounts.data?.data.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Category<select value={filters.categoryId} onChange={(event) => setFilter("categoryId", event.target.value)}><option value="">All categories</option>{categories.data?.data.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Category type<select value={filters.categoryType} onChange={(event) => setFilter("categoryType", event.target.value)}><option value="">All category types</option><option value="expense">Expense</option><option value="revenue">Income</option><option value="uncategorized">No category</option></select></label><button className="clear-filters" onClick={clearFilters} disabled={!activeFilterCount && !filters.search}><FilterX size={14} /> Clear filters</button></div>}
      {transactions.isError && <div className="table-error" role="alert">{transactions.error.message}<button onClick={() => void transactions.refetch()}>Retry</button></div>}
      <div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th><button className="sort-button" onClick={() => toggleSort("date")}>Date{filters.sortBy === "date" && (filters.sortOrder === "desc" ? <ArrowDownWideNarrow size={13} /> : <ArrowUpWideNarrow size={13} />)}</button></th><th>Description</th><th>Category</th><th>Accounts</th><th><button className="sort-button" onClick={() => toggleSort("amount")}>Amount{filters.sortBy === "amount" && (filters.sortOrder === "desc" ? <ArrowDownWideNarrow size={13} /> : <ArrowUpWideNarrow size={13} />)}</button></th><th aria-label="Actions" /></tr></thead><tbody>
        {transactions.isPending && <tr><td colSpan={6} className="table-placeholder">Loading transactions…</td></tr>}
        {!transactions.isPending && transactions.data?.data.map((row) => { const fromEntry = row.entries?.find((entry) => entry.entry.type === "credit"); const toEntry = row.entries?.find((entry) => entry.entry.type === "debit"); const from = fromEntry?.account?.name; const to = toEntry?.account?.name; const income = row.category?.type === "revenue"; const expense = row.category?.type === "expense"; const opening = row.kind === "opening_balance"; return <tr key={row.id}><td>{localDate(row.date)}</td><td className="transaction-description-cell">{row.description}</td><td><span className="category-label">{opening ? "Opening balance" : row.category?.name ?? "Uncategorized"}</span></td><td className="account-transfer-cell">{from ?? "—"}<span>→</span>{to ?? "—"}</td><td className={`amount-cell ${income ? "amount-in" : expense ? "amount-out" : ""}`}>{money(row.amount, currency)}</td><td><div className="table-row-actions">{opening ? <span>Account setting</span> : <><button onClick={() => startEdit(row)}>Edit</button><button className="delete-action" onClick={() => void askToConfirm({ title: "Delete this transaction? This will reverse its account balance effects.", description: "This action cannot be undone.", confirmLabel: "Delete", danger: true }).then((confirmed) => { if (confirmed) remove.mutate(row.id) })}>Delete</button></>}</div></td></tr>; })}
        {!transactions.isPending && !transactions.isError && transactions.data?.data.length === 0 && <tr><td colSpan={6} className="table-placeholder"><span className="empty-table-icon"><CalendarDays size={20} /></span><strong>No transactions match these filters</strong><span>Try a different search or clear the filters.</span></td></tr>}
      </tbody></table></div>
      {transactions.data?.meta && <div className="table-pagination"><span>Showing {transactions.data.meta.totalCount === 0 ? 0 : (page - 1) * transactions.data.meta.pageSize + 1}–{Math.min(page * transactions.data.meta.pageSize, transactions.data.meta.totalCount)} of {transactions.data.meta.totalCount}</span><div><button className="button-secondary" disabled={page <= 1 || transactions.isPending} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, transactions.data.meta.totalPages)}</span><button className="button-secondary" disabled={page >= transactions.data.meta.totalPages || transactions.isPending} onClick={() => setPage(page + 1)}>Next</button></div></div>}
    </section>

    <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title={editing ? "Edit transaction" : "Add transaction"} description="Enter the details below, then save to update your ledger.">
      <form className="transaction-form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <label>Description<Input required maxLength={240} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} /></label>
        <label>Amount<Input required type="number" min="0.01" step="0.01" value={draft.amount} onChange={(event) => updateDraft("amount", event.target.value)} /></label>
        <label>Date<Input required type="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} /></label>
        <label>Type<select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value, fromAccountId: "", toAccountId: "", categoryId: "" }))}><option value="withdrawal">Expense / withdrawal</option><option value="deposit">Income / deposit</option><option value="transfer">Transfer</option></select></label>
        <label>From account<select required value={draft.fromAccountId} onChange={(event) => updateDraft("fromAccountId", event.target.value)}><option value="">Select account</option>{accounts.data?.data.filter((account) => draft.type === "withdrawal" ? account.type === "asset" || account.type === "liability" : draft.type === "deposit" ? account.type === "revenue" : account.type === "asset" || account.type === "liability").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label>To account<select required value={draft.toAccountId} onChange={(event) => updateDraft("toAccountId", event.target.value)}><option value="">Select account</option>{accounts.data?.data.filter((account) => draft.type === "withdrawal" ? account.type === "expense" : ["asset", "liability"].includes(account.type ?? "")).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label>Category<select value={draft.categoryId} onChange={(event) => updateDraft("categoryId", event.target.value)}><option value="">None</option>{categories.data?.data.filter((category) => draft.type === "withdrawal" ? category.type === "expense" : draft.type === "deposit" ? category.type === "revenue" : true).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        {save.isError && <p className="form-error" role="alert">{save.error.message}</p>}
        <button className="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : editing ? "Save changes" : "Add transaction"}</button>
      </form>
    </Sheet>
  </>;
}
