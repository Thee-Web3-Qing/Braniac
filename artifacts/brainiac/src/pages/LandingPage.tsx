import { Link, useLocation } from "wouter";
import { Brain, Zap, Wallet, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";

export default function LandingPage() {
  const { login, authenticated } = usePrivy();
  const [, navigate] = useLocation();

  const handleStart = () => {
    if (authenticated) {
      navigate("/dashboard");
    } else {
      login();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0A0E1A] text-foreground font-sans selection:bg-primary/30">

      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0A0E1A]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <span className="font-display font-bold text-lg md:text-xl tracking-tight">Brainiac</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={handleStart} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Sign in
            </button>
            <Button onClick={handleStart} size="sm" className="bg-primary hover:bg-primary/90 text-white font-medium rounded-full px-4 md:px-5 text-sm">
              Get started
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 md:pt-32 pb-20 md:pb-24">

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 md:px-6 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-6 md:mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            Powered by Qwen AI · Built on 0G Storage
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-tight text-white mb-5 md:mb-6 leading-[1.1]">
            Your Web3 world,{" "}
            <br className="hidden md:block" />
            <span className="text-primary">finally organized.</span>
          </h1>

          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed px-2 md:px-0">
            Brainiac monitors everything you're plugged into — Discord servers, Telegram groups, and wallets — and surfaces what actually matters. Catch up in seconds, not hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Button onClick={handleStart} size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-12 text-base">
              Start for free
            </Button>
            <Button size="lg" variant="outline" onClick={handleStart} className="w-full sm:w-auto rounded-full px-8 h-12 text-base border-white/10 hover:bg-white/5">
              See how it works
            </Button>
          </div>
        </section>

        {/* Dashboard Preview Mockup */}
        <section className="max-w-5xl mx-auto px-4 md:px-6 mt-16 md:mt-20 animate-slide-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          <div className="rounded-xl md:rounded-2xl border border-white/8 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-9 md:h-10 border-b border-white/5 bg-black/40 flex items-center px-3 md:px-4 gap-3 md:gap-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/30 border border-red-500/50" />
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/30 border border-green-500/50" />
              </div>
              <div className="flex-1 max-w-xs mx-auto bg-white/5 rounded-md h-5 md:h-6 flex items-center justify-center text-[9px] md:text-[10px] text-white/40 font-mono">
                app.brainiac.xyz/dashboard
              </div>
            </div>
            <div className="flex h-48 sm:h-64 md:h-[400px]">
              <div className="hidden sm:flex w-36 md:w-48 border-r border-white/5 bg-black/20 p-3 md:p-4 flex-col gap-2">
                <div className="h-7 md:h-8 rounded bg-primary/20 flex items-center px-3 mb-3 md:mb-4">
                  <span className="w-16 md:w-20 h-2 bg-primary/60 rounded" />
                </div>
                <div className="h-7 md:h-8 rounded bg-white/5 flex items-center px-3"><span className="w-12 md:w-16 h-2 bg-white/15 rounded" /></div>
                <div className="h-7 md:h-8 rounded bg-white/5 flex items-center px-3"><span className="w-16 md:w-24 h-2 bg-white/15 rounded" /></div>
                <div className="h-7 md:h-8 rounded bg-white/5 flex items-center px-3"><span className="w-10 md:w-14 h-2 bg-white/15 rounded" /></div>
              </div>
              <div className="flex-1 p-3 md:p-6 bg-black/10">
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-6">
                  {[
                    { val: "12", color: "text-cyan-400" },
                    { val: "3", color: "text-primary" },
                    { val: "8", color: "text-green-400" },
                  ].map((s, i) => (
                    <div key={i} className="h-14 sm:h-20 md:h-24 rounded-xl bg-white/5 border border-white/5 p-2 md:p-4 flex flex-col justify-between">
                      <span className="w-8 md:w-16 h-1.5 md:h-2 bg-white/15 rounded" />
                      <span className={`text-base md:text-2xl font-bold ${s.color}`}>{s.val}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 md:space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 md:h-16 rounded-xl bg-white/5 border border-white/5 flex items-center px-3 md:px-4 gap-3 md:gap-4">
                      <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-1.5 md:space-y-2">
                        <div className="w-24 md:w-32 h-1.5 md:h-2 bg-white/15 rounded" />
                        <div className="w-3/4 h-1.5 md:h-2 bg-white/8 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 mt-20 md:mt-32">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
            {[
              { icon: <Zap className="w-5 h-5 text-cyan-400" />, bg: "bg-cyan-500/8 border-cyan-500/15", title: "Feed Intelligence", desc: "Connect your Discord servers and Telegram groups. We filter the noise and surface the alpha you actually care about." },
              { icon: <Wallet className="w-5 h-5 text-primary" />, bg: "bg-primary/8 border-primary/15", title: "Wallet Memory", desc: "Track your wallets across chains. We remember your positions so you stop checking block explorers every hour." },
              { icon: <MessageSquare className="w-5 h-5 text-purple-400" />, bg: "bg-purple-500/8 border-purple-500/15", title: "Create from feed", desc: "When you want to share what you've been tracking, turn your feed into threads, recaps, or alpha briefs. Your context, your voice." },
            ].map((f) => (
              <div key={f.title} className="p-5 md:p-6 rounded-2xl bg-card border border-border">
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl border ${f.bg} flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="text-base md:text-lg font-display font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 mt-20 md:mt-32">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-sm md:text-base">Start for free, upgrade when you need more power.</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Free", price: "$0", period: "/forever",
                features: ["1 wallet", "2 communities", "7-day history", "5 AI drafts/month"],
                cta: <Button variant="outline" className="w-full">Get Started</Button>,
                highlight: false,
              },
              {
                name: "Pro", price: "$15", period: "/month",
                features: ["3 wallets", "Unlimited communities", "90-day history", "Unlimited AI drafts"],
                cta: <Button className="w-full bg-primary hover:bg-primary/90 text-white">Upgrade to Pro</Button>,
                highlight: true,
              },
              {
                name: "Builder", price: "$39", period: "/month",
                features: ["Unlimited wallets", "Unlimited communities", "Full history", "API access + team sharing"],
                cta: <Button variant="outline" className="w-full">Contact Sales</Button>,
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-6 md:p-7 rounded-2xl bg-card border relative ${plan.highlight ? "border-primary/40 md:-translate-y-3" : "border-border"}`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 inset-x-0 h-px bg-primary/60 rounded-t-2xl" />
                )}
                <div className={`text-sm font-semibold mb-2 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`}>{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-bold text-white font-display">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5 items-start">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.cta}
              </div>
            ))}
          </div>
        </section>

      </main>

      <footer className="border-t border-white/5 bg-[#0A0E1A]/80 py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-white text-sm">Brainiac</span>
          </div>
          <div className="text-sm text-muted-foreground">2026 Brainiac. Built on 0G.</div>
        </div>
      </footer>
    </div>
  );
}
