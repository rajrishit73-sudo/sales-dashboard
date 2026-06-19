/* ============================================================
   SalesScope — Sales & Revenue Analytics Dashboard
   Vanilla JS. Imports CSV/Excel/DB, computes KPIs, renders
   interactive charts with filters & slicers.
   ============================================================ */

const STATE = {
  raw: [],          // all parsed rows (normalized)
  filters: { region: new Set(), category: new Set(), segment: new Set(), from: null, to: null },
  granularity: 'month',
  charts: {},
  sort: { key: 'revenue', dir: -1 },
};

const REGIONS    = ['North', 'South', 'East', 'West', 'Central'];
const CATEGORIES = ['Electronics', 'Furniture', 'Apparel', 'Groceries', 'Office', 'Beauty'];
const SEGMENTS   = ['Consumer', 'Corporate', 'SMB'];
const PRODUCTS = {
  Electronics: ['Aura Laptop', 'Pulse Earbuds', 'Nova Monitor', 'Flux Router', 'Vibe Speaker'],
  Furniture:   ['Ergo Chair', 'Oak Desk', 'Loft Shelf', 'Calm Sofa'],
  Apparel:     ['Trail Jacket', 'Core Tee', 'Drift Sneakers', 'Linen Shirt'],
  Groceries:   ['Cold Brew Pack', 'Trail Mix', 'Olive Oil', 'Granola Box'],
  Office:      ['Gel Pens', 'Notebook Set', 'Stapler Pro', 'Paper Ream'],
  Beauty:      ['Glow Serum', 'Matte Balm', 'Silk Mask', 'Day Cream'],
};

const fmtMoney = n => '$' + Math.round(n).toLocaleString('en-US');
const fmtMoneyK = n => {
  if (Math.abs(n) >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
};
const fmtNum = n => Math.round(n).toLocaleString('en-US');
const fmtPct = n => (n>=0?'+':'') + n.toFixed(1) + '%';

/* ---------- Sample data generator ---------- */
function generateSample() {
  const rows = [];
  const start = new Date('2024-01-01');
  const days = 540; // ~18 months
  let orderId = 1000;
  for (let d = 0; d < days; d++) {
    const date = new Date(start); date.setDate(start.getDate() + d);
    const month = date.getMonth();
    // seasonality: holiday bump Nov/Dec, dip in summer
    const season = 1 + 0.35*Math.sin((month/12)*Math.PI*2 - 1) + (month===10||month===11?0.4:0);
    const growth = 1 + d/days*0.6; // upward trend
    const ordersToday = Math.max(1, Math.round((4 + Math.random()*6) * season));
    for (let o = 0; o < ordersToday; o++) {
      const category = CATEGORIES[(Math.random()*CATEGORIES.length)|0];
      const products = PRODUCTS[category];
      const product = products[(Math.random()*products.length)|0];
      const region = REGIONS[(Math.random()*REGIONS.length)|0];
      const segment = SEGMENTS[(Math.random()*SEGMENTS.length)|0];
      const basePrice = { Electronics:380, Furniture:260, Apparel:70, Groceries:25, Office:18, Beauty:42 }[category];
      const units = 1 + (Math.random()*6|0);
      const price = basePrice * (0.7 + Math.random()*0.8);
      const revenue = price * units * growth * (segment==='Corporate'?1.3:1);
      const cost = revenue * (0.52 + Math.random()*0.16);
      rows.push({
        order_id: 'ORD-' + (orderId++),
        date: date.toISOString().slice(0,10),
        region, category, product, segment,
        units,
        revenue: +revenue.toFixed(2),
        cost: +cost.toFixed(2),
      });
    }
  }
  return rows;
}

/* ---------- Normalization: map arbitrary columns to our schema ---------- */
function normalizeRows(rawRows) {
  if (!rawRows.length) return [];
  const keys = Object.keys(rawRows[0]);
  const find = (...cands) => keys.find(k => cands.some(c => k.toLowerCase().replace(/[\s_]/g,'').includes(c)));
  const kDate = find('date','orderdate','day');
  const kRev  = find('revenue','sales','amount','total');
  const kCost = find('cost','cogs');
  const kUnits= find('units','qty','quantity');
  const kRegion=find('region','area','territory');
  const kCat  = find('category','cat','department');
  const kProd = find('product','item','sku','name');
  const kSeg  = find('segment','customertype','channel');
  const kId   = find('orderid','order','id','invoice');

  return rawRows.map((r,i) => {
    const num = v => { const n = parseFloat(String(v ?? '').replace(/[$,]/g,'')); return isNaN(n)?0:n; };
    let date = r[kDate];
    if (date instanceof Date) date = date.toISOString().slice(0,10);
    else if (typeof date === 'number') { // excel serial
      const d = new Date(Date.UTC(1899,11,30) + date*864e5); date = d.toISOString().slice(0,10);
    } else if (date) {
      const d = new Date(date); date = isNaN(d)? String(date) : d.toISOString().slice(0,10);
    }
    return {
      order_id: kId ? String(r[kId]) : 'ROW-'+(i+1),
      date: date || '',
      region: kRegion ? String(r[kRegion]) : 'Unknown',
      category: kCat ? String(r[kCat]) : 'Unknown',
      product: kProd ? String(r[kProd]) : 'Unknown',
      segment: kSeg ? String(r[kSeg]) : 'All',
      units: kUnits ? num(r[kUnits]) : 1,
      revenue: kRev ? num(r[kRev]) : 0,
      cost: kCost ? num(r[kCost]) : 0,
    };
  }).filter(r => r.date);
}

/* ---------- Filtering ---------- */
function applyFilters() {
  const f = STATE.filters;
  return STATE.raw.filter(r => {
    if (f.region.size   && !f.region.has(r.region)) return false;
    if (f.category.size && !f.category.has(r.category)) return false;
    if (f.segment.size  && !f.segment.has(r.segment)) return false;
    if (f.from && r.date < f.from) return false;
    if (f.to   && r.date > f.to) return false;
    return true;
  });
}

/* ---------- Time bucketing ---------- */
function bucketKey(dateStr) {
  const [y,m,d] = dateStr.split('-');
  if (STATE.granularity === 'day') return dateStr;
  if (STATE.granularity === 'quarter') return `${y}-Q${Math.floor((+m-1)/3)+1}`;
  return `${y}-${m}`;
}
function bucketLabel(key) {
  if (STATE.granularity === 'day') return key.slice(5);
  if (STATE.granularity === 'quarter') return key;
  const [y,m] = key.split('-');
  return new Date(+y, +m-1).toLocaleString('en',{month:'short',year:'2-digit'});
}

/* ---------- KPI computation ---------- */
function computeKPIs(rows) {
  const revenue = rows.reduce((s,r)=>s+r.revenue,0);
  const cost    = rows.reduce((s,r)=>s+r.cost,0);
  const units   = rows.reduce((s,r)=>s+r.units,0);
  const orders  = new Set(rows.map(r=>r.order_id)).size || rows.length;
  const profit  = revenue - cost;
  const margin  = revenue ? (profit/revenue*100) : 0;
  const aov     = orders ? revenue/orders : 0;

  // period-over-period: compare latest bucket vs previous bucket
  const byBucket = {};
  rows.forEach(r => { const k = bucketKey(r.date); byBucket[k] = (byBucket[k]||0) + r.revenue; });
  const buckets = Object.keys(byBucket).sort();
  let delta = null;
  if (buckets.length >= 2) {
    const last = byBucket[buckets[buckets.length-1]];
    const prev = byBucket[buckets[buckets.length-2]];
    if (prev) delta = (last-prev)/prev*100;
  }
  return { revenue, profit, margin, units, orders, aov, delta };
}

/* ---------- Rendering ---------- */
function renderKPIs(k) {
  const cards = [
    { label:'Total Revenue', icon:'💰', value:fmtMoneyK(k.revenue), delta:k.delta, sub:`${fmtNum(k.orders)} orders` },
    { label:'Gross Profit',  icon:'📈', value:fmtMoneyK(k.profit), sub:`${k.margin.toFixed(1)}% margin` },
    { label:'Units Sold',    icon:'📦', value:fmtNum(k.units), sub:'across all products' },
    { label:'Avg Order Value', icon:'🧾', value:fmtMoney(k.aov), sub:'per order' },
    { label:'Profit Margin', icon:'🎯', value:k.margin.toFixed(1)+'%', sub:'revenue to profit' },
  ];
  document.getElementById('kpis').innerHTML = cards.map(c => `
    <div class="kpi">
      <div class="kpi-label">${c.icon} ${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      ${c.delta!=null ? `<div class="kpi-delta ${c.delta>=0?'up':'down'}">${c.delta>=0?'▲':'▼'} ${fmtPct(c.delta)} vs prev</div>`
                      : `<div class="kpi-spark">${c.sub}</div>`}
      ${c.delta!=null ? `<div class="kpi-spark">${c.sub}</div>` : ''}
    </div>`).join('');
}

const PALETTE = ['#6366f1','#22d3ee','#34d399','#fbbf24','#f87171','#a78bfa','#fb7185','#60a5fa'];
Chart.defaults.color = '#8b91c4';
Chart.defaults.font.family = "'Inter',sans-serif";
Chart.defaults.borderColor = 'rgba(38,44,84,.6)';

function destroy(name){ if(STATE.charts[name]){ STATE.charts[name].destroy(); delete STATE.charts[name]; } }

function renderTrend(rows) {
  const rev = {}, prof = {};
  rows.forEach(r => { const k=bucketKey(r.date); rev[k]=(rev[k]||0)+r.revenue; prof[k]=(prof[k]||0)+(r.revenue-r.cost); });
  const keys = Object.keys(rev).sort();
  const ctx = document.getElementById('trendChart');
  destroy('trend');
  const grad = ctx.getContext('2d').createLinearGradient(0,0,0,260);
  grad.addColorStop(0,'rgba(99,102,241,.45)'); grad.addColorStop(1,'rgba(99,102,241,0)');
  STATE.charts.trend = new Chart(ctx, {
    type:'line',
    data:{ labels: keys.map(bucketLabel), datasets:[
      { label:'Revenue', data:keys.map(k=>rev[k]), borderColor:'#6366f1', backgroundColor:grad, fill:true, tension:.35, borderWidth:2.5, pointRadius:0, pointHoverRadius:5 },
      { label:'Profit',  data:keys.map(k=>prof[k]), borderColor:'#34d399', backgroundColor:'transparent', fill:false, tension:.35, borderWidth:2, borderDash:[5,4], pointRadius:0, pointHoverRadius:5 },
    ]},
    options: baseOpts({ money:true, legend:true }),
  });
  document.getElementById('trendSub').textContent = `${keys.length} ${STATE.granularity}s`;
}

function renderCategory(rows) {
  const m={}; rows.forEach(r=>m[r.category]=(m[r.category]||0)+r.revenue);
  const entries = Object.entries(m).sort((a,b)=>b[1]-a[1]);
  destroy('category');
  STATE.charts.category = new Chart(document.getElementById('categoryChart'), {
    type:'doughnut',
    data:{ labels:entries.map(e=>e[0]), datasets:[{ data:entries.map(e=>e[1]), backgroundColor:PALETTE, borderColor:'#161a36', borderWidth:2 }]},
    options:{ responsive:true, maintainAspectRatio:false, cutout:'62%',
      plugins:{ legend:{ position:'right', labels:{ boxWidth:10, padding:10, font:{size:11} } },
        tooltip:{ callbacks:{ label:c=>` ${c.label}: ${fmtMoneyK(c.parsed)}` } } } },
  });
}

function renderRegion(rows) {
  const m={}; rows.forEach(r=>m[r.region]=(m[r.region]||0)+r.revenue);
  const entries = Object.entries(m).sort((a,b)=>b[1]-a[1]);
  destroy('region');
  STATE.charts.region = new Chart(document.getElementById('regionChart'), {
    type:'bar',
    data:{ labels:entries.map(e=>e[0]), datasets:[{ data:entries.map(e=>e[1]), backgroundColor:'#22d3ee', borderRadius:6, barThickness:'flex', maxBarThickness:36 }]},
    options: baseOpts({ money:true }),
  });
}

function renderProducts(rows) {
  const m={}; rows.forEach(r=>m[r.product]=(m[r.product]||0)+r.revenue);
  const entries = Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,10);
  destroy('product');
  STATE.charts.product = new Chart(document.getElementById('productChart'), {
    type:'bar',
    data:{ labels:entries.map(e=>e[0]), datasets:[{ data:entries.map(e=>e[1]), backgroundColor:entries.map((_,i)=>PALETTE[i%PALETTE.length]), borderRadius:6 }]},
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>` ${fmtMoneyK(c.parsed.x)}` } } },
      scales:{ x:{ grid:{display:true}, ticks:{ callback:v=>fmtMoneyK(v) } }, y:{ grid:{display:false} } } },
  });
}

function baseOpts({ money=false, legend=false } = {}) {
  return {
    responsive:true, maintainAspectRatio:false,
    interaction:{ mode:'index', intersect:false },
    plugins:{
      legend:{ display:legend, labels:{ boxWidth:10, padding:14, font:{size:11} } },
      tooltip:{ callbacks:{ label:c=>` ${c.dataset.label||''} ${money?fmtMoneyK(c.parsed.y):c.parsed.y}`.trim() } },
    },
    scales:{
      x:{ grid:{display:false}, ticks:{ maxRotation:0, autoSkipPadding:12 } },
      y:{ grid:{ color:'rgba(38,44,84,.5)' }, ticks:{ callback:v=>money?fmtMoneyK(v):v } },
    },
  };
}

/* ---------- Table ---------- */
function renderTable(rows) {
  const cols = [
    {k:'order_id', label:'Order'}, {k:'date', label:'Date'}, {k:'region', label:'Region'},
    {k:'category', label:'Category'}, {k:'product', label:'Product'}, {k:'segment', label:'Segment'},
    {k:'units', label:'Units', num:true}, {k:'revenue', label:'Revenue', num:true, money:true},
    {k:'cost', label:'Cost', num:true, money:true},
  ];
  const thead = document.querySelector('#dataTable thead');
  thead.innerHTML = '<tr>' + cols.map(c =>
    `<th data-k="${c.k}" class="${c.num?'num':''}">${c.label}${STATE.sort.key===c.k?(STATE.sort.dir<0?' ↓':' ↑'):''}</th>`).join('') + '</tr>';
  thead.querySelectorAll('th').forEach(th => th.onclick = () => {
    const k = th.dataset.k;
    if (STATE.sort.key===k) STATE.sort.dir*=-1; else { STATE.sort.key=k; STATE.sort.dir=-1; }
    renderTable(rows);
  });

  const sorted = [...rows].sort((a,b)=>{
    const k=STATE.sort.key, av=a[k], bv=b[k];
    if (typeof av==='number') return (av-bv)*STATE.sort.dir;
    return String(av).localeCompare(String(bv))*STATE.sort.dir;
  }).slice(0,200);

  document.querySelector('#dataTable tbody').innerHTML = sorted.map(r => `<tr>
    <td>${r.order_id}</td><td>${r.date}</td><td>${r.region}</td>
    <td>${r.category}</td><td>${r.product}</td><td><span class="pill">${r.segment}</span></td>
    <td class="num">${fmtNum(r.units)}</td><td class="num">${fmtMoney(r.revenue)}</td>
    <td class="num">${fmtMoney(r.cost)}</td></tr>`).join('');
  document.getElementById('tableSub').textContent = `${fmtNum(rows.length)} rows · showing top ${Math.min(200,rows.length)}`;
}

/* ---------- Slicers ---------- */
function buildSlicers() {
  const make = (id, values, set) => {
    const el = document.getElementById(id);
    el.innerHTML = values.map(v=>`<span class="chip ${set.has(v)?'on':''}" data-v="${v}">${v}</span>`).join('');
    el.querySelectorAll('.chip').forEach(chip => chip.onclick = () => {
      const v = chip.dataset.v;
      set.has(v) ? set.delete(v) : set.add(v);
      chip.classList.toggle('on');
      refresh();
    });
  };
  make('slicerRegion',   [...new Set(STATE.raw.map(r=>r.region))].sort(),   STATE.filters.region);
  make('slicerCategory', [...new Set(STATE.raw.map(r=>r.category))].sort(), STATE.filters.category);
  make('slicerSegment',  [...new Set(STATE.raw.map(r=>r.segment))].sort(),  STATE.filters.segment);

  const dates = STATE.raw.map(r=>r.date).sort();
  document.getElementById('dateFrom').value = dates[0]||'';
  document.getElementById('dateTo').value   = dates[dates.length-1]||'';
}

/* ---------- Master refresh ---------- */
function refresh() {
  const rows = applyFilters();
  if (!STATE.raw.length) return;
  renderKPIs(computeKPIs(rows));
  renderTrend(rows);
  renderCategory(rows);
  renderRegion(rows);
  renderProducts(rows);
  renderTable(rows);
  document.getElementById('subtitle').textContent =
    `${fmtNum(rows.length)} of ${fmtNum(STATE.raw.length)} transactions · ${activeFilterText()}`;
}
function activeFilterText() {
  const f = STATE.filters;
  const parts = [];
  if (f.region.size)   parts.push(`${f.region.size} region(s)`);
  if (f.category.size) parts.push(`${f.category.size} category(s)`);
  if (f.segment.size)  parts.push(`${f.segment.size} segment(s)`);
  return parts.length ? 'filtered by '+parts.join(', ') : 'no filters';
}

/* ---------- Data loading ---------- */
function loadData(rows, sourceLabel) {
  STATE.raw = rows;
  STATE.filters.region.clear(); STATE.filters.category.clear(); STATE.filters.segment.clear();
  STATE.filters.from = null; STATE.filters.to = null;
  buildSlicers();
  syncDateFilters();
  refresh();
  document.getElementById('srcStatus').textContent = `${sourceLabel} · ${fmtNum(rows.length)} rows`;
  toast(`Loaded ${fmtNum(rows.length)} rows from ${sourceLabel}`);
}
function syncDateFilters() {
  STATE.filters.from = document.getElementById('dateFrom').value || null;
  STATE.filters.to   = document.getElementById('dateTo').value || null;
}

function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let rows;
      if (ext === 'csv') {
        const wb = XLSX.read(e.target.result, { type:'string' });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw:true });
      } else {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type:'array', cellDates:true });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw:true });
      }
      const norm = normalizeRows(rows);
      if (!norm.length) return toast('No usable rows found — check the file has a date & revenue column');
      loadData(norm, file.name);
    } catch (err) { console.error(err); toast('Failed to parse file: '+err.message); }
  };
  ext === 'csv' ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
}

/* ---------- Export current view to CSV ---------- */
function exportView() {
  const rows = applyFilters();
  if (!rows.length) return toast('Nothing to export');
  const cols = ['order_id','date','region','category','product','segment','units','revenue','cost'];
  const csv = [cols.join(',')].concat(rows.map(r => cols.map(c => {
    const v = r[c]; return /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g,'""')}"` : v;
  }).join(','))).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'sales-view.csv'; a.click();
  URL.revokeObjectURL(a.href);
  toast(`Exported ${fmtNum(rows.length)} rows`);
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className='toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('show'), 2600);
}

/* ---------- Wiring ---------- */
document.getElementById('fileInput').addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
document.getElementById('loadSample').onclick = () => loadData(generateSample(), 'Sample dataset');
document.getElementById('resetFilters').onclick = () => {
  STATE.filters.region.clear(); STATE.filters.category.clear(); STATE.filters.segment.clear();
  buildSlicers(); syncDateFilters(); refresh();
};
document.getElementById('dateFrom').addEventListener('change', () => { syncDateFilters(); refresh(); });
document.getElementById('dateTo').addEventListener('change', () => { syncDateFilters(); refresh(); });
document.getElementById('exportBtn').onclick = exportView;

document.querySelectorAll('#granularity button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#granularity button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); STATE.granularity = b.dataset.g; refresh();
});

// DB modal (simulated query)
const dbModal = document.getElementById('dbModal');
document.getElementById('dbConnect').onclick = () => dbModal.hidden = false;
document.getElementById('dbCancel').onclick = () => dbModal.hidden = true;
document.getElementById('dbRun').onclick = () => {
  dbModal.hidden = true;
  toast('Querying database…');
  setTimeout(() => loadData(generateSample(), 'Database: sales_orders'), 700);
};

// boot with sample data so the dashboard is alive immediately
loadData(generateSample(), 'Sample dataset');
