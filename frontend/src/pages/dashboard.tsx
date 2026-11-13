import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronRight, CircleHelp, Plus, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router";
import { useApi } from "../lib/use-api";
import { DashboardSkeleton } from "../components/ui/loading-skeleton";
import { DEFAULT_CURRENCY } from "../components/workspace-ui";

type Account = { id: number; name: string; balance: number; currency: string; type: string; isPinned?: boolean };
type Transaction = { id: number; date: string; description: string; amount: number; category?: { name: string; type?: string | null } | null; entries?: Array<{ account?: { currency?: string } | null }> };
type DashboardResponse = { data: { accounts: Account[]; monthlySpending: number; recentTransactions: Transaction[]; budgets: Budget[] } };
type ReportResponse = { data: Array<{ month: string; currency: string; income: number; expense: number }> };
type Budget = { id: number; amount: number; spent: number; progress: number; category?: { name: string } | null };
type Settings = { currency: string; showNetWorth: boolean; showMonthlySpending: boolean; showDefinedNetWorth: boolean; definedNetWorthIncludes: number[] };
const formatMoney = (cents: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);

export function DashboardPage() {
  const api = useApi();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => api<DashboardResponse>("/api/dashboard") });
  const reports = useQuery({ queryKey: ["report", "income"], queryFn: () => api<ReportResponse>("/api/reports/income-vs-expense") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<{ data: Settings | null }>("/api/settings") });
  if (dashboard.isPending) return <DashboardSkeleton />;
  if (dashboard.isError) return <section className="error-panel"><CircleHelp size={20} /><div><strong>We couldn’t load your overview</strong><p>{dashboard.error.message}</p><button className="button-secondary" onClick={() => void dashboard.refetch()}>Try again</button></div></section>;

  const { accounts } = dashboard.data.data;
  const recentTransactions = dashboard.data.data.recentTransactions;
  const budgets = dashboard.data.data.budgets;
  const currencies = [...new Set(accounts.map((account) => account.currency))];
  const preferences = settings.data?.data;
  const preferredCurrency = preferences?.currency;
  const showNetWorth = preferences?.showNetWorth !== false;
  const showMonthlySpending = preferences?.showMonthlySpending !== false;
  const definedNetWorthIncludes = new Set(preferences?.definedNetWorthIncludes ?? []);
  const currency = currencies.length === 1 ? currencies[0] : (preferredCurrency && currencies.includes(preferredCurrency) ? preferredCurrency : currencies[0]) ?? preferredCurrency ?? DEFAULT_CURRENCY;
  const compatibleAccounts = accounts.filter((account) => account.currency === currency);
  const netPositionAccounts = compatibleAccounts.filter((account) => (account.type === "asset" || account.type === "liability") && (!preferences?.showDefinedNetWorth || definedNetWorthIncludes.has(account.id)));
  const assets = netPositionAccounts.filter((account) => account.type === "asset").reduce((total, account) => total + account.balance, 0);
  const liabilities = netPositionAccounts.filter((account) => account.type === "liability").reduce((total, account) => total + account.balance, 0);
  const netPosition = assets - liabilities;
  const monthly = (reports.data?.data ?? []).filter((row) => row.currency === currency);
  const currentMonthFlow = monthly.at(-1);
  const peak = Math.max(1, ...monthly.flatMap((item) => showMonthlySpending ? [item.income, item.expense] : [item.income]));
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const periodLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date());

  return <div className="dashboard-page">
    <header className="page-header dashboard-header"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR FINANCES, IN FOCUS</div><h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}.</h1><p>A clear picture of where things stand.</p></div><div className="header-date"><CalendarDays size={16} /><span>{dateLabel}</span></div></header>
    {(currencies.length > 1 || (currencies.length === 1 && settings.data?.data?.currency && settings.data.data.currency !== currency)) && <div className="notice-banner"><CircleHelp size={16} /><span>{currencies.length > 1 ? <>Your accounts use multiple currencies. Totals below include only <strong>{currency}</strong> accounts; no conversion is applied.</> : <>Your preferred display currency is {settings.data?.data?.currency}, but your accounts use <strong>{currency}</strong>. Amounts are shown in account currency; no conversion is applied.</>}</span><Link to="/accounts">View accounts <ChevronRight size={14} /></Link></div>}
     <section className={`metric-grid${Number(showNetWorth) + Number(showMonthlySpending) + 1 === 1 ? " is-single" : Number(showNetWorth) + Number(showMonthlySpending) + 1 === 2 ? " is-two" : ""}`} aria-label="Financial summary">
      {showNetWorth && <article className="metric-card metric-primary"><div className="metric-top"><span>Net position <span className="info-hint" title={`Assets minus liabilities, using accounts in ${currency}.`}><CircleHelp size={14} /></span></span><span className="metric-icon"><Wallet size={18} /></span></div><div className="metric-value">{preferences?.showDefinedNetWorth && netPositionAccounts.length === 0 ? "—" : formatMoney(netPosition, currency)}</div><div className="metric-foot"><span>{preferences?.showDefinedNetWorth ? netPositionAccounts.length ? `${netPositionAccounts.length} selected ${netPositionAccounts.length === 1 ? "account" : "accounts"} in ${currency}` : `No selected accounts in ${currency}` : "Assets less liabilities"}</span><span className="metric-period">{currency}</span></div><div className="metric-decoration" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div></article>}
      {showMonthlySpending && <article className="metric-card"><div className="metric-top"><span>Expense-category activity</span><span className="metric-icon expense-icon"><ArrowUpRight size={18} /></span></div><div className="metric-value">{reports.isError || currencies.length > 1 ? "—" : formatMoney(currentMonthFlow?.expense ?? 0, currency)}</div><div className="metric-foot"><span>{reports.isError ? "Category data unavailable" : currencies.length > 1 ? "Currency breakdown unavailable" : "Withdrawals only; transfers excluded"}</span><span className="metric-period">{periodLabel}</span></div></article>}
      <article className="metric-card"><div className="metric-top"><span>Income-category activity</span><span className="metric-icon income-icon"><ArrowDownLeft size={18} /></span></div><div className="metric-value">{reports.isError || currencies.length > 1 ? "—" : formatMoney(currentMonthFlow?.income ?? 0, currency)}</div><div className="metric-foot"><span>{reports.isError ? "Category data unavailable" : currencies.length > 1 ? "Currency breakdown unavailable" : "Deposits only; transfers excluded"}</span><span className="metric-period">{periodLabel}</span></div></article>
    </section>

      <section className={`content-grid dashboard-overview-grid${showMonthlySpending ? "" : " is-budget-hidden"}`}>
      <article className="surface-card trend-card"><div className="section-heading"><div><span className="section-kicker">CATEGORY-BASED ACTIVITY</span><h2>{showMonthlySpending ? "Income & expense categories" : "Income categories"}</h2></div><Link to="/reports" className="text-link">Full report <ChevronRight size={15} /></Link></div>
        {reports.isPending ? <div className="chart-loading" aria-label="Loading cash flow" /> : reports.isError ? <div className="inline-empty">Cash-flow data is unavailable right now.</div> : currencies.length > 1 ? <div className="inline-empty">Select a single account currency to view a comparable chart.</div> : monthly.length === 0 ? <div className="inline-empty">No cash-flow activity to chart yet.</div> : <div className="cashflow-chart"><div className="chart-y-labels"><span>{formatMoney(peak, currency)}</span><span>{formatMoney(peak / 2, currency)}</span><span>{formatMoney(0, currency)}</span></div><div className="chart-columns">{monthly.map((item) => <div className="chart-month" key={item.month}><div className="bar-pair"><div className="bar-track"><div className="bar bar-income" style={{ height: `${Math.max(3, item.income / peak * 100)}%` }} title={`Income ${formatMoney(item.income, currency)}`} /></div>{showMonthlySpending && <div className="bar-track"><div className="bar bar-expense" style={{ height: `${Math.max(3, item.expense / peak * 100)}%` }} title={`Expenses ${formatMoney(item.expense, currency)}`} /></div>}</div><span>{new Date(`${item.month}-01T12:00:00`).toLocaleDateString(undefined, { month: "short" })}</span></div>)}</div></div>}
        <div className="chart-legend"><span><i className="legend-income" />Income categories</span>{showMonthlySpending && <span><i className="legend-expense" />Expense categories</span>}</div><p className="report-note">Withdrawals and deposits are counted by category type; transfers are excluded.</p>
      </article>
      <article className="surface-card account-card"><div className="section-heading"><div><span className="section-kicker">YOUR MONEY</span><h2>Accounts</h2></div><Link to="/accounts" className="icon-link" aria-label="View all accounts"><ChevronRight size={18} /></Link></div><div className="account-list">{compatibleAccounts.slice(0, 5).map((account) => <div className="account-row" key={account.id}><span className={`account-symbol account-${account.type}`}><Wallet size={16} /></span><span className="account-copy"><strong>{account.name}</strong><small>{account.type}</small></span><strong className="account-balance">{formatMoney(account.balance, account.currency)}</strong></div>)}{compatibleAccounts.length === 0 && <div className="empty-inline"><Wallet size={20} /><span>No {currency} accounts yet.</span></div>}</div><Link className="account-add" to="/accounts"><Plus size={16} /> Manage accounts</Link></article>
    </section>

    <section className="content-grid lower-grid">
      <article className="surface-card activity-card"><div className="section-heading"><div><span className="section-kicker">LATEST ACTIVITY</span><h2>Recent transactions</h2></div><Link to="/transactions" className="text-link">All transactions <ChevronRight size={15} /></Link></div><div className="transaction-list">{recentTransactions.map((transaction) => { const income = transaction.category?.type === "revenue"; const expense = transaction.category?.type === "expense"; const transactionCurrencies = [...new Set(transaction.entries?.map((entry) => entry.account?.currency).filter((value): value is string => Boolean(value)) ?? [])]; const transactionCurrency = transactionCurrencies.length === 1 ? transactionCurrencies[0] : currencies.length === 1 ? currency : null; return <div className="transaction-row" key={transaction.id}><span className={`transaction-symbol${income ? " income-symbol" : ""}`}>{income ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><span className="transaction-copy"><strong>{transaction.description}</strong><small>{transaction.category?.name ?? "Uncategorized"} <span>·</span> {new Date(transaction.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span><strong className={`transaction-amount ${income ? "amount-in" : expense ? "amount-out" : ""}`}>{transactionCurrency ? `${income ? "+" : expense ? "−" : ""}${formatMoney(transaction.amount, transactionCurrency)}` : "—"}</strong></div>; })}{recentTransactions.length === 0 && <div className="empty-inline">Your transactions will appear here.</div>}</div></article>
      {showMonthlySpending && <article className="surface-card dashboard-budget-card"><div className="section-heading"><div><span className="section-kicker">PLAN AHEAD</span><h2>Budget progress</h2></div><Link to="/budgets" className="icon-link" aria-label="View budgets"><ChevronRight size={18} /></Link></div><div className="budget-list">{budgets.slice(0, 4).map((budget) => <div className="budget-row" key={budget.id}><div className="budget-label"><strong>{budget.category?.name ?? "Category"}</strong><span>{formatMoney(budget.spent, currency)} <i>of</i> {formatMoney(budget.amount, currency)}</span></div><div className="budget-track"><span className={budget.progress >= 100 ? "over-budget" : ""} style={{ width: `${Math.min(budget.progress, 100)}%` }} /></div></div>)}{budgets.length === 0 && <div className="empty-inline">No budgets set for this period.</div>}</div><Link className="budget-footer" to="/budgets">Review budgets <TrendingUp size={15} /></Link></article>}
    </section>
    <footer className="dashboard-footnote">Balances reflect your latest recorded activity. <Link to="/reports">Explore your reports <ChevronRight size={13} /></Link></footer>
  </div>;
}
