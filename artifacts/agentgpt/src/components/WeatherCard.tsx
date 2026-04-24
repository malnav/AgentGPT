import {
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { useGetWeather } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function WeatherIcon({ code }: { code: number }) {
  if (code === 0 || code === 1) return <Sun className="h-8 w-8 text-yellow-400" />;
  if (code <= 3) return <Cloud className="h-8 w-8 text-gray-400" />;
  if (code <= 48) return <Cloud className="h-8 w-8 text-gray-500" />;
  if (code <= 55) return <CloudDrizzle className="h-8 w-8 text-blue-400" />;
  if (code <= 65) return <CloudRain className="h-8 w-8 text-blue-500" />;
  if (code <= 77) return <CloudSnow className="h-8 w-8 text-blue-200" />;
  if (code <= 82) return <CloudRain className="h-8 w-8 text-blue-600" />;
  if (code <= 86) return <CloudSnow className="h-8 w-8 text-blue-300" />;
  return <CloudLightning className="h-8 w-8 text-yellow-500" />;
}

export function WeatherCard() {
  const { data, isLoading, isError } = useGetWeather();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Weather
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">Failed to load weather.</p>
        )}
        {data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <WeatherIcon code={data.weather_code} />
              <div>
                <p className="text-3xl font-bold">{data.temp_c}°C</p>
                <p className="text-sm text-muted-foreground">{data.condition}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span>Feels {data.feels_c}°</span>
              </div>
              <div className="flex items-center gap-1">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span>{data.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="h-4 w-4 text-muted-foreground" />
                <span>{data.wind_kmh} km/h</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
