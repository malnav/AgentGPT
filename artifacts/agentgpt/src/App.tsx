import { useMemo, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

type StepType = "callProfile" | "inputMessage" | "wait" | "runCommand";

type Step = {
  id: number;
  type: StepType;
  value: string;
};

const queryClient = new QueryClient();

const stepLabels: Record<StepType, string> = {
  callProfile: "Call profile",
  inputMessage: "Input message",
  wait: "Wait (ms)",
  runCommand: "Run command"
};

function Home() {
  const [flowName, setFlowName] = useState("My automation");
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, type: "callProfile", value: "sales-assistant" },
    { id: 2, type: "inputMessage", value: "Hello, summarize today leads." }
  ]);

  const addStep = (type: StepType) => {
    setSteps((current) => {
      const nextId = current.length > 0 ? Math.max(...current.map((step) => step.id)) + 1 : 1;
      return [...current, { id: nextId, type, value: "" }];
    });
  };

  const updateStep = (id: number, update: Partial<Step>) => {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...update } : step)));
  };

  const removeStep = (id: number) => {
    setSteps((current) => current.filter((step) => step.id !== id));
  };

  const moveStep = (id: number, direction: -1 | 1) => {
    setSteps((current) => {
      const index = current.findIndex((step) => step.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const copy = [...current];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      return copy;
    });
  };

  const preview = useMemo(
    () =>
      JSON.stringify(
        {
          name: flowName,
          steps: steps.map((step) => {
            if (step.type === "callProfile") {
              return { type: step.type, profile: step.value };
            }
            if (step.type === "inputMessage") {
              return { type: step.type, message: step.value };
            }
            if (step.type === "wait") {
              return { type: step.type, ms: Number(step.value || 0) };
            }
            return { type: step.type, command: step.value };
          })
        },
        null,
        2
      ),
    [flowName, steps]
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Automation Builder</h1>
        <p className="mt-1 text-sm text-slate-600">
          Build your flow step-by-step: call profile, input message, wait, and keep adding more steps.
        </p>

        <label className="mt-6 block text-sm font-medium">Flow name</label>
        <input
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={flowName}
          onChange={(event) => setFlowName(event.target.value)}
          placeholder="Name your automation"
        />

        <div className="mt-6 space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Step {index + 1}</span>
                <select
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  value={step.type}
                  onChange={(event) => updateStep(step.id, { type: event.target.value as StepType, value: "" })}
                >
                  {Object.entries(stepLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveStep(step.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveStep(step.id, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                  onClick={() => removeStep(step.id)}
                >
                  Remove
                </button>
              </div>

              <input
                className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={step.value}
                type={step.type === "wait" ? "number" : "text"}
                onChange={(event) => updateStep(step.id, { value: event.target.value })}
                placeholder={
                  step.type === "callProfile"
                    ? "Profile name"
                    : step.type === "inputMessage"
                      ? "Message text"
                      : step.type === "wait"
                        ? "Milliseconds"
                        : "Command"
                }
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => addStep("callProfile")}>
            + Call profile
          </button>
          <button type="button" className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => addStep("inputMessage")}>
            + Input message
          </button>
          <button type="button" className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => addStep("wait")}>
            + Wait
          </button>
          <button type="button" className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => addStep("runCommand")}>
            + Run command
          </button>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold">Flow preview</h2>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{preview}</pre>
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
