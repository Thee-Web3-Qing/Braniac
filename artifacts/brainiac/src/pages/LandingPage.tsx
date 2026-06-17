import { Link } from "wouter";
import { Brain, Zap, Wallet, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0A0E1A] text-foreground font-sans selection:bg-primary/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0A0E1A]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl tracking-tight">Brainiac</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-medium rounded-full px-5">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24">
        
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Powered by Qwen AI · Built on 0G Storage
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white mb-6 leading-[1.1]">
            Your Web3 world, <br className="hidden md:block" />
            <span className="gradient-text">finally organized.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Brainiac pulls signal from your Discord servers and Telegram groups, remembers your on-chain activity, and helps you create content — all in one AI-powered dashboard.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-12 text-base shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                Start for free →
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 h-12 text-base border-white/10 hover:bg-white/5">
              See how it works
            </Button>
          </div>
        </section>

        {/* Dashboard Preview Mockup */}
        <section className="max-w-5xl mx-auto px-6 mt-20 animate-slide-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          <div className="rounded-2xl border border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-primary/10">
            {/* Fake browser bar */}
            <div className="h-10 border-b border-white/5 bg-black/40 flex items-center px-4 gap-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
              </div>
              <div className="flex-1 max-w-md mx-auto bg-white/5 rounded-md h-6 flex items-center justify-center text-[10px] text-white/40 font-mono">
                app.brainiac.xyz/dashboard
              </div>
            </div>
            {/* Fake app content */}
            <div className="flex h-[400px]">
              <div className="w-48 border-r border-white/5 bg-black/20 p-4 flex flex-col gap-2">
                <div className="h-8 rounded bg-primary/20 flex items-center px-3 mb-4"><span className="w-20 h-2 bg-primary rounded"></span></div>
                <div className="h-8 rounded bg-white/5 flex items-center px-3"><span className="w-16 h-2 bg-white/20 rounded"></span></div>
                <div className="h-8 rounded bg-white/5 flex items-center px-3"><span className="w-24 h-2 bg-white/20 rounded"></span></div>
                <div className="h-8 rounded bg-white/5 flex items-center px-3"><span className="w-14 h-2 bg-white/20 rounded"></span></div>
              </div>
              <div className="flex-1 p-6 bg-black/10">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="h-24 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-between">
                    <span className="w-16 h-2 bg-white/20 rounded"></span>
                    <span className="text-2xl font-bold text-cyan-400">12</span>
                  </div>
                  <div className="h-24 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-between">
                    <span className="w-16 h-2 bg-white/20 rounded"></span>
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <div className="h-24 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-between">
                    <span className="w-16 h-2 bg-white/20 rounded"></span>
                    <span className="text-2xl font-bold text-green-400">8</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-xl bg-white/5 border border-white/5 flex items-center px-4 gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10"></div>
                      <div className="flex-1 space-y-2">
                        <div className="w-32 h-2 bg-white/20 rounded"></div>
                        <div className="w-3/4 h-2 bg-white/10 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 mt-32">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-3">Feed Intelligence</h3>
              <p className="text-muted-foreground leading-relaxed">
                Connect your Discord servers and Telegram groups. We filter the noise and highlight the alpha you actually care about.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <Wallet className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-3">Wallet Memory</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track your wallets across chains. We remember your positions so you don't have to keep checking explorers.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-3">Content Brain</h3>
              <p className="text-muted-foreground leading-relaxed">
                Generate high-quality threads, recaps, and updates using your personal feed history as context.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-7xl mx-auto px-6 mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start for free, upgrade when you need more power.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="text-lg font-medium text-white mb-2">Free</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-muted-foreground">
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> 1 wallet</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> 2 communities</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> 7-day history</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> 5 AI drafts/month</li>
              </ul>
              <Button variant="outline" className="w-full">Get Started</Button>
            </div>
            
            <div className="p-8 rounded-2xl bg-card border border-primary/50 relative glow-indigo transform md:-translate-y-4">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-cyan-400 rounded-t-2xl"></div>
              <div className="text-lg font-medium text-primary mb-2">Pro</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$15</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-muted-foreground">
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> 3 wallets</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Unlimited communities</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> 90-day history</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Unlimited AI drafts</li>
              </ul>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white">Upgrade to Pro</Button>
            </div>
            
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="text-lg font-medium text-white mb-2">Builder</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$39</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-muted-foreground">
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Unlimited wallets</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Unlimited communities</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> Full history</li>
                <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> API access + Team sharing</li>
              </ul>
              <Button variant="outline" className="w-full">Contact Sales</Button>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-white/5 bg-black/40 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold text-white">Brainiac</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2026 Brainiac. Built on 0G.
          </div>
        </div>
      </footer>
    </div>
  );
}
