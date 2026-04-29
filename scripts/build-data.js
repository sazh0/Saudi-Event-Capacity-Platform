import { readFileSync, writeFileSync } from 'fs'
import { parseWorkbook } from '../src/parse.js'

/* ── Step 1: Parse Excel → rows (same as before) ──────────────── */
const buf = readFileSync('public/housing.xlsx')
const data = parseWorkbook(buf.buffer)
console.log(`✅ Parsed ${data.rows.length} rows from housing.xlsx`)

/* ── Step 2: Split by year & optimize ─────────────────────────── */
const buckets = {}

for (const row of data.rows) {
    const d = row.date
    if (!d || isNaN(d)) continue
    const yr = d.getFullYear()

    // Convert date to epoch-ms, strip null fields and derivable yr/mo/day
    const compact = { date: d.getTime() }
    const SKIP = new Set(['date', 'yr', 'mo', 'day'])
    for (const [k, v] of Object.entries(row)) {
        if (SKIP.has(k)) continue
        if (v != null && v !== '') compact[k] = v
    }

    if (!buckets[yr]) buckets[yr] = []
    buckets[yr].push(compact)
}

const allYears = Object.keys(buckets).map(Number).sort()

/* ── Step 3: Write meta + per-year files ──────────────────────── */
const meta = { years: allYears, warns: data.warns || [] }
writeFileSync('public/housing-meta.json', JSON.stringify(meta))
console.log(`✅ housing-meta.json (${allYears.length} years)`)

let totalKB = 0
for (const yr of allYears) {
    const str = JSON.stringify(buckets[yr])
    writeFileSync(`public/housing-${yr}.json`, str)
    totalKB += str.length / 1024
    console.log(`✅ housing-${yr}.json (${buckets[yr].length} rows, ${(str.length / 1024).toFixed(0)} KB)`)
}

console.log(`\n📊 Total: ${(totalKB).toFixed(0)} KB across ${allYears.length + 1} files`)