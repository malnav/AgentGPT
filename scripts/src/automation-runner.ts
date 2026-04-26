import { readFile } from "node:fs/promises";
import path from "node:path";

type AutomationStep =
  | { type: "callProfile"; profile: string }
  | { type: "inputMessage"; message: string }
  | { type: "wait"; ms: number }
  | { type: "runCommand"; command: string };

type AutomationFlow = {
  name: string;
  steps: AutomationStep[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseFlow(raw: string): AutomationFlow {
  const parsed = JSON.parse(raw) as Partial<AutomationFlow>;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Automation file must be a JSON object.");
  }

  if (!parsed.name || typeof parsed.name !== "string") {
    throw new Error("Automation flow requires a string 'name'.");
  }

  if (!Array.isArray(parsed.steps)) {
    throw new Error("Automation flow requires a 'steps' array.");
  }

  for (const [index, step] of parsed.steps.entries()) {
    if (!step || typeof step !== "object" || !("type" in step)) {
      throw new Error(`Invalid step at index ${index}.`);
    }
  }

  return parsed as AutomationFlow;
}

async function runStep(step: AutomationStep, index: number): Promise<void> {
  const label = `Step ${index + 1}`;

  switch (step.type) {
    case "callProfile":
      console.log(`${label}: call profile -> ${step.profile}`);
      return;
    case "inputMessage":
      console.log(`${label}: input message -> ${step.message}`);
      return;
    case "wait":
      console.log(`${label}: wait ${step.ms}ms`);
      await sleep(step.ms);
      return;
    case "runCommand":
      console.log(`${label}: run command -> ${step.command}`);
      return;
    default: {
      const exhaustiveness: never = step;
      throw new Error(`Unsupported step: ${JSON.stringify(exhaustiveness)}`);
    }
  }
}

async function main() {
  const file = process.argv[2];

  if (!file) {
    throw new Error("Usage: pnpm --filter @workspace/scripts run automation <path-to-flow.json>");
  }

  const absolutePath = path.resolve(process.cwd(), file);
  const content = await readFile(absolutePath, "utf-8");
  const flow = parseFlow(content);

  console.log(`Running automation flow: ${flow.name}`);

  for (const [index, step] of flow.steps.entries()) {
    await runStep(step, index);
  }

  console.log(`Completed ${flow.steps.length} steps.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exitCode = 1;
});
