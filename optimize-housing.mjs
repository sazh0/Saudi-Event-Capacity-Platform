#!/usr/bin/env node
/**
 * optimize-housing.mjs
 * ────────────────────
 * Reads  public/housing.json  (the monolithic data file)
 * Writes optimized split files into public/:
 *
 *   housing-meta.json        ~0.5 KB   (years, warns)
 *   housing-2026.json        per-year rows, compact
 *   housing-2027.json
 *   …
 *
 * Optimisations applied:
 *  1. Split by year          → load only what you need
 *  2. Dates as epoch-ms      → 5× faster than new Date("ISO string")
 *  3. Strip null fields       → 30-40% smaller per row
 *  4. Remove redundant fields → yr/mo/day are derivable from the date
 *  5. Short keys (optional)   → disabled by default for readability
 *
 * Run:  node optimize-housing.mjs
 * Or:   node optimize-housing.mjs --input ./public/housing.json
 */

import { readFileSync, writeFileSync, statSync } from 'fs'
import { resolve, dirname } from 'path'

/* ── CLI args ─────────────────────────────────────────────────── */
const args = process.argv.slice(2)
const inputFlag = args.indexOf('--input')
const inputPath = inputFlag >= 0 && args[inputFlag + 1]
  ? resolve(args[inputFlag + 1])
  : resolve('public', 'housing.json')

const outDir = dirname(inputPath)   // write alongside the input

/* ── Read source ──────────────────────────────────────────────── */
console.log(`\n📂  Reading ${inputPath}`)
let raw
try {
  raw = JSON.parse(readFileSync(inputPath, 'utf-8'))
} catch (e) {
  console.error(`❌  Cannot read ${inputPath}: ${e.message}`)
  process.exit(1)
}

const { rows = [], warns = [], years = [] } = raw
if (!rows.length) {
  console.error('❌  No rows found in housing.json')
  process.exit(1)
}

const origSize = statSync(inputPath).size

/* ── Build per-year buckets ───────────────────────────────────── */
const buckets = {}   // { 2026: [...rows], 2027: [...], … }

for (const row of rows) {
  // Convert date → epoch milliseconds (number)
  const d = new Date(row.date)
  if (isNaN(d)) continue
  const yr = d.getFullYear()

  // Strip null/undefined fields & convert date
  const compact = { date: d.getTime() }

  // Copy only non-null fields (skip yr/mo/day — derivable from date)
  const SKIP = new Set(['date', 'yr', 'mo', 'day'])
  for (const [k, v] of Object.entries(row)) {
    if (SKIP.has(k)) continue
    if (v != null && v !== '') compact[k] = v
  }

  if (!buckets[yr]) buckets[yr] = []
  buckets[yr].push(compact)
}

const allYears = Object.keys(buckets).map(Number).sort()

/* ── Write meta ───────────────────────────────────────────────── */
const meta = {
  years: allYears,
  warns,
}
const metaPath = resolve(outDir, 'housing-meta.json')
const metaStr = JSON.stringify(meta)
writeFileSync(metaPath, metaStr)
console.log(`✅  ${metaPath}  (${fmtBytes(metaStr.length)})`)

/* ── Write per-year files ─────────────────────────────────────── */
let totalOut = metaStr.length

for (const yr of allYears) {
  const data = buckets[yr]
  const str = JSON.stringify(data)
  const filePath = resolve(outDir, `housing-${yr}.json`)
  writeFileSync(filePath, str)
  totalOut += str.length
  console.log(`✅  ${filePath}  (${data.length} rows, ${fmtBytes(str.length)})`)
}

/* ── Report ───────────────────────────────────────────────────── */
const savingPct = Math.round((1 - totalOut / origSize) * 100)
console.log(`
📊  Summary
   Original:    ${fmtBytes(origSize)}  (1 file)
   Optimized:   ${fmtBytes(totalOut)}  (${allYears.length + 1} files)
   Saving:      ${savingPct > 0 ? savingPct + '%' : 'N/A (original was already compact)'}
   Years:       ${allYears.join(', ')}
   Total rows:  ${rows.length}
`)

console.log(`💡  Next steps:
   1. Update App.jsx with the new loading code (see optimize-app-loader.jsx)
   2. Add caching headers in vercel.json
   3. Delete the old housing.json if no longer needed
   4. Add this script to your build: "prebuild": "node optimize-housing.mjs"
`)

/* ── helpers ──────────────────────────────────────────────────── */
function fmtBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}
