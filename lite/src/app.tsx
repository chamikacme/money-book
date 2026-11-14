import { SignIn, useAuth, useClerk, useUser } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, ChartNoAxesCombined,
  AlertTriangle, Check, ChevronRight, CircleDollarSign, CircleUserRound, Clock3, CreditCard, Download, Home, LoaderCircle,
  LogOut, Moon, Pencil, Plus, Search, Settings2, ShieldCheck, Sun, Trash2, Wallet, X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router";
import { formatMoney } from "./lib/money";

const API_URL = import.meta.env.VITE_API_URL ?? "";
type Account = { id: number; name: string; type: string; balance: number; currency: string };
type Category = { id: number; name: string; type: "expense" | "revenue" };
type Entry = { entry: { accountId: number; type: string }; account?: Account | null };
type Transaction = { id: number; date: string; description: string; amount: number; kind?: string; category?: Category | null; entries?: Entry[] };
type Page<T> = { data: T[]; meta?: { totalCount: number; totalPages: number; page: number } };
type Dashboard = { data: { accounts: Account[]; monthlySpending: number; recentTransactions: Transaction[]; budgets: Array<{ category?: Category | null; spent: number; amount: number }> } };
type DashboardSettings = { currency?: string | null; showDefinedNetWorth?: boolean; definedNetWorthIncludes?: number[] };
type Shortcut = { id: number; name: string; description?: string | null; icon?: string | null; type: Draft["type"]; fromAccountId: number; toAccountId: number; categoryId?: number | null };
type Recurring = { id: number; description: string; amount: number; frequency: string; nextRunDate: string | number; active: boolean };
type Draft = { date: string; description: string; amount: string; categoryId: string; type: "withdrawal" | "deposit" | "transfer"; fromAccountId: string; toAccountId: string };
const today = () => new Date().toLocaleDateString("en-CA");
const blankDraft = (): Draft => ({ date: today(), description: "", amount: "", categoryId: "", type: "withdrawal", fromAccountId: "", toAccountId: "" });
type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: "light", toggleTheme: () => {} });

function useApi() {
  const { getToken } = useAuth();
  return async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = await getToken();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_URL}${path}`, { ...init, headers });
    if (response.status === 204) return undefined as T;
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error?.message ?? "Something went wrong. Please try again.");
    return body as T;
  };
}

function AuthGate() {
  const { theme } = useContext(ThemeContext);
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="auth-wait"><img className="auth-loading-logo" src="/android-chrome-512x512.png" alt="MoneyBook" /></div>;
  if (!isSignedIn) return <main className="sign-in">
    <section className="auth-brand-panel">
      <div className="auth-brand-top">
        <img className="lite-signin-logo" src="/logo-dark-horizontal.png" alt="MoneyBook" />
        <span className="auth-lite-tag">LITE</span>
      </div>
      <div className="auth-brand-content">
        <p className="auth-brand-kicker"><span /> SIMPLE, STEADY MONEY MANAGEMENT</p>
        <h1>Feel clear<br />about your <em>money.</em></h1>
        <p>Keep daily activity and account balances in view, without the extra weight.</p>
        <div className="auth-benefit"><ShieldCheck size={17} /><span>Your financial space, kept personal.</span></div>
      </div>
      <div className="auth-brand-footer"><span>BUILT FOR CLARITY</span><span>MoneyBook / Lite</span></div>
      <span className="auth-orbit auth-orbit-one" aria-hidden="true" />
      <span className="auth-orbit auth-orbit-two" aria-hidden="true" />
    </section>
    <section className="auth-form-panel">
      <div className="auth-form-note"><ShieldCheck size={15} /><span>Secure account access</span></div>
      <SignIn routing="hash" appearance={{
        variables: {
          colorPrimary: theme === "dark" ? "#a7bee0" : "#174c3c",
          colorBackground: theme === "dark" ? "#1c2530" : "#ffffff",
          borderRadius: "12px",
        },
        elements: {
          headerTitle: "lite-clerk-title",
          headerSubtitle: "lite-clerk-subtitle",
          formFieldLabel: "lite-clerk-label",
          formFieldInput: "lite-clerk-input",
          formButtonPrimary: "lite-clerk-primary",
          footerActionLink: "lite-clerk-link",
        },
      }} />
      <p className="auth-form-footnote">Your ledger is ready when you are.</p>
    </section>
  </main>;
  return <AppShell />;
}

function AppShell() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: ReturnType<typeof useLocation> } | null)?.backgroundLocation;
  const [showMore, setShowMore] = useState(false);
  const name = user?.firstName || "there";
  return <div className="app">
    <header className="topbar"><Link to="/" className="wordmark" aria-label="MoneyBook Lite home"><img className="lite-logo-light" src="/logo-light-horizontal.png" alt="MoneyBook" /><img className="lite-logo-dark" src="/logo-dark-horizontal.png" alt="" /><span className="wordmark-lite">Lite</span></Link><button className="avatar" aria-label="Open account menu" onClick={() => setShowMore(!showMore)}>{user?.imageUrl ? <img src={user.imageUrl} alt="" /> : <CircleUserRound size={22} />}</button></header>
    {showMore && <div className="account-menu"><span className="account-menu-name">{user?.fullName || user?.primaryEmailAddress?.emailAddress}</span><Link to="/settings" onClick={() => setShowMore(false)}><Settings2 size={16} /> Settings</Link><a href="https://moneybook.chamikacme.com"><ChartNoAxesCombined size={16} /> Full MoneyBook</a><button onClick={() => void signOut()}><LogOut size={16} /> Sign out</button></div>}
    <main className="main">
      <Routes location={backgroundLocation ?? location}>
        <Route path="/" element={<DashboardPage name={name} />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<DashboardPage name={name} />} />
      </Routes>
      {backgroundLocation && <Routes>
        <Route path="/transactions" element={<TransactionsPage modalOnly />} />
      </Routes>}
    </main>
    <nav className="bottom-nav" aria-label="Main navigation">
      <NavLink to="/" end><Home /><span>Home</span></NavLink>
      <NavLink to="/transactions"><Clock3 /><span>Activity</span></NavLink>
      <Link to="/transactions?add=withdrawal" state={{ backgroundLocation: location }} className="nav-add"><span><Plus /></span><span>Add</span></Link>
      <NavLink to="/accounts"><Wallet /><span>Accounts</span></NavLink>
      <NavLink to="/settings"><Settings2 /><span>More</span></NavLink>
    </nav>
  </div>;
}

function DashboardPage({ name }: { name: string }) {
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const openTransaction = (type: Draft["type"]) => navigate(`/transactions?add=${type}`, { state: { backgroundLocation: location } });
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/api/dashboard") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<{ data: DashboardSettings | null }>("/api/settings") });
  const reports = useQuery({ queryKey: ["lite-monthly-totals"], queryFn: () => api<{ data: Array<{ month: string; currency: string; income: number; expense: number }> }>("/api/reports/income-vs-expense") });
  const shortcuts = useQuery({ queryKey: ["shortcuts"], queryFn: () => api<{ data: Shortcut[] }>("/api/shortcuts") });
  const recurring = useQuery({ queryKey: ["recurring-lite"], queryFn: () => api<{ data: Recurring[] }>("/api/recurring-transactions?page=1&pageSize=100") });
  const [runningShortcut, setRunningShortcut] = useState<number | null>(null);
  const [shortcutPrompt, setShortcutPrompt] = useState<Shortcut | null>(null);
  const [shortcutAmount, setShortcutAmount] = useState("");
  const [shortcutAmountError, setShortcutAmountError] = useState("");
  const runShortcut = useMutation({
    mutationFn: ({ shortcut, amount }: { shortcut: Shortcut; amount: number }) => api(`/api/shortcuts/${shortcut.id}/execute`, { method: "POST", body: JSON.stringify({ amount }) }),
    onSuccess: async () => { setRunningShortcut(null); await Promise.all(["transactions", "accounts", "dashboard"].map((key) => client.invalidateQueries({ queryKey: [key] }))); },
    onError: () => setRunningShortcut(null),
  });
  const submitShortcut = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(shortcutAmount);
    if (!shortcutPrompt || !Number.isFinite(amount) || amount <= 0) {
      setShortcutAmountError("Enter an amount greater than zero.");
      return;
    }
    setShortcutAmountError("");
    setRunningShortcut(shortcutPrompt.id);
    runShortcut.mutate({ shortcut: shortcutPrompt, amount });
    setShortcutPrompt(null);
  };
  const data = query.data?.data;
  const currencies = [...new Set((data?.accounts ?? []).map((account) => account.currency))];
  const currency = (settings.data?.data?.currency && currencies.includes(settings.data.data.currency) ? settings.data.data.currency : currencies[0]) ?? settings.data?.data?.currency ?? "LKR";
  const showDefinedNetWorth = settings.data?.data?.showDefinedNetWorth === true;
  const definedNetWorthIncludes = new Set(settings.data?.data?.definedNetWorthIncludes ?? []);
  const netPositionAccounts = (data?.accounts ?? []).filter((account) =>
    account.currency === currency
    && (account.type === "asset" || account.type === "liability")
    && (!showDefinedNetWorth || definedNetWorthIncludes.has(account.id)),
  );
  const totals = useMemo(
    () => netPositionAccounts.reduce((sum, account) => sum + (account.type === "asset" ? account.balance : -account.balance), 0),
    [data?.accounts, currency, showDefinedNetWorth, settings.data?.data?.definedNetWorthIncludes],
  );
  const currentMonth = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "2-digit" });
  const monthTotals = reports.data?.data.find((row) => row.month === currentMonth && row.currency === currency);
  return <div className="page dashboard">
    <div className="greeting"><div><p className="eyebrow">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p><h1>Good day, {name}.</h1></div><button className="icon-button" aria-label="Search transactions" onClick={() => navigate("/transactions")}><Search size={19} /></button></div>
    <section className="balance-card">
      <div className="balance-top"><span>YOUR NET POSITION</span><span className="balance-dot"><i /> LIVE</span></div>
      {query.isPending ? <div className="balance-skeleton" /> : <strong className={showDefinedNetWorth ? "has-position-note" : undefined}>{showDefinedNetWorth && netPositionAccounts.length === 0 ? "—" : formatMoney(totals, currency)}</strong>}
      {showDefinedNetWorth && !query.isPending && <small className="balance-position-note">{netPositionAccounts.length ? `${netPositionAccounts.length} selected ${netPositionAccounts.length === 1 ? "account" : "accounts"} in ${currency}` : `No selected accounts in ${currency}`}</small>}
      <div className="balance-rule" />
      <div className="balance-foot"><span><small>In this month</small><b className="positive">{formatMoney(monthTotals?.income ?? 0, currency)}</b></span><span><small>Out this month</small><b className="negative">{formatMoney(monthTotals?.expense ?? 0, currency)}</b></span><button onClick={() => navigate("/accounts")} aria-label="View account balances"><ArrowRight size={17} /></button></div>
    </section>
    {currencies.length > 1 && <p className="currency-note">Net position and monthly totals show {currency} accounts only. No currency conversion is applied.</p>}
    <div className="quick-actions"><button onClick={() => openTransaction("withdrawal")}><span className="quick-icon quick-expense"><ArrowUpRight /></span><b>Spent</b></button><button onClick={() => openTransaction("deposit")}><span className="quick-icon quick-income"><ArrowDownLeft /></span><b>Income</b></button><button onClick={() => openTransaction("transfer")}><span className="quick-icon quick-transfer"><ArrowLeftRight /></span><b>Transfer</b></button></div>
     {!!shortcuts.data?.data.length && <section className="section"><div className="section-heading"><div><p className="eyebrow">MAKE IT QUICK</p><h2>Your shortcuts</h2></div><a href="https://moneybook.chamikacme.com/shortcuts" className="text-link">Manage <ChevronRight size={15} /></a></div><div className="shortcut-strip">{shortcuts.data.data.slice(0, 4).map((shortcut) => <button className="shortcut-chip" disabled={runShortcut.isPending} key={shortcut.id} onClick={() => { runShortcut.reset(); setShortcutAmount(""); setShortcutAmountError(""); setShortcutPrompt(shortcut); }}><span>{shortcut.icon || <ArrowRight size={15} />}</span><b>{runningShortcut === shortcut.id ? "Recording…" : shortcut.name}</b></button>)}</div>{runShortcut.isError && <ErrorBlock message={(runShortcut.error as Error).message} retry={() => runShortcut.reset()} />}</section>}
    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">YOUR MONEY</p><h2>Accounts</h2></div><Link to="/accounts" className="text-link">See all <ChevronRight size={15} /></Link></div>
      <div className="account-strip">{query.isPending ? <LoadingAccountTiles /> : (data?.accounts ?? []).slice(0, 5).map((account) => <AccountTile key={account.id} account={account} />)}{!query.isPending && !data?.accounts.length && <Empty text="Add an account in MoneyBook Web to get started." />}</div>
    </section>
    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">THE LATEST</p><h2>Recent activity</h2></div><Link to="/transactions" className="text-link">View all <ChevronRight size={15} /></Link></div>
      <div className="activity-card">{query.isPending ? <LoadingRows /> : (data?.recentTransactions ?? []).map((tx) => <TransactionRow key={tx.id} transaction={tx} currency={currency} />)}{query.isError && <ErrorBlock message={(query.error as Error).message} retry={() => void query.refetch()} />}{!query.isPending && !query.isError && !data?.recentTransactions.length && <Empty text="Your transactions will show up here." />}</div>
    </section>
    {recurring.data?.data.some((item) => item.active) && <section className="section"><div className="section-heading"><div><p className="eyebrow">COMING UP</p><h2>Scheduled</h2></div><a href="https://moneybook.chamikacme.com/recurring" className="text-link">Manage <ChevronRight size={15} /></a></div><div className="activity-card">{recurring.data.data.filter((item) => item.active).sort((a, b) => new Date(a.nextRunDate).getTime() - new Date(b.nextRunDate).getTime()).slice(0, 3).map((item) => <article className="scheduled-row" key={item.id}><span className="scheduled-icon"><Clock3 size={16} /></span><span><b>{item.description}</b><small>{item.frequency} · {new Date(item.nextRunDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span><strong>{formatMoney(item.amount, currency)}</strong></article>)}</div></section>}
     {shortcutPrompt && createPortal(<DialogFrame title={`Record ${shortcutPrompt.name}`} description={`Enter an amount for this ${shortcutPrompt.name} shortcut.`} icon={<CircleDollarSign size={20} />} onClose={() => setShortcutPrompt(null)}>
       <form className="action-dialog-form" onSubmit={submitShortcut} noValidate>
         <label className="dialog-field"><span>Amount · {currency}</span><input data-autofocus required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={shortcutAmount} onChange={(event) => { setShortcutAmount(event.target.value); setShortcutAmountError(""); }} /></label>
         {shortcutAmountError && <p className="dialog-error" role="alert">{shortcutAmountError}</p>}
         <div className="dialog-actions"><button type="button" className="dialog-button secondary" onClick={() => setShortcutPrompt(null)}>Cancel</button><button type="submit" className="dialog-button primary"><Check size={16} /> Record</button></div>
       </form>
     </DialogFrame>, document.body)}
   </div>;
}

function AccountTile({ account }: { account: Account }) {
  const Icon = account.type === "liability" ? CreditCard : Wallet;
  return <article className="account-tile"><span className={`account-icon type-${account.type}`}><Icon size={16} /></span><span className="account-name">{account.name}</span><strong>{formatMoney(account.balance, account.currency)}</strong><small>{account.type}</small></article>;
}

function TransactionRow({ transaction, currency }: { transaction: Transaction; currency: string }) {
  const income = transaction.category?.type === "revenue";
  const transfer = !transaction.category && transaction.entries?.length === 2 && transaction.entries.every((entry) => ["asset", "liability"].includes(entry.account?.type ?? ""));
  const date = new Date(transaction.date);
  return <article className="transaction-row"><span className={`transaction-icon ${income ? "is-income" : transfer ? "is-transfer" : ""}`}>{income ? <ArrowDownLeft size={17} /> : transfer ? <ArrowLeftRight size={16} /> : <ArrowUpRight size={17} />}</span><span className="transaction-summary"><b>{transaction.description}</b><small>{transaction.category?.name ?? (transfer ? "Transfer" : "Uncategorised")} · {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span><strong className={income ? "positive" : ""}>{income ? "+" : transfer ? "" : "−"}{formatMoney(transaction.amount, currency)}</strong></article>;
}

function TransactionsPage({ modalOnly = false }: { modalOnly?: boolean }) {
  const api = useApi();
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: ReturnType<typeof useLocation> } | null)?.backgroundLocation;
  const isBackgroundModal = modalOnly && Boolean(backgroundLocation);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const query = useQuery({ queryKey: ["transactions", page, search], queryFn: () => api<Page<Transaction>>(`/api/transactions?page=${page}&pageSize=20&sortBy=date&sortOrder=desc&search=${encodeURIComponent(search)}`) });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<{ data: { currency: string } | null }>("/api/settings") });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => api<Page<Account>>("/api/accounts?pageSize=100") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<{ data: Category[] }>("/api/categories") });
  const requestedType = searchParams.get("add");
  const isTransactionType = (value: string | null): value is Draft["type"] => value === "withdrawal" || value === "deposit" || value === "transfer";
  const [open, setOpen] = useState(() => isTransactionType(requestedType));
  const [draft, setDraft] = useState<Draft>(() => ({ ...blankDraft(), type: isTransactionType(requestedType) ? requestedType : "withdrawal" }));
  useEffect(() => {
    if (isTransactionType(requestedType)) {
      setDraft({ ...blankDraft(), type: requestedType });
      setOpen(true);
    }
  }, [requestedType]);
  const save = useMutation({
    mutationFn: () => api(`/api/transactions${editing ? `/${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", body: JSON.stringify({ ...draft, date: new Date(`${draft.date}T12:00:00`).toISOString(), amount: Number(draft.amount), categoryId: draft.categoryId ? Number(draft.categoryId) : null, fromAccountId: Number(draft.fromAccountId), toAccountId: draft.toAccountId ? Number(draft.toAccountId) : null }) }),
    onSuccess: async () => { setOpen(false); setEditing(null); if (isBackgroundModal && backgroundLocation) navigate(`${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`, { replace: true, state: backgroundLocation.state }); else setSearchParams({}); setDraft(blankDraft()); await Promise.all(["transactions", "accounts", "dashboard", "lite-monthly-totals"].map((key) => client.invalidateQueries({ queryKey: [key] }))); },
  });
  const remove = useMutation({ mutationFn: (id: number) => api(`/api/transactions/${id}`, { method: "DELETE" }), onSuccess: async () => { await Promise.all(["transactions", "accounts", "dashboard", "lite-monthly-totals"].map((key) => client.invalidateQueries({ queryKey: [key] }))); } });
  const currency = settings.data?.data?.currency ?? "LKR";
  const rows = query.data?.data ?? [];
  const accountRows = accounts.data?.data ?? [];
  const categoryRows = categories.data?.data ?? [];
  const fromOptions = accountRows.filter((a) => draft.type === "deposit" ? a.type === "revenue" : ["asset", "liability"].includes(a.type));
  const toOptions = accountRows.filter((a) => draft.type === "withdrawal" ? a.type === "expense" : draft.type === "deposit" ? a.type === "asset" : ["asset", "liability"].includes(a.type));
  const setType = (type: Draft["type"]) => setDraft((old) => ({ ...old, type, categoryId: "", fromAccountId: "", toAccountId: "" }));
  const startCreate = () => { setEditing(null); setDraft(blankDraft()); save.reset(); setOpen(true); };
  const startEdit = (transaction: Transaction) => {
    const credit = transaction.entries?.find((entry) => entry.entry.type === "credit");
    const debit = transaction.entries?.find((entry) => entry.entry.type === "debit");
    const type = debit?.account?.type === "expense" ? "withdrawal" : credit?.account?.type === "revenue" ? "deposit" : "transfer";
    setEditing(transaction);
    setDraft({ date: new Date(transaction.date).toLocaleDateString("en-CA"), description: transaction.description, amount: (transaction.amount / 100).toFixed(2), categoryId: transaction.category?.id ? String(transaction.category.id) : "", type, fromAccountId: String(credit?.entry.accountId ?? ""), toAccountId: String(debit?.entry.accountId ?? "") });
    save.reset();
    setOpen(true);
  };
  const closeSheet = () => { setOpen(false); setEditing(null); if (isBackgroundModal && backgroundLocation) navigate(`${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`, { replace: true, state: backgroundLocation.state }); else setSearchParams({}); };
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheet();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, searchParams, setSearchParams]);
  return <div className="page">
    {!modalOnly && <>
    <div className="page-title"><div><p className="eyebrow">YOUR LEDGER</p><h1>Activity</h1><p>Every little thing, accounted for.</p></div><button className="primary-button" onClick={startCreate}><Plus size={17} /> Add</button></div>
    <label className="search-box"><Search size={17} /><input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Find a transaction" /></label>
    <section className={`activity-card transaction-list${!query.isPending && rows.length === 1 ? " has-single-transaction" : ""}`}>{query.isPending ? <LoadingRows count={6} /> : rows.map((tx) => <div className="transaction-list-item" key={tx.id}><TransactionRow transaction={tx} currency={currency} />{tx.kind !== "opening_balance" && <div className="transaction-actions"><button className="transaction-icon-button" aria-label={`Edit ${tx.description}`} title="Edit" onClick={() => startEdit(tx)}><Pencil size={16} /></button><button className="transaction-icon-button delete-link" aria-label={`Delete ${tx.description}`} title="Delete" disabled={remove.isPending} onClick={() => { remove.reset(); setDeleteTarget(tx); }}><Trash2 size={16} /></button></div>}</div>)}{query.isError && <ErrorBlock message={(query.error as Error).message} retry={() => void query.refetch()} />}{remove.isError && <ErrorBlock message={(remove.error as Error).message} retry={() => remove.reset()} />}{!query.isPending && !query.isError && !rows.length && <Empty text={search ? "No matching transactions." : "Nothing recorded yet. Add your first transaction."} />}</section>
    {query.data?.meta && <div className="pagination"><span>{query.data.meta.totalCount} transactions · Page {page} of {Math.max(1, query.data.meta.totalPages)}</span><div><button disabled={page <= 1 || query.isFetching} onClick={() => setPage((current) => current - 1)}>Previous</button><button disabled={page >= query.data.meta.totalPages || query.isFetching} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>}
    </>}
    {open && createPortal(<div className="sheet-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) closeSheet(); }}><section className="transaction-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div className="sheet-handle" /><header className="sheet-heading"><div><p className="eyebrow">{editing ? "EDIT ENTRY" : "NEW ENTRY"}</p><h2 id="sheet-title">{editing ? "Edit transaction" : "Add transaction"}</h2></div><button className="icon-button" aria-label="Close" onClick={closeSheet}><X size={19} /></button></header>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="type-switch">{(["withdrawal", "deposit", "transfer"] as const).map((type) => <button type="button" key={type} className={draft.type === type ? "selected" : ""} onClick={() => setType(type)}>{type === "withdrawal" ? "Spent" : type === "deposit" ? "Income" : "Transfer"}</button>)}</div>
        <label className="amount-field"><span>AMOUNT</span><div><small>{currency}</small><input required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></div></label>
        <label className="form-field">Description<input required maxLength={240} placeholder={draft.type === "withdrawal" ? "What did you spend on?" : draft.type === "deposit" ? "Where did it come from?" : "What are you moving?"} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
        <div className="form-grid">
          <label className="form-field">{draft.type === "deposit" ? "From income" : "From account"}<select required value={draft.fromAccountId} onChange={(e) => setDraft({ ...draft, fromAccountId: e.target.value })}><option value="">Choose account</option>{fromOptions.map((a) => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label>
          <label className="form-field">{draft.type === "withdrawal" ? "To expense" : "To account"}<select required value={draft.toAccountId} onChange={(e) => setDraft({ ...draft, toAccountId: e.target.value })}><option value="">Choose account</option>{toOptions.map((a) => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label>
        </div>
        <div className="form-grid">
          <label className="form-field">Category<select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}><option value="">No category</option>{categoryRows.filter((c) => draft.type === "transfer" || c.type === (draft.type === "deposit" ? "revenue" : "expense")).map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
          <label className="form-field">Date<input required type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label>
        </div>
        <p className="form-hint">{draft.type === "withdrawal" ? "This records spending and updates the account balance." : draft.type === "deposit" ? "Income is credited to your chosen asset account." : "A transfer moves value between your own accounts."}</p>
        {save.isError && <p className="form-error" role="alert">{(save.error as Error).message}</p>}
        <button className="submit-button" disabled={save.isPending}>{save.isPending ? <><LoaderCircle className="spin" size={18} /> Saving…</> : <><Check size={18} /> {editing ? "Save changes" : "Save transaction"}</>}</button>
       </form>
     </section></div>, document.body)}
    {deleteTarget && createPortal(<DialogFrame title="Delete transaction?" description={`Delete “${deleteTarget.description}”? This will reverse its account balance effects.`} icon={<AlertTriangle size={20} />} onClose={() => { if (!remove.isPending) setDeleteTarget(null); }}>
      <div className="dialog-actions"><button type="button" className="dialog-button secondary" disabled={remove.isPending} data-autofocus onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="dialog-button destructive" disabled={remove.isPending} onClick={() => remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}>{remove.isPending ? <><LoaderCircle className="spin" size={16} /> Deleting…</> : <><Trash2 size={16} /> Delete transaction</>}</button></div>
      {remove.isError && <p className="dialog-error" role="alert">{(remove.error as Error).message}</p>}
    </DialogFrame>, document.body)}
   </div>;
}

function AccountsPage() {
  const api = useApi();
  const query = useQuery({ queryKey: ["accounts"], queryFn: () => api<Page<Account>>("/api/accounts?pageSize=100") });
  const currency = query.data?.data[0]?.currency ?? "LKR";
  const types = ["asset", "liability", "expense", "revenue"];
  return <div className="page"><div className="page-title"><div><p className="eyebrow">THE WHOLE PICTURE</p><h1>Accounts</h1><p>Your balances, in one place.</p></div><span className="title-icon"><Wallet /></span></div>{query.isPending ? <LoadingRows count={5} /> : <div className="account-groups">{types.map((type) => {
    const rows = query.data?.data.filter((account) => account.type === type) ?? [];
    if (!rows.length) return null;
    return <section className="section" key={type}><div className="section-heading"><div><p className="eyebrow">{type.toUpperCase()}</p><h2>{type === "asset" ? "What you own" : type === "liability" ? "What you owe" : type === "expense" ? "Spending categories" : "Income sources"}</h2></div></div><div className="activity-card">{rows.map((account) => <AccountTile key={account.id} account={account} />)}</div></section>;
  })}</div>}{query.isError && <ErrorBlock message={(query.error as Error).message} retry={() => void query.refetch()} />}<a className="web-link" href="https://moneybook.chamikacme.com">Manage accounts in MoneyBook Web <ArrowRight size={16} /></a><small className="currency-note">Displayed using your {currency} account currency.</small></div>;
}

function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installMessage, setInstallMessage] = useState("");
  const [installed, setInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches);
  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); setInstallMessage(""); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const installApp = async () => {
    if (!installPrompt) {
      setInstallMessage(installed
        ? "MoneyBook Lite is already installed on this device."
        : "To install, open your browser menu and choose “Install app” or “Add to Home Screen”.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallMessage(choice.outcome === "accepted" ? "MoneyBook Lite is being installed." : "Installation was cancelled.");
    setInstallPrompt(null);
  };
  return <div className="page"><div className="page-title"><div><p className="eyebrow">PREFERENCES</p><h1>More</h1><p>Everything else you might need.</p></div><span className="title-icon"><Settings2 /></span></div><section className="profile-card">{user?.imageUrl ? <img src={user.imageUrl} alt="" /> : <span className="profile-placeholder"><CircleUserRound /></span>}<div><b>{user?.fullName ?? "MoneyBook account"}</b><small>{user?.primaryEmailAddress?.emailAddress}</small></div></section><div className="settings-list"><button onClick={() => void installApp()}><span className="settings-leading"><Download /></span><span><b>{installed ? "MoneyBook Lite installed" : "Install MoneyBook Lite"}</b><small>{installed ? "Open it from your home screen" : "Add a shortcut to your home screen"}</small></span><ChevronRight /></button><button onClick={toggleTheme}><span className="settings-leading">{theme === "dark" ? <Sun /> : <Moon />}</span><span><b>{theme === "dark" ? "Light appearance" : "Dark appearance"}</b><small>{theme === "dark" ? "Switch to a brighter theme" : "Use a darker theme at night"}</small></span><ChevronRight /></button><a href="https://moneybook.chamikacme.com"><span className="settings-leading"><ChartNoAxesCombined /></span><span><b>Open full MoneyBook</b><small>Reports, goals, reconciliation and more</small></span><ChevronRight /></a><button onClick={() => void signOut()}><span className="settings-leading"><LogOut /></span><span><b>Sign out</b><small>Sign out of this account</small></span><ChevronRight /></button></div>{installMessage && <p className="install-message" role="status">{installMessage}</p>}<p className="version-note">MoneyBook Lite · Your ledger, made lighter.</p></div>;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function LoadingRows({ count = 3 }: { count?: number }) { return <div className="loading-rows">{Array.from({ length: count }, (_, i) => <div className="loading-row" key={i}><i /><span><i /><i /></span><i /></div>)}</div>; }
function LoadingAccountTiles() { return <>{Array.from({ length: 4 }, (_, i) => <div className="account-tile account-skeleton-tile" key={i} aria-hidden="true"><i /><span><i /><i /><i /></span></div>)}</>; }
function DialogFrame({ title, description, icon, children, onClose }: { title: string; description: string; icon: ReactNode; children: ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[href],[tabindex]:not([tabindex="-1"])') ?? []);
    (dialog?.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0] ?? dialog)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        dialog?.focus();
      } else if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" aria-describedby="action-dialog-description" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
      <header className="action-dialog-header"><span className="action-dialog-icon">{icon}</span><div><h2 id="action-dialog-title">{title}</h2><p id="action-dialog-description">{description}</p></div><button type="button" className="icon-button action-dialog-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></header>
      {children}
    </section>
  </div>;
}
function Empty({ text }: { text: string }) { return <div className="empty-state"><span><Wallet size={21} /></span><p>{text}</p></div>; }
function ErrorBlock({ message, retry }: { message: string; retry: () => void }) { return <div className="error-block"><p>{message}</p><button onClick={retry}>Try again</button></div>; }

export function App() {
  const [theme, setTheme] = useState<Theme>(() => window.localStorage.getItem("moneybook-lite-theme") === "dark" ? "dark" : "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#141c17" : "#f6f7f3");
    window.localStorage.setItem("moneybook-lite-theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");
  return <ThemeContext.Provider value={{ theme, toggleTheme }}><AuthGate /></ThemeContext.Provider>;
}
