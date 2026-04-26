import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Home() {
  const [chatInput, setChatInput] = useState("");
  const [result, setResult] = useState("Automation builder has been removed.");
  const profiles = [
    { name: "Alex", initials: "AL" },
    { name: "Jordan", initials: "JR" },
    { name: "Casey", initials: "CY" },
  ];
  const [activeProfileIndex, setActiveProfileIndex] = useState(0);
  const activeProfile = profiles[activeProfileIndex];

  const runInput = () => {
    const input = chatInput.trim();
    if (!input) {
      setResult("Type a message to continue.");
      return;
    }

    setResult(`Input received:\n${input}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">AgentGPT</h1>
        <p className="mt-1 text-sm text-slate-600">Automation builder UI has been removed from the frontend.</p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveProfileIndex((current) => (current + 1) % profiles.length)}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label={`Active profile ${activeProfile.name}. Click to change profile.`}
              title={`Profile: ${activeProfile.name} (click to change)`}
            >
              <Avatar className="h-9 w-9 border border-slate-300">
                <AvatarFallback className="bg-slate-200 text-xs font-semibold text-slate-700">
                  {activeProfile.initials}
                </AvatarFallback>
              </Avatar>
            </button>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  runInput();
                }
              }}
              placeholder={`Message as ${activeProfile.name}`}
            />
          </div>
          <pre className="mt-2 min-h-28 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{result}</pre>
        </div>
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
