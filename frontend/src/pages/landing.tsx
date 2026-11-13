import { useAuth } from "@clerk/react";
import { ArrowRight, ArrowUpRight, ChartNoAxesCombined, CircleCheck, LockKeyhole, Wallet, WalletCards } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router";

const features = [
  { icon: Wallet, label: "Accounts", detail: "Keep every balance in its own currency." },
  { icon: ChartNoAxesCombined, label: "Activity", detail: "Understand income, spending and budgets." },
  { icon: CircleCheck, label: "Goals", detail: "Make progress visible, one step at a time." },
];

function WorkspacePreview() {
  return <div className="landing-preview" aria-label="Illustration of the MoneyBook workspace">
    <div className="landing-preview-top"><span className="landing-preview-brand"><i><WalletCards size={13} /></i> MONEYBOOK</span><span className="landing-preview-status"><b /> WORKSPACE PREVIEW</span></div>
    <div className="landing-preview-content">
      <div className="landing-preview-heading"><span>YOUR FINANCIAL HOME</span><strong>Everything, in its place.</strong><small>A clear view of what matters to you.</small></div>
      <div className="landing-preview-cards">
        <div className="landing-preview-card landing-preview-card--primary"><div><span>01</span><Wallet size={15} /></div><strong>Accounts</strong><i className="landing-preview-rule landing-preview-rule--long" /><i className="landing-preview-rule" /></div>
        <div className="landing-preview-card"><div><span>02</span><ChartNoAxesCombined size={15} /></div><strong>Activity</strong><div className="landing-preview-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>
        <div className="landing-preview-card"><div><span>03</span><CircleCheck size={15} /></div><strong>Goals</strong><i className="landing-preview-progress"><b /></i><small>One step at a time</small></div>
      </div>
      <div className="landing-preview-foot"><span><LockKeyhole size={12} /> Your data stays yours</span><span>Private workspace</span></div>
    </div>
    <div className="landing-preview-caption"><span>BUILT FOR THE WHOLE PICTURE</span><span>01 / 03</span></div>
  </div>;
}

export function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate("/dashboard", { replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded || isSignedIn) return <main className="landing-loading"><span className="landing-loading-mark"><WalletCards size={18} /></span><span>Opening your workspace</span></main>;

  return <main className="landing-page">
    <header className="landing-nav"><Link to="/" className="landing-brand"><span><WalletCards size={18} /></span>MoneyBook</Link><nav aria-label="Account"><span className="landing-nav-note">A calmer way to manage money</span><Link to="/sign-in" className="landing-signin">Sign in</Link><Link to="/sign-up" className="landing-nav-cta">Create account <ArrowUpRight size={15} /></Link></nav></header>
    <section className="landing-hero">
      <div className="landing-copy"><span className="landing-kicker"><i /> PERSONAL FINANCE, MADE CLEAR</span><h1>Know where it goes.<br /><em>See what comes next.</em></h1><p>Bring accounts, everyday activity, budgets and goals into one steady view. Clear enough to act on, calm enough to come back to.</p><div className="landing-actions"><Link to="/sign-up" className="landing-primary">Start your ledger <ArrowRight size={16} /></Link><Link to="/sign-in" className="landing-secondary">I already have an account</Link></div><div className="landing-assurance"><LockKeyhole size={13} /><span>Your ledger is private to you.</span><span className="landing-assurance-dot">·</span><span>No currency conversion.</span></div></div>
      <WorkspacePreview />
    </section>
    <section className="landing-features" aria-label="What you can do with MoneyBook">{features.map(({ icon: Icon, label, detail }, index) => <article className="landing-feature" key={label}><span className="landing-feature-number">0{index + 1}</span><span className="landing-feature-icon"><Icon size={17} /></span><div><h2>{label}</h2><p>{detail}</p></div><ArrowUpRight className="landing-feature-arrow" size={15} /></article>)}</section>
    <footer className="landing-footer"><span>MoneyBook <i>·</i> A clearer view of your finances</span><span>Personal finance, on your terms</span></footer>
  </main>;
}
