import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, CircleHelp } from "lucide-react";
import { Card } from "../components/ui/card";
import { ListSkeleton } from "../components/ui/loading-skeleton";
import { PageFrame } from "../components/page-frame";
import { useApi } from "../lib/use-api";
import { DEFAULT_CURRENCY } from "../components/workspace-ui";

type Monthly = { month: string; currency: string; income: number; expense: number };
type Account = { currency: string };
type List<T> = { data: T[]; meta?: { totalCount: number } };
type Settings = { currency: string };
type Spending = { categoryId: number | null; categoryName: string | null; currency: string; total: number };
type Asset = { id: number; name: string; balance: number; type: string; currency: string };
type History = { month: string; currency: string; amount: number };
type Source = { categoryName: string | null; currency: string; total: number };
type Response<T> = { data: T };
const monthName = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
const money = (minor: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);

export function ReportsPage() {
  const api = useApi();
  const income = useQuery({ queryKey: ["report", "income"], queryFn: () => api<Response<Monthly[]>>("/api/reports/income-vs-expense") });
  const spending = useQuery({ queryKey: ["report", "spending"], queryFn: () => api<Response<Spending[]>>("/api/reports/spending-by-category") });
  const assets = useQuery({ queryKey: ["report", "assets"], queryFn: () => api<Response<Asset[]>>("/api/reports/asset-allocation") });
  const history = useQuery({ queryKey: ["report", "history"], queryFn: () => api<Response<History[]>>("/api/reports/net-worth-history") });
  const sources = useQuery({ queryKey: ["report", "income-sources"], queryFn: () => api<Response<Source[]>>("/api/reports/income-by-category") });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => api<List<Account>>("/api/accounts?pageSize=100") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<Response<Settings | null>>("/api/settings") });
  const queries = [income, spending, assets, history, sources];
  if (queries.some((query) => query.isPending) || accounts.isPending || settings.isPending) return <PageFrame title="Reports" description="Understand the patterns behind your money."><div className="report-grid"><ListSkeleton rows={4} /><ListSkeleton rows={4} /></div></PageFrame>;
  const currencies = [...new Set(accounts.data?.data.map((account) => account.currency) ?? [])];
  const preferred = settings.data?.data?.currency;
  const currency = currencies.length === 1 ? currencies[0] : (preferred && currencies.includes(preferred) ? preferred : currencies[0]) ?? preferred ?? DEFAULT_CURRENCY;
  const mixedCurrencies = currencies.length > 1;
  const monthly = (income.data?.data ?? []).filter((row) => row.currency === currency);
  const spendingRows = (spending.data?.data ?? []).filter((row) => row.currency === currency);
  const historyRows = (history.data?.data ?? []).filter((row) => row.currency === currency);
  const sourceRows = (sources.data?.data ?? []).filter((row) => row.currency === currency);
  const assetRows = (assets.data?.data ?? []).filter((row) => row.currency === currency);
  const maxMonthly = Math.max(1, ...monthly.flatMap((row) => [row.income, row.expense]));
  const maxSpending = Math.max(1, ...spendingRows.map((row) => row.total));
  const maxHistory = Math.max(1, ...historyRows.map((row) => Math.abs(row.amount)));
  const failed = queries.some((query) => query.isError);

  return <PageFrame title="Reports" description="Understand the patterns behind your money.">
    {mixedCurrencies && <div className="notice-banner"><CircleHelp size={16} /><span>Your accounts use more than one currency. Charts show {currency} only; totals are hidden because no currency conversion is available.</span></div>}
    {failed && <div className="report-warning" role="status">Some reports could not be loaded. Available sections are still shown below.</div>}
    <section className="report-grid">
      <Card className="report-card report-wide"><div className="report-heading"><div><span className="section-kicker">LAST SIX MONTHS</span><h2>Income &amp; expense categories</h2></div><div className="report-legend"><span><i className="legend-income" />Income categories</span><span><i className="legend-expense" />Expense categories</span></div></div>
        <div className="report-month-chart">{monthly.map((row) => <div className="report-month" key={row.month}><div className="report-bars"><div className="report-bar report-income" style={{ height: `${Math.max(row.income ? 4 : 0, row.income / maxMonthly * 100)}%` }} title={`Income ${money(row.income, currency)}`} /><div className="report-bar report-expense" style={{ height: `${Math.max(row.expense ? 4 : 0, row.expense / maxMonthly * 100)}%` }} title={`Expenses ${money(row.expense, currency)}`} /></div><span>{monthName(row.month)}</span></div>)}</div>
        {mixedCurrencies ? <p className="report-note">Totals hidden because this report cannot yet be filtered to one currency.</p> : <div className="report-summary"><span><ArrowDownLeft size={15} /> Income <strong>{money(monthly.at(-1)?.income ?? 0, currency)}</strong></span><span><ArrowUpRight size={15} /> Expenses <strong>{money(monthly.at(-1)?.expense ?? 0, currency)}</strong></span></div>}<p className="report-note">Only deposits and withdrawals count. Transfers are excluded.</p>
      </Card>

      <Card className="report-card"><div className="report-heading"><div><span className="section-kicker">THIS MONTH</span><h2>Expense-category totals</h2></div></div><p className="report-note">Only withdrawal transactions are included.</p><div className="report-list">{spendingRows.map((row) => <div className="report-item" key={`${row.categoryId ?? "none"}:${row.currency}`}><div className="report-item-label"><span>{row.categoryName ?? "Uncategorized"}</span><strong>{mixedCurrencies ? "—" : money(row.total, currency)}</strong></div><div className="report-track"><span style={{ width: `${row.total / maxSpending * 100}%` }} /></div></div>)}{spendingRows.length === 0 && <p className="report-empty">No expense-category activity this month.</p>}</div></Card>

      <Card className="report-card"><div className="report-heading"><div><span className="section-kicker">RECENT TREND</span><h2>Estimated net-worth history</h2></div><ChartNoAxesCombined size={17} className="report-heading-icon" /></div><p className="report-note">Reconstructed from current asset/liability balances and dated ledger entries. Past manual balance reconciliations and edited/deleted transactions are not tracked, so older points may differ from actual historical balances.</p><div className="history-list">{historyRows.map((row) => <div className="history-row" key={`${row.month}:${row.currency}`}><span>{monthName(row.month)}</span><div className="history-track"><span className={row.amount < 0 ? "negative" : ""} style={{ width: `${Math.max(row.amount ? 3 : 0, Math.abs(row.amount) / maxHistory * 100)}%` }} /></div><strong>{mixedCurrencies ? "—" : money(row.amount, currency)}</strong></div>)}</div></Card>

      <Card className="report-card"><div className="report-heading"><div><span className="section-kicker">THIS MONTH</span><h2>Income by source</h2></div></div><div className="report-list">{sourceRows.map((row, index) => <div className="source-row" key={`${row.categoryName}-${row.currency}-${index}`}><span className="source-mark">{(row.categoryName ?? "?").slice(0, 1).toUpperCase()}</span><span>{row.categoryName ?? "Uncategorized"}</span><strong>{mixedCurrencies ? "—" : money(row.total, currency)}</strong></div>)}{sourceRows.length === 0 && <p className="report-empty">No income sources recorded this month.</p>}</div></Card>

      <Card className="report-card"><div className="report-heading"><div><span className="section-kicker">CURRENT BALANCES</span><h2>Asset allocation</h2></div></div><div className="report-list">{assetRows.map((row) => <div className="source-row" key={row.id}><span className="source-mark asset-mark">{row.name.slice(0, 1).toUpperCase()}</span><span>{row.name}</span><strong>{mixedCurrencies ? "—" : money(row.balance, currency)}</strong></div>)}{assetRows.length === 0 && <p className="report-empty">No asset accounts yet.</p>}</div></Card>
    </section>
  </PageFrame>;
}
