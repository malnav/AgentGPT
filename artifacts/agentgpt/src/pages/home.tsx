import { CardSettings, type CardDefinition } from "@/components/CardSettings";
import { WeatherCard } from "@/components/WeatherCard";
import { QuoteCard } from "@/components/QuoteCard";
import { useCardVisibility } from "@/hooks/use-card-visibility";

const CARDS: CardDefinition[] = [
  { id: "weather", label: "Weather" },
  { id: "quote", label: "Quote" },
];

export default function HomePage() {
  const { visible, toggle } = useCardVisibility(CARDS.map((c) => c.id));

  const anyVisible = CARDS.some((c) => visible[c.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <CardSettings cards={CARDS} visible={visible} onToggle={toggle} />
        </div>

        {!anyVisible && (
          <p className="text-center text-sm text-muted-foreground py-16">
            All cards are hidden. Use the Cards button to show them.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.weather && <WeatherCard />}
          {visible.quote && <QuoteCard />}
        </div>
      </div>
    </div>
  );
}
