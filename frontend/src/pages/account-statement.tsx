import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, CalendarDays, FileText } from "lucide-react";
import { Link, useParams } from "react-router";
import { useApi } from "../lib/use-api";
import { Input } from "../components/ui/input";
import { EmptyState, ErrorNotice, Money, Panel, StatTile, WorkspacePage } from "../components/workspace-ui";

type Account = { id: number; name: string; type: string; currency: string; balance: number };
type StatementEntry = {
  transaction: { id: number; date: string; description: string };
  entry: { id: number; type: "debit" | "credit"; amount: number; date: string };
  category: { name: string } | null;
  balance: number;
};
type Statement = {
  data: {
    account: Account;
    openingBalance: number;
    debitTotal: number;
    creditTotal: number;
    endingBalance: number;
    entries: StatementEntry[];
    reconstructed: boolean;
  };
};

const dayInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatDate = (date: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(date.length === 10 ? `${date}T12:00:00` : date));
const formatMoney = (minor: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
const isDebitBalance = (amount: number, type: string) => (amount >= 0) === (type === "asset" || type === "expense");

export function AccountStatementPage() {
  const api = useApi();
  const { accountId } = useParams();
  const id = Number(accountId);
  const today = new Date();
  const [startDate, setStartDate] = useState(dayInput(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [endDate, setEndDate] = useState(dayInput(today));
  const [showBalanceColumn, setShowBalanceColumn] = useState(true);
  const query = useQuery({
    queryKey: ["account-statement", id, startDate, endDate],
    enabled: Number.isInteger(id) && id > 0 && Boolean(startDate && endDate && startDate <= endDate),
    queryFn: () => api<Statement>(`/api/accounts/${id}/statement?startDate=${startDate}&endDate=${endDate}`),
  });
  const statement = query.data?.data;
  const account = statement?.account;

  return <WorkspacePage page="account-statement" title={account?.name ?? "Account statement"} description={account ? `${account.type} account · ${account.currency}` : "Review account activity and balances for a selected period."}>
    <Link className="statement-back-link" to="/accounts"><ArrowLeft size={14} /> All accounts</Link>
    <Panel className="statement-period-panel">
      <div><span className="workspace-eyebrow">STATEMENT PERIOD</span><h2>Choose dates</h2></div>
      <div className="statement-date-controls">
        <label><span>From</span><Input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label><span>Through</span><Input type="date" value={endDate} min={startDate} max={dayInput(today)} onChange={(event) => setEndDate(event.target.value)} /></label>
        <span className="statement-period-icon"><CalendarDays size={17} /></span>
      </div>
    </Panel>

    {!startDate || !endDate || startDate > endDate ? <Panel><ErrorNotice message="Choose a valid date range." /></Panel> : query.isPending ? <div className="statement-loading" role="status">Building your statement…</div> : query.isError ? <Panel><ErrorNotice message={query.error.message} /></Panel> : statement && <>
      <section className="workspace-stats statement-summary" aria-label="Statement summary">
        <StatTile label="Starting balance" value={formatMoney(statement.openingBalance, account!.currency)} detail={formatDate(startDate)} icon={ArrowLeft} />
        <StatTile label="Debits" value={formatMoney(statement.debitTotal, account!.currency)} detail="Period total" icon={ArrowUpRight} tone="red" />
        <StatTile label="Credits" value={formatMoney(statement.creditTotal, account!.currency)} detail="Period total" icon={ArrowDownLeft} tone="green" />
        <StatTile label="Ending balance" value={formatMoney(statement.endingBalance, account!.currency)} detail={formatDate(endDate)} icon={FileText} tone="blue" />
      </section>

      <Panel className="statement-table-panel">
        <div className="statement-table-heading"><div><span className="workspace-eyebrow">ACCOUNT ACTIVITY</span><h2>Transactions</h2></div><div className="statement-table-tools"><label className="statement-balance-toggle"><Input type="checkbox" checked={showBalanceColumn} onChange={(event) => setShowBalanceColumn(event.target.checked)} />Balance column</label><span>{statement.entries.length} {statement.entries.length === 1 ? "entry" : "entries"}</span></div></div>
        <div className="workspace-table-wrap"><table className={`workspace-table statement-table${showBalanceColumn ? " has-balance-column" : ""}`}><thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="numeric">Debit</th><th className="numeric">Credit</th>{showBalanceColumn && <th className="numeric">Balance</th>}</tr></thead><tbody>
          <tr className="statement-balance-row"><td className="table-date">{formatDate(startDate)}</td><td><strong>Beginning balance</strong><small>Balance brought forward</small></td><td>—</td><td className="numeric">{isDebitBalance(statement.openingBalance, account!.type) ? <Money minor={Math.abs(statement.openingBalance)} currency={account!.currency} /> : "—"}</td><td className="numeric">{isDebitBalance(statement.openingBalance, account!.type) ? "—" : <Money minor={Math.abs(statement.openingBalance)} currency={account!.currency} />}</td>{showBalanceColumn && <td className="numeric"><Money minor={statement.openingBalance} currency={account!.currency} /></td>}</tr>
          {statement.entries.map(({ transaction, entry, category, balance }) => <tr key={entry.id}><td className="table-date">{formatDate(entry.date)}</td><td><strong>{transaction.description}</strong><small>TX-{transaction.id}</small></td><td>{category?.name ?? "—"}</td><td className="numeric">{entry.type === "debit" ? <Money minor={entry.amount} currency={account!.currency} /> : "—"}</td><td className="numeric">{entry.type === "credit" ? <Money minor={entry.amount} currency={account!.currency} /> : "—"}</td>{showBalanceColumn && <td className="numeric"><Money minor={balance} currency={account!.currency} /></td>}</tr>)}
          <tr className="statement-balance-row statement-ending-row"><td className="table-date">{formatDate(endDate)}</td><td><strong>Ending balance</strong><small>Balance carried forward (c/f)</small></td><td>—</td><td className="numeric">{!isDebitBalance(statement.endingBalance, account!.type) ? <Money minor={Math.abs(statement.endingBalance)} currency={account!.currency} /> : "—"}</td><td className="numeric">{!isDebitBalance(statement.endingBalance, account!.type) ? "—" : <Money minor={Math.abs(statement.endingBalance)} currency={account!.currency} />}</td>{showBalanceColumn && <td className="numeric"><Money minor={statement.endingBalance} currency={account!.currency} /></td>}</tr>
        </tbody></table>{statement.entries.length === 0 && <EmptyState title="No activity in this period" detail="Choose a wider date range to see more account entries." icon={FileText} />}</div>
        <p className="statement-reconstruction-note">Balances are reconstructed from the current account balance and dated ledger entries. Manual balance changes and edited or deleted transactions are not retained as historical snapshots.</p>
      </Panel>
    </>}
  </WorkspacePage>;
}
