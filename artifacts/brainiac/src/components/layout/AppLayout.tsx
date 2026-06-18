import { useState, useEffect, useRef, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Brain, LayoutDashboard, Zap, Wallet, MessageSquare, ChevronRight, Settings, X, CreditCard, LogOut, LogIn, Check, Plus, Loader2, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePrivy, useWallets, useLinkWithOAuth, useConnectWallet } from "@privy-io/react-auth";
import { useToast } from "@/hooks/use-toast";
import OGLoginHistory from "@/components/OGLoginHistory";
import { recordLoginOnOG } from "@/lib/og-storage";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/feed",      label: "Feed",       icon: Zap },
  { href: "/wallet",   label: "Wallets",     icon: Wallet },
  { href: "/brain",    label: "Brain",       icon: MessageSquare },
];

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

function LinkedAccountRow({
  icon,
  label,
  linked,
  detail,
  onLink,
  linking,
}: {
  icon: ReactNode;
  label: string;
  linked: boolean;
  detail?: string;
  onLink?: () => void;
  linking?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">{label}</p>
          {detail && <p className="text-[10px] text-muted-foreground truncate">{detail}</p>}
        </div>
      </div>
      {linked ? (
        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
          <Check className="w-3 h-3" /> Linked
        </span>
      ) : (
        <button
          onClick={onLink}
          disabled={linking}
          className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium shrink-0 disabled:opacity-50"
        >
          {linking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Link
        </button>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkingTwitter, setLinkingTwitter] = useState(false);
  const [linkConflict, setLinkConflict] = useState<"google" | "twitter" | null>(null);
  const recordedRef = useRef<string | null>(null);

  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { initOAuth, loading: oauthLinking } = useLinkWithOAuth();
  const { connectWallet } = useConnectWallet();
  const { toast } = useToast();

  // Use linkedAccounts array as the source of truth — more reliable than user.google/twitter shorthand
  const hasGoogle = user?.linkedAccounts?.some((a) => a.type === "google_oauth") ?? false;
  const hasTwitter = user?.linkedAccounts?.some((a) => a.type === "twitter_oauth") ?? false;
  const googleAccount = user?.linkedAccounts?.find((a) => a.type === "google_oauth") as { email?: string } | undefined;
  const twitterAccount = user?.linkedAccounts?.find((a) => a.type === "twitter_oauth") as { username?: string } | undefined;

  const socialMethodCount = [hasGoogle, hasTwitter].filter(Boolean).length;

  // Detect login method from linked accounts
  function detectLoginMethod(): string {
    if (!user) return "unknown";
    if (hasGoogle) return "google";
    if (hasTwitter) return "twitter";
    if (user.email?.address) return "email";
    if (wallets.length > 0) return "wallet";
    return "unknown";
  }

  // Record login on 0G Newton testnet (fire-and-forget, one per session)
  useEffect(() => {
    if (!authenticated || !ready || !user?.id) return;
    if (recordedRef.current === user.id) return;
    recordedRef.current = user.id;

    const walletAddress = wallets[0]?.address;
    const loginMethod = detectLoginMethod();
    const displayName =
      user.google?.name ?? user.twitter?.name ??
      (user.email?.address ? user.email.address.split("@")[0] : undefined) ??
      (walletAddress ?? undefined);

    recordLoginOnOG({ userId: user.id, walletAddress, loginMethod, displayName }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, ready, user?.id]);

  // After login: if user only has 1 social method, open the profile panel so they can link the other right away
  useEffect(() => {
    if (authenticated && ready && socialMethodCount < 2) {
      const timer = setTimeout(() => setProfileOpen(true), 600);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  async function handleLinkGoogle() {
    setLinkConflict(null);
    setLinkingGoogle(true);
    try {
      await initOAuth({ provider: "google" });
    } catch (err: unknown) {
      setLinkingGoogle(false);
      const code = (err as { privyErrorCode?: string })?.privyErrorCode;
      if (code === "failed_to_link_account") {
        setLinkConflict("google");
      } else {
        toast({ title: "Could not link Google", description: "Please try again.", variant: "destructive" });
      }
    }
  }

  async function handleLinkTwitter() {
    setLinkConflict(null);
    setLinkingTwitter(true);
    try {
      await initOAuth({ provider: "twitter" });
    } catch (err: unknown) {
      setLinkingTwitter(false);
      const code = (err as { privyErrorCode?: string })?.privyErrorCode;
      if (code === "failed_to_link_account") {
        setLinkConflict("twitter");
      } else {
        toast({ title: "Could not link X", description: "Please try again.", variant: "destructive" });
      }
    }
  }

  const displayName =
    user?.google?.name ??
    user?.twitter?.name ??
    (user?.email?.address ? user.email.address.split("@")[0] : undefined) ??
    (wallets[0]?.address ? shortAddr(wallets[0].address) : undefined) ??
    "Anon";

  const displayEmail =
    user?.email?.address ??
    user?.google?.email ??
    (wallets[0]?.address ? shortAddr(wallets[0].address) : "");

  const avatarSrc =
    user?.google?.profilePictureUrl ??
    user?.twitter?.profilePictureUrl ??
    undefined;

  const initials = getInitials(
    user?.google?.name ?? user?.twitter?.name,
    user?.email?.address ?? wallets[0]?.address
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 fixed inset-y-0 left-0 border-r border-border bg-sidebar flex-col z-20">
        <div className="p-5 pb-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-lg leading-tight tracking-tight">Brainiac</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 mt-3">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 mt-auto border-t border-border">
          {ready && authenticated ? (
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              <Avatar className="w-8 h-8 border border-border shrink-0">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-foreground">{displayName}</div>
                <div className="text-xs text-muted-foreground truncate">{displayEmail}</div>
              </div>
              <Settings className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          ) : (
            <button
              onClick={login}
              disabled={!ready}
              className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-primary/10 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <LogIn className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-primary">Sign in</div>
                <div className="text-xs text-muted-foreground">Connect your account</div>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-sidebar border-b border-border flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="p-1 bg-primary/10 rounded-lg">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-base tracking-tight">Brainiac</span>
        </Link>
        {ready && authenticated ? (
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center justify-center"
            aria-label="Profile and settings"
          >
            <Avatar className="w-8 h-8 border border-border">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <button
            onClick={login}
            disabled={!ready}
            className="text-sm font-medium text-primary disabled:opacity-50"
          >
            Sign in
          </button>
        )}
      </header>

      {/* Profile sheet */}
      {profileOpen && authenticated && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProfileOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-sidebar border-l border-border flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-display font-semibold text-foreground text-sm">Account</span>
              <button onClick={() => setProfileOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Profile header */}
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-11 h-11 border border-border shrink-0">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">{displayName}</p>
                    <p className="text-muted-foreground text-xs truncate">{displayEmail}</p>
                  </div>
                </div>

                <div className="bg-background rounded-xl border border-border p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Wallets</p>
                    <button
                      onClick={() => connectWallet()}
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium"
                    >
                      <Plus className="w-3 h-3" /> Add wallet
                    </button>
                  </div>
                  {wallets.length > 0 ? (
                    <div className="space-y-1.5">
                      {wallets.map((w) => (
                        <div key={w.address} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <p className="text-xs font-mono text-foreground truncate">{shortAddr(w.address)}</p>
                          <span className="text-[10px] text-muted-foreground/60 shrink-0 capitalize">{w.chainType}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">No wallets connected</p>
                  )}
                </div>

                <div className="bg-background rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Current plan</span>
                    <span className="text-xs font-semibold text-foreground">Free</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-primary rounded-full" style={{ width: "34%" }} />
                  </div>
                  <p className="text-muted-foreground/60 text-xs">5 of 15 AI drafts used this month</p>
                </div>
              </div>

              {/* 0G Login History */}
              {user?.id && <OGLoginHistory userId={user.id} />}

              {/* Connected accounts */}
              <div className="p-5 border-b border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Connected accounts</p>
                <p className="text-[10px] text-muted-foreground/60 mb-3">
                  Link sign-in methods so any of them log you into this profile.
                </p>

                {linkConflict && (
                  <div className="flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-medium text-amber-300 mb-0.5">
                        {linkConflict === "google" ? "Google" : "X"} already used by another account
                      </p>
                      <p className="text-[10px] text-amber-300/70 leading-relaxed">
                        Sign out, sign back in with{" "}
                        <strong>{linkConflict === "google" ? "Google" : "X"}</strong>, then link{" "}
                        {linkConflict === "google" ? "X" : "Google"} from there. That will become your primary account.
                      </p>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-border/50">
                  <LinkedAccountRow
                    icon={<GoogleIcon />}
                    label="Google"
                    linked={hasGoogle}
                    detail={googleAccount?.email}
                    onLink={handleLinkGoogle}
                    linking={linkingGoogle || (oauthLinking && linkingGoogle)}
                  />
                  <LinkedAccountRow
                    icon={<XIcon />}
                    label="X / Twitter"
                    linked={hasTwitter}
                    detail={twitterAccount?.username ? `@${twitterAccount.username}` : undefined}
                    onLink={handleLinkTwitter}
                    linking={linkingTwitter || (oauthLinking && linkingTwitter)}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 space-y-1">
                <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-left">
                  <Settings className="w-4 h-4" /> Settings
                </button>
                <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors text-left">
                  <CreditCard className="w-4 h-4" /> Upgrade to Pro
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <button
                onClick={() => { logout(); setProfileOpen(false); }}
                className="flex items-center gap-2 text-muted-foreground/60 hover:text-muted-foreground text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-sidebar/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 pb-20 md:pb-0 min-w-0">
        {children}
      </main>
    </div>
  );
}
