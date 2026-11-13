import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import {
  Activity, Archive, ArrowLeftRight, ChartNoAxesCombined, ChevronLeft,
  ChevronRight, CircleDollarSign, CreditCard, LayoutDashboard, LogOut,
  Moon, Repeat2, Settings, Tags, Target, Sun, Wallet,
} from "lucide-react";
import { askToConfirm } from "./ui/app-dialog";

const navigation = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/budgets", label: "Budgets", icon: CircleDollarSign },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/recurring", label: "Recurring", icon: Repeat2 },
  { to: "/shortcuts", label: "Shortcuts", icon: CreditCard },
  { to: "/reports", label: "Reports", icon: ChartNoAxesCombined },
];
const utilities = [
  { to: "/journal", label: "Journal", icon: Activity },
  { to: "/backup", label: "Backup", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("ledgerlite-theme") === "dark";
    document.documentElement.classList.toggle("theme-dark", saved);
    return saved;
  });
  const toggleTheme = () => setDark((value) => {
    const next = !value;
    localStorage.setItem("ledgerlite-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("theme-dark", next);
    return next;
  });
  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [location.pathname]);
  const renderLinks = (items: typeof navigation) => items.map(({ to, label, icon: Icon }) => (
    <NavLink key={to} to={to} title={collapsed ? label : undefined} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
    </NavLink>
  ));
  return <div className={`finance-app${collapsed ? " sidebar-collapsed" : ""}${dark ? " theme-dark" : ""}`}>
    <aside className="sidebar">
      <Link to="/dashboard" className="brand"><span className="brand-mark"><Wallet size={18} /></span><span>MoneyBook</span></Link>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="nav-group" aria-label="Main navigation">{renderLinks(navigation)}</nav>
      <div className="nav-caption nav-caption-tools">YOUR DATA</div>
      <nav className="nav-group" aria-label="Utilities">{renderLinks(utilities)}</nav>
      <div className="sidebar-bottom">
        <button className="nav-link theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} theme`}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}<span>{dark ? "Light appearance" : "Dark appearance"}</span>
        </button>
        <div className="profile-row"><span className="profile-avatar">{user?.imageUrl ? <img src={user.imageUrl} alt="" /> : (user?.fullName?.[0] ?? user?.primaryEmailAddress?.emailAddress?.[0] ?? "L").toUpperCase()}</span><span className="profile-name">{user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Your workspace"}<small>{user?.primaryEmailAddress?.emailAddress ?? "Personal account"}</small></span><button className="icon-button signout" title="Sign out" aria-label="Sign out" onClick={() => { void askToConfirm({ title: "Sign out of MoneyBook?", description: "You can sign back in at any time.", confirmLabel: "Sign out", danger: true }).then((confirmed) => { if (confirmed) void signOut(); }); }}><LogOut size={17} /></button></div>
      </div>
    </aside>
    <button className="sidebar-collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
     <main ref={mainRef} className="main-content"><Outlet /></main>
  </div>;
}
