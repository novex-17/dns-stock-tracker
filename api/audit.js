import {loadCatalog, newerProducts} from './catalog.js';
// Retain the original six-month audit; supplement newer in-stock listings.
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.statusCode = 405; return res.end('Method not allowed'); }
  try {
    const refresh = new URL(req.url, 'http://localhost').searchParams.get('refresh') === '1';
    const upstream = await fetch('https://dns-website-stock.vercel.app/api/audit' + (refresh ? '?refresh=1' : ''), {signal: AbortSignal.timeout(180000)});
    if (!upstream.ok) throw new Error('The catalog service could not complete the audit. Please try again.');
    const data = await upstream.json();
    if (!data.summary || !Array.isArray(data.agedProducts)) throw new Error('The catalog service returned an unexpected response.');
    const catalog = await loadCatalog(refresh);
    data.reviewProducts = [...data.agedProducts, ...newerProducts(catalog, data)];
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: error.name === 'TimeoutError' ? 'The catalog took too long to respond. Please try again.' : error.message}));
  }
}
