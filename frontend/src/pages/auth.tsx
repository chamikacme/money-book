import { SignIn, SignUp } from "@clerk/react";
import { ArrowUpRight, Check, WalletCards } from "lucide-react";

const clerkAppearance = {
  variables: { colorPrimary: "#243b6b", colorBackground: "#ffffff", colorInputBackground: "#f7f8fa", colorInputText: "#171a21", colorText: "#171a21", colorTextSecondary: "#687182", borderRadius: "10px", fontFamily: "Manrope, ui-sans-serif, sans-serif" },
  elements: { rootBox: "auth-clerk-root", card: "auth-clerk-card", headerTitle: "auth-clerk-title", headerSubtitle: "auth-clerk-subtitle", formButtonPrimary: "auth-clerk-primary", formFieldInput: "auth-clerk-input", footerActionLink: "auth-clerk-link" },
};

function AuthStory() {
  return <section className="auth-story" aria-label="MoneyBook introduction">
    <a className="auth-brand" href="/" aria-label="MoneyBook home"><span><WalletCards size={19} /></span>MoneyBook</a>
    <div className="auth-story-copy"><span className="auth-kicker">A CLEARER KIND OF FINANCE</span><h1>Your money,<br />in good order.</h1><p>A calm place to see what’s coming in, what’s going out, and what you’re working toward.</p></div>
    <div className="auth-visual" aria-hidden="true"><div className="auth-visual-orbit auth-visual-orbit-one" /><div className="auth-visual-orbit auth-visual-orbit-two" /><div className="auth-ledger-preview"><div className="auth-ledger-head"><span className="auth-ledger-mark"><WalletCards size={15} /></span><span>YOUR FINANCIAL HOME</span><ArrowUpRight size={15} /></div><div className="auth-ledger-lines"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="auth-ledger-foot"><span><Check size={13} /> Accounts</span><span><Check size={13} /> Activity</span><span><Check size={13} /> Goals</span></div></div></div>
    <div className="auth-story-foot"><span>PERSONAL FINANCE, MADE CLEAR</span><span>Private by design</span></div>
  </section>;
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-shell"><AuthStory /><section className="auth-form-panel"><div className="auth-mobile-brand"><span><WalletCards size={18} /></span>MoneyBook</div><div className="auth-form-wrap">{children}<p className="auth-form-note">Your financial data stays yours. MoneyBook never sells your information.</p></div><footer className="auth-form-footer">© {new Date().getFullYear()} MoneyBook <span>Secure personal finance</span></footer></section></main>;
}

export function SignInPage() { return <AuthLayout><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={clerkAppearance} /></AuthLayout>; }
export function SignUpPage() { return <AuthLayout><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={clerkAppearance} /></AuthLayout>; }
