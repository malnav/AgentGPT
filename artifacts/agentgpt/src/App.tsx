import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WeatherCard } from "@/components/weather-card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { CardSettings } from "@/components/CardSettings";
import { useCardVisibility } from "@/hooks/use-card-visibility";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const CARDS = [
  { id: "weather", label: "Weather" },
  { id: "quick-notes", label: "Quick Notes" },
  { id: "activity", label: "Recent Activity" },
];

function Home() {
  const { visible, toggle } = useCardVisibility(CARDS.map((c) => c.id));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <CardSettings cards={CARDS} visible={visible} onToggle={toggle} />
        </div>

        {visible.weather && <WeatherCard />}

        {visible["quick-notes"] && (
          <CollapsibleCard
            id="quick-notes"
            title="Quick Notes"
            description="Jot down anything important"
          >
            <p className="text-sm text-muted-foreground">
              No notes yet. Start typing to add one.
            </p>
          </CollapsibleCard>
        )}

        {visible.activity && (
          <CollapsibleCard
            id="activity"
            title="Recent Activity"
            description="Your latest actions"
            defaultOpen={false}
          >
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          </CollapsibleCard>
        )}
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
