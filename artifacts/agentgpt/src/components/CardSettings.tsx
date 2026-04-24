import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

export interface CardDefinition {
  id: string;
  label: string;
}

interface CardSettingsProps {
  cards: CardDefinition[];
  visible: Record<string, boolean>;
  onToggle: (id: string) => void;
}

export function CardSettings({ cards, visible, onToggle }: CardSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Card settings">
          <Settings className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">Cards</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52">
        <p className="mb-3 text-sm font-medium">Show / hide cards</p>
        <div className="space-y-3">
          {cards.map(({ id, label }) => (
            <div key={id} className="flex items-center justify-between">
              <label
                htmlFor={`card-switch-${id}`}
                className="text-sm cursor-pointer select-none"
              >
                {label}
              </label>
              <Switch
                id={`card-switch-${id}`}
                checked={visible[id] ?? true}
                onCheckedChange={() => onToggle(id)}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
