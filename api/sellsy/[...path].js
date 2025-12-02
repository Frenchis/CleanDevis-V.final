export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { path } = req.query;
    const urlPath = Array.isArray(path) ? path.join('/') : path;
    const targetUrl = `https://api.sellsy.com/${urlPath}`;

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Proxy Error', details: error.message });
    }
}
