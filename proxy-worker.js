/**
 * Yahoo Finance CORS proxy — deploy this as a separate Cloudflare Worker
 * Named e.g. "yf-proxy" so it lives at yf-proxy.sagemediaco.workers.dev
 *
 * Usage: GET /proxy?url=<encoded Yahoo Finance URL>
 */
export default {
  async fetch(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    const url = new URL(request.url)

    // Health check
    if (url.pathname === '/') {
      return new Response('Yahoo Finance proxy OK', { status: 200 })
    }

    if (url.pathname !== '/proxy') {
      return new Response('Not found', { status: 404 })
    }

    const target = url.searchParams.get('url')
    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400 })
    }

    // Safety: only allow Yahoo Finance domains
    let targetUrl
    try {
      targetUrl = new URL(target)
    } catch {
      return new Response('Invalid URL', { status: 400 })
    }
    const allowedHosts = ['finance.yahoo.com', 'alphavantage.co', 'www.alphavantage.co']
    if (!allowedHosts.some(h => targetUrl.hostname === h || targetUrl.hostname.endsWith('.' + h))) {
      return new Response('Host not allowed', { status: 403 })
    }

    // Proxy the request with a browser-like User-Agent so Yahoo doesn't block it
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
    })

    const body = await upstream.arrayBuffer()

    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'no-store',
      },
    })
  },
}
