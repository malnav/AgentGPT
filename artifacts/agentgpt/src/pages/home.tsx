import { useState } from "react";
import { X, Zap, GitBranch, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const WIDGET_HIDDEN_KEY = "agentgpt_widget_hidden";

function useWidgetVisibility() {
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(WIDGET_HIDDEN_KEY) === "true";
    } catch {
      return false;
    }
  });

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(WIDGET_HIDDEN_KEY, "true");
    } catch {
      /* ignore */
    }
  };

  const show = () => {
    setHidden(false);
    try {
      localStorage.removeItem(WIDGET_HIDDEN_KEY);
    } catch {
      /* ignore */
    }
  };

  return { hidden, hide, show };
}

function GettingStartedWidget({ onHide }: { onHide: () => void }) {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Getting Started</CardTitle>
          <CardDescription className="mt-1">
            Run autonomous AI agents to complete complex tasks for you.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 -mr-1 -mt-1"
          onClick={onHide}
          aria-label="Hide widget"
        >
          <X />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Describe your goal</p>
            <p className="text-sm text-muted-foreground">
              Tell the agent what you want to achieve in plain language.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Agent plans and executes</p>
            <p className="text-sm text-muted-foreground">
              The agent breaks the goal into steps and runs them autonomously.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Review and iterate</p>
            <p className="text-sm text-muted-foreground">
              Watch progress in real time and guide the agent with follow-ups.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { hidden, hide, show } = useWidgetVisibility();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-background p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">AgentGPT</h1>
        <p className="mt-2 text-muted-foreground">
          Assemble, configure, and deploy autonomous AI agents in your browser.
        </p>
      </div>

      {!hidden && <GettingStartedWidget onHide={hide} />}

      {hidden && (
        <Button variant="outline" size="sm" onClick={show}>
          Show getting started
        </Button>
      )}
    </div>
  );
}
