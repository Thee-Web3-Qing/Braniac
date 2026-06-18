import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import FeedPage from "@/pages/FeedPage";
import WalletPage from "@/pages/WalletPage";
import BrainPage from "@/pages/BrainPage";
import AppLayout from "@/components/layout/AppLayout";

const queryClient = new QueryClient();

const PRIVY_APP_ID =
  (import.meta.env.VITE_PRIVY_APP_ID as string | undefined) ||
  "cmqird7xu001q0clehy0nua8b";

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true });

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard">
        <AppLayout><DashboardPage /></AppLayout>
      </Route>
      <Route path="/feed">
        <AppLayout><FeedPage /></AppLayout>
      </Route>
      <Route path="/wallet">
        <AppLayout><WalletPage /></AppLayout>
      </Route>
      <Route path="/brain">
        <AppLayout><BrainPage /></AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google", "twitter", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#6366f1",
          showWalletLoginFirst: false,
          walletChainType: "ethereum-and-solana",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App;
