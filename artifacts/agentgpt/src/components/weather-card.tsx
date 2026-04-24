import { useQuery } from "@tanstack/react-query"
import { Cloud, Droplets, Thermometer, Wind, Sun, AlertCircle } from "lucide-react"
import { CollapsibleCard } from "@/components/ui/collapsible-card"
import { Skeleton } from "@/components/ui/skeleton"

interface WeatherData {
  temp_c: number
  feels_c: number
  humidity: number
  wind_kmh: number
  uv: number
  weather_code: number
  condition: string
}

const WMO_ICONS: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "❄️", 75: "❄️", 77: "🌨️",
  80: "🌦️", 81: "🌦️", 82: "⛈️",
  85: "🌨️", 86: "❄️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
}

async function fetchWeather(): Promise<WeatherData> {
  const res = await fetch("/api/weather")
  if (!res.ok) throw new Error("Failed to fetch weather")
  return res.json()
}

export function WeatherCard() {
  const { data, isLoading, isError } = useQuery<WeatherData>({
    queryKey: ["weather"],
    queryFn: fetchWeather,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })

  return (
    <CollapsibleCard
      id="weather"
      title="Weather"
      description="Da Nang, Vietnam"
    >
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-32" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Unable to load weather data.</span>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{WMO_ICONS[data.weather_code] ?? "🌡️"}</span>
            <div>
              <p className="text-4xl font-bold tracking-tight">{data.temp_c}°C</p>
              <p className="text-sm text-muted-foreground">{data.condition}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat icon={<Thermometer className="h-4 w-4" />} label="Feels like" value={`${data.feels_c}°C`} />
            <Stat icon={<Droplets className="h-4 w-4" />} label="Humidity" value={`${data.humidity}%`} />
            <Stat icon={<Wind className="h-4 w-4" />} label="Wind" value={`${data.wind_kmh} km/h`} />
            <Stat icon={<Sun className="h-4 w-4" />} label="UV index" value={String(data.uv)} />
          </div>
        </div>
      )}
    </CollapsibleCard>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}
