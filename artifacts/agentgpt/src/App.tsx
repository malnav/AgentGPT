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

type Automation = {
  id: number;
  name: string;
  steps: Step[];
};

const queryClient = new QueryClient();

const stepLabels: Record<StepType, string> = {
  callProfile: "Call profile",
  inputMessage: "Input message",
  wait: "Wait (ms)",
  runCommand: "Run command"
};

const defaultSteps: Step[] = [
  { id: 1, type: "callProfile", value: "sales-assistant" },
  { id: 2, type: "inputMessage", value: "Hello, summarize today leads." }
];

function Home() {
  const [flowName, setFlowName] = useState("My automation");
  const [steps, setSteps] = useState<Step[]>(defaultSteps);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [selectedAutomationId, setSelectedAutomationId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [invokeResult, setInvokeResult] = useState("Use /automation-name in the box below to run one from any input.");

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

  const resetEditor = () => {
    setFlowName("My automation");
    setSteps(defaultSteps);
    setSelectedAutomationId(null);
  };

  const saveAutomation = () => {
    const trimmedName = flowName.trim();
    if (!trimmedName) {
      setInvokeResult("Automation name is required before saving.");
      return;
    }

    if (selectedAutomationId === null) {
      setAutomations((current) => {
        const nextId = current.length > 0 ? Math.max(...current.map((item) => item.id)) + 1 : 1;
        return [...current, { id: nextId, name: trimmedName, steps }];
      });
      setInvokeResult(`Created automation \"${trimmedName}\".`);
      return;
    }

    setAutomations((current) =>
      current.map((item) => (item.id === selectedAutomationId ? { ...item, name: trimmedName, steps } : item))
    );
    setInvokeResult(`Updated automation \"${trimmedName}\".`);
  };

  const loadAutomation = (automationId: number) => {
    const automation = automations.find((item) => item.id === automationId);
    if (!automation) return;

    setSelectedAutomationId(automation.id);
    setFlowName(automation.name);
    setSteps(automation.steps);
  };

  const duplicateAutomation = (automationId: number) => {
    setAutomations((current) => {
      const automation = current.find((item) => item.id === automationId);
      if (!automation) return current;

      const nextId = current.length > 0 ? Math.max(...current.map((item) => item.id)) + 1 : 1;
      return [...current, { ...automation, id: nextId, name: `${automation.name}-copy` }];
    });
  };

  const deleteAutomation = (automationId: number) => {
    setAutomations((current) => current.filter((item) => item.id !== automationId));
    if (selectedAutomationId === automationId) {
      resetEditor();
    }
  };

  const runInput = () => {
    const input = chatInput.trim();
    if (!input.startsWith("/")) {
      setInvokeResult("No automation call found. Prefix with /automation-name to invoke.");
      return;
    }

    const token = input.slice(1).split(/\s+/)[0]?.trim().toLowerCase();
    const automation = automations.find((item) => item.name.trim().toLowerCase().replace(/\s+/g, "-") === token);

    if (!automation) {
      setInvokeResult(`Automation \"${token}\" not found. Available: ${automations.map((item) => `/${item.name.replace(/\s+/g, "-")}`).join(", ") || "none"}.`);
      return;
    }

    const payload = JSON.stringify(
      {
        invokedBy: input,
        automation: automation.name,
        steps: automation.steps.map((step) => {
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
    );

    setInvokeResult(`Automation triggered from input:\n${payload}`);
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
      <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Automation Builder</h1>
        <p className="mt-1 text-sm text-slate-600">
          CRUD your automations and trigger them from any input using slash format (example: /my-automation).
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <label className="block text-sm font-medium">Flow name</label>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={flowName}
              onChange={(event) => setFlowName(event.target.value)}
              placeholder="Name your automation"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={saveAutomation}>
                {selectedAutomationId === null ? "Create automation" : "Update automation"}
              </button>
              <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={resetEditor}>
                New draft
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-semibold">Automation list (CRUD)</h2>
            <div className="mt-3 space-y-2">
              {automations.length === 0 ? (
                <p className="text-xs text-slate-500">No automations yet.</p>
              ) : (
                automations.map((automation) => (
                  <div key={automation.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{automation.name}</p>
                      <p className="text-xs text-slate-500">/{automation.name.replace(/\s+/g, "-")}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        onClick={() => loadAutomation(automation.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        onClick={() => duplicateAutomation(automation.id)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                        onClick={() => deleteAutomation(automation.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

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

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold">Flow preview</h2>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{preview}</pre>
          </div>

          <div>
            <h2 className="text-sm font-semibold">Invoke from any input (/)</h2>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Try: /my-automation run this for customer A"
            />
            <button type="button" className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={runInput}>
              Parse and trigger
            </button>
            <pre className="mt-2 min-h-44 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{invokeResult}</pre>
          </div>
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
