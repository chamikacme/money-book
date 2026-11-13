import { useAuth } from "@clerk/react";
import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { AppShell } from "./components/app-shell";
const LandingPage = lazy(() => import("./pages/landing").then((module) => ({ default: module.LandingPage })));
const SignInPage = lazy(() => import("./pages/auth").then((module) => ({ default: module.SignInPage })));
const SignUpPage = lazy(() => import("./pages/auth").then((module) => ({ default: module.SignUpPage })));
const DashboardPage = lazy(() => import("./pages/dashboard").then((module) => ({ default: module.DashboardPage })));
const AccountsPage = lazy(() => import("./pages/collection-pages").then((module) => ({ default: module.AccountsPage })));
const AccountStatementPage = lazy(() => import("./pages/account-statement").then((module) => ({ default: module.AccountStatementPage })));
const BudgetsPage = lazy(() => import("./pages/collection-pages").then((module) => ({ default: module.BudgetsPage })));
const CategoriesPage = lazy(() => import("./pages/collection-pages").then((module) => ({ default: module.CategoriesPage })));
const GoalsPage = lazy(() => import("./pages/collection-pages").then((module) => ({ default: module.GoalsPage })));
const TransactionsPage = lazy(() => import("./pages/transactions").then((module) => ({ default: module.TransactionsPage })));
const BackupPage = lazy(() => import("./pages/utility-pages").then((module) => ({ default: module.BackupPage })));
const JournalPage = lazy(() => import("./pages/utility-pages").then((module) => ({ default: module.JournalPage })));
const RecurringPage = lazy(() => import("./pages/utility-pages").then((module) => ({ default: module.RecurringPage })));
const ReportsPage = lazy(() => import("./pages/reports").then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/utility-pages").then((module) => ({ default: module.SettingsPage })));
const ShortcutsPage = lazy(() => import("./pages/utility-pages").then((module) => ({ default: module.ShortcutsPage })));

function ProtectedRoutes() {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;
  if (!isSignedIn) return <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
}

export function AppRoutes() { return <Suspense fallback={<div className="route-loading" role="status">Loading MoneyBook…</div>}><Routes><Route path="/" element={<LandingPage />} /><Route path="/sign-in/*" element={<SignInPage />} /><Route path="/sign-up/*" element={<SignUpPage />} /><Route element={<ProtectedRoutes />}><Route element={<AppShell />}><Route path="/dashboard" element={<DashboardPage />} /><Route path="/accounts" element={<AccountsPage />} /><Route path="/accounts/:accountId/statement" element={<AccountStatementPage />} /><Route path="/categories" element={<CategoriesPage />} /><Route path="/transactions" element={<TransactionsPage />} /><Route path="/budgets" element={<BudgetsPage />} /><Route path="/goals" element={<GoalsPage />} /><Route path="/recurring" element={<RecurringPage />} /><Route path="/shortcuts" element={<ShortcutsPage />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/journal" element={<JournalPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/backup" element={<BackupPage />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense>; }
