# SalesScope — Sales & Revenue Analytics Dashboard

An interactive, zero-build dashboard for analyzing sales and revenue data. Open it in a browser and start exploring — no server or install required.

## Run it

```bash
cd sales-dashboard
# Option A: just open the file
open index.html
# Option B (recommended, avoids any browser file restrictions):
python3 -m http.server 8000   # then visit http://localhost:8000
```

It boots with a generated **sample dataset** (~18 months of orders) so every chart is populated immediately.

## Features

**Data import**
- **CSV** and **Excel** (`.xlsx`/`.xls`) via the *Import* button — parsing by [SheetJS](https://sheetjs.com).
- **Database**: *Connect database…* opens a connection dialog and streams query results into the dashboard (simulated in this demo; wire it to a real API endpoint in `dbRun`).
- Columns are **auto-mapped** — it fuzzy-matches headers like `sales/amount/total → revenue`, `qty/quantity → units`, `order date → date`, etc. Try the included `sample-sales.csv`.

**KPIs** — Total Revenue (with period-over-period delta), Gross Profit, Units Sold, Average Order Value, Profit Margin.

**Visualizations** (Chart.js)
- Revenue + Profit **trend line** with Day / Month / Quarter granularity toggle
- Revenue **by category** (doughnut)
- **Region performance** (bar)
- **Top 10 products** by revenue (horizontal bar)
- Sortable **transaction detail** table

**Filters & slicers** — date range + multi-select Region / Category / Segment chips. Every chart, KPI and the table recompute live. *Export view* downloads the currently filtered rows as CSV.

## Expected data schema

Any of these columns are recognized (case/spacing-insensitive); missing ones get sensible defaults:

| field | aliases matched |
|-------|-----------------|
| date | date, order date, day |
| revenue | revenue, sales, amount, total |
| cost | cost, cogs |
| units | units, qty, quantity |
| region | region, area, territory |
| category | category, department |
| product | product, item, sku, name |
| segment | segment, customer type, channel |
| order_id | order id, invoice, id |

## Files
- `index.html` — layout
- `styles.css` — dark analytics theme
- `app.js` — data loading, normalization, KPIs, charts, filters
- `sample-sales.csv` — 835-row sample you can import to test the pipeline
