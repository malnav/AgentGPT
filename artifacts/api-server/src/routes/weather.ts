import { Router } from "express";

const router = Router();

const WMO_CONDITIONS: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Drizzle',
    55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy showers',
    85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
    96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

router.get('/weather', async (req, res) => {
    try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=16.0544&longitude=108.2022&current=temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature,weather_code,uv_index&wind_speed_unit=kmh&timezone=Asia%2FBangkok';
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) { res.status(r.status).json({ error: 'weather service error' }); return; }
        const d: any = await r.json();
        const c = d.current;
        const code: number = c.weather_code ?? 0;
        const result = {
            temp_c: Math.round(c.temperature_2m),
            feels_c: Math.round(c.apparent_temperature),
            humidity: c.relative_humidity_2m,
            wind_kmh: Math.round(c.wind_speed_10m),
            uv: Math.round(c.uv_index ?? 0),
            weather_code: code,
            condition: WMO_CONDITIONS[code] ?? 'Unknown',
        };
        res.set('Cache-Control', 'public, max-age=600');
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'fetch failed' });
    }
});

export default router;
