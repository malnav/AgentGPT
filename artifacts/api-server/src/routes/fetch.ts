import { Router } from "express";

const router = Router();

router.get('/api/fetch-url', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url parameter is required' });
    }
    try {
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(15000),
        });
        const html = await resp.text();
        res.json({ html, status: resp.status });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Fetch failed' });
    }
});

export default router;
