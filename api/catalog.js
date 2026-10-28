let cache;
let pending;
async function pages(path) {
  const first = await fetchPage(path, 1);
  const rows = [...first.rows];
  // Two pages at a time avoids flooding the storefront.
  for (let page = 2; page <= first.pages; page += 2) {
    const batch = await Promise.all([page, page + 1].filter(p => p <= first.pages).map(p => fetchPage(path, p)));
    for (const result of batch) rows.push(...result.rows);
  }
  return rows;
}
async function fetchPage(path, page) {
  const response = await fetch(`https://dnsgolfoutlet.com/wp-json/${path}&per_page=100&page=${page}`, {signal: AbortSignal.timeout(45000)});
  if (!response.ok) throw Error('Could not load the complete product catalog. Please retry.');
  const rows = await response.json();
  const count = Number(response.headers.get('x-wp-totalpages'));
  if (!Array.isArray(rows) || !Number.isInteger(count) || count < 1) throw Error('The catalog returned incomplete pagination information.');
  return {rows, pages:count};
}
export async function loadCatalog(refresh) {
  if (!refresh && cache && Date.now() - cache.at < 300000) return cache.value;
  if (pending) return pending;
  pending = Promise.all([
    pages('wc/store/v1/products?stock_status=instock&_fields=id,name,permalink,sku,description,short_description,prices,categories,brands,is_in_stock'),
    pages('wp/v2/product?_fields=id,date'),
  ]).then(([products, dates]) => {
    const value = {products, dates:new Map(dates.map(p => [p.id, p.date.slice(0,10)]))};
    cache = {at:Date.now(), value}; return value;
  }).finally(() => {pending = null;});
  return pending;
}
export function newerProducts(catalog, audit) {
  const knownCategories = new Set(audit.categorySummary.map(c => c.category));
  return catalog.products.flatMap(p => {
    const postedDate = catalog.dates.get(p.id);
    if (!postedDate) throw Error('Some product listing dates are unavailable. Please retry the catalog audit.');
    if (!p.is_in_stock || postedDate <= audit.cutoffDate) return [];
    const categories = p.categories.map(c => c.name);
    const description = `${p.description} ${p.short_description}`.replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ');
    const lot = description.match(/\blot\s*[:#.-]?\s*([a-z0-9][a-z0-9/-]*)/i)?.[1] || '';
    const primaryCategory = categories.find(c => knownCategories.has(c)) || categories[0] || 'Uncategorized';
    return [{lot, sku:p.sku, product:p.name, primaryCategory, allCategories:categories.join(' | '), postedDate,
      ageDays:Math.floor((Date.parse(audit.auditDate)-Date.parse(postedDate))/86400000),
      currentPrice:p.prices.price === '' ? null : Number(p.prices.price)/10**p.prices.currency_minor_unit,
      productUrl:p.permalink, brands:(p.brands || []).map(b=>b.name).join(' | ')}];
  });
}
