/**
 * generate-executive.js
 * ─────────────────────────────────────────────────────────────────
 * Reads S3 - BI Data (supply) and D3 - BI Data (demand) sheets
 * from two separate xlsx files, filters for years 2026–2030,
 * merges by date, and writes split per-year JSON files + meta.
 *
 * Output (split-by-year, same pattern as build-data.js):
 *   public/executive-meta.json          { years, warns }
 *   public/executive-2026.json          [ ...daily rows ]
 *   public/executive-2027.json
 *   ...
 *   public/executive-yearly.json        { 2026:{…}, 2027:{…}, … }
 *
 * Usage:
 *   node scripts/generate-executive.js \
 *     public/supply.xlsx \
 *     public/demand.xlsx \
 *     public/                           ← output directory
 *
 * Defaults: public/Supply Sheet.xlsx  public/Demand Sheet.xlsx  public/
 * ─────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync } from 'fs'
import * as XLSX from 'xlsx'

/* ── target years ─────────────────────────────────────────────── */
const TARGET_YEARS = new Set([2026, 2027, 2028, 2029, 2030])

/* ── safe numeric coerce ──────────────────────────────────────── */
const nn = v => (v == null || v === '' || (typeof v === 'string' && v.trim() === '') || isNaN(Number(v)) ? 0 : Number(v))

/* ── parse date from xlsx cell ────────────────────────────────── */
function toDate(cell) {
  if (!cell) return null
  if (cell instanceof Date) return isNaN(cell) ? null : cell
  if (typeof cell === 'number') {
    const d = new Date((cell - 25569) * 86400000)
    return isNaN(d) ? null : d
  }
  const d = new Date(cell)
  return isNaN(d) ? null : d
}

/* ── read a sheet as array-of-arrays ──────────────────────────── */
function readRows(filePath, sheetName) {
  const buf = readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false })
  const ws = wb.Sheets[sheetName]
  if (!ws) {
    const available = Object.keys(wb.Sheets).join(', ')
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}.\nAvailable: ${available}`)
  }
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
}

/* ══════════════════════════════════════════════════════════════
   S3 — SUPPLY  (all 44 columns, 0-indexed)
   ──────────────────────────────────────────────────────────────
   Col 0  : Date (Gregorian)
   Col 1  : Jeddah Airport T1                                   pax/day
   Col 2  : Jeddah Airport T1 + North Hall                      pax/day
   Col 3  : Jeddah Airport T1 + North + Hajj Hall               pax/day
   Col 4  : Makkah Accommodation                                beds/day
   Col 5  : Makkah Future Accommodation Projects                beds/day
   Col 6  : Makkah Hajj Pilgrim Housing                         beds/day
   Col 7  : Madinah Accommodation                               beds/day
   Col 8  : Madinah Future Accommodation Projects                beds/day
   Col 9  : Madinah Hajj Pilgrim Housing                         beds/day
   Col 10 : Masaa (Sa'i) Capacity                               worshippers/day
   Col 11 : Mataf (Tawaf) Capacity                              worshippers/day
   Col 12 : Makkah Grand Mosque Prayer Capacity                 worshippers/day
   Col 13 : Madinah Prophet's Mosque Prayer Capacity             worshippers/prayer
   Col 14 : Madinah Airport (international terminal)             pax/day
   Col 15 : Taif Airport (international terminal)                pax/day
   Col 16 : Yanbu Airport (international terminal)               pax/day
   Col 17 : Makkah Water                                        persons
   Col 18 : Madinah Water                                       persons
   Col 19 : Makkah Health Sector (non-Hajj beds)                beds/day
   Col 20 : Hajj Area Health Sector                              beds/day
   Col 21 : Madinah Health Sector                                beds/day
   Col 22 : Makkah Energy Generation Capacity                   MW·h
   Col 23 : Madinah Energy Generation Capacity                  MW·h
   Col 24 : Makkah Energy (persons served)                      persons
   Col 25 : Madinah Energy (persons served)                     persons
   Col 26 : Makkah Telecom Network Capacity                     persons/day
   Col 27 : Madinah Telecom Network Capacity                    persons/day
   Col 28 : Salwa Land Border                                   persons/day
   Col 29 : Makkah Telecom (serviceable persons)                persons/day
   Col 30 : Madinah Telecom (serviceable persons)               persons/day
   Col 31 : King Fahd Causeway                                  persons/day
   Col 32 : Al Batha                                            persons/day
   Col 33 : Al Haditha                                          persons/day
   Col 34 : Al Khadra                                           persons/day
   Col 35 : Al Khafji                                           persons/day
   Col 36 : Al Durrah                                           persons/day
   Col 37 : Empty Quarter (Rub' al-Khali)                       persons/day
   Col 38 : Al Ruqi                                             persons/day
   Col 39 : Al Tuwal                                            persons/day
   Col 40 : Al Wadiah                                           persons/day
   Col 41 : Jadidat Arar                                        persons/day
   Col 42 : Halat Ammar                                         persons/day
   Col 43 : Alb                                                 persons/day
══════════════════════════════════════════════════════════════ */
function processS3(rows) {
  const [, ...data] = rows          // skip header row
  const result = []

  for (const r of data) {
    const date = toDate(r[0])
    if (!date) continue
    const year = date.getFullYear()
    if (!TARGET_YEARS.has(year)) continue

    result.push({
      date: date.getTime(),          // epoch-ms (compact, like build-data.js)
      year,
      supply: {
        // Airports
        jeddahAirport: nn(r[3]),
        // Makkah Accommodation
        makkahAccommodation: nn(r[4]),
        // Madinah Accommodation
        madinahAccommodation: nn(r[7]),
        // Religious
        masaa: nn(r[10]),
        mataf: nn(r[11]),
        makkahPrayer: nn(r[12]),
        madinahPrayer: nn(r[13]),
        // Airports (regional)
        madinahAirport: nn(r[14]),
        taifAirport: nn(r[15]),
        yanbuAirport: nn(r[16]),
        // Water
        makkahWater: nn(r[17]),
        madinahWater: nn(r[18]),
        // Health
        //
        //
        // Energy
        makkahEnergy: nn(r[24]),
        madinahEnergy: nn(r[25]),
        // Telecom (network capacity)
        makkahTelecom: nn(r[26]),
        madinahTelecom: nn(r[27]),
        // Land Borders
        salwa: nn(r[28]),
        // Telecom (serviceable)
        makkahTelecomSvc: nn(r[29]),
        madinahTelecomSvc: nn(r[30]),
        // Land Borders (remaining)
        kingFahdCauseway: nn(r[31]),
        alBatha: nn(r[32]),
        alHaditha: nn(r[33]),
        alKhadra: nn(r[34]),
        alKhafji: nn(r[35]),
        alDurrah: nn(r[36]),
        emptyQuarter: nn(r[37]),
        alRuqi: nn(r[38]),
        alTuwal: nn(r[39]),
        alWadiah: nn(r[40]),
        jadidatArar: nn(r[41]),
        halatAmmar: nn(r[42]),
        alb: nn(r[43]),
      },
    })
  }
  return result
}

/* ══════════════════════════════════════════════════════════════
   D3 — DEMAND  (column positions correspond to D3 - BI Data)
   (unchanged from original)
══════════════════════════════════════════════════════════════ */
function processD3(rows) {
  const [, ...data] = rows
  const result = []

  for (const r of data) {
    const date = toDate(r[0])
    if (!date) continue
    const year = date.getFullYear()
    if (!TARGET_YEARS.has(year)) continue

    result.push({
      date: date.getTime(),          // epoch-ms
      year,
      demand: {
        // Accommodation
        makkahAccommodation: nn(r[7]),
        madinahAccommodation: nn(r[11]),
        // Religious
        makkahPrayer: nn(r[14]),
        madinahPrayer: nn(r[12]),
        masaa: nn(r[13]),
        mataf: nn(r[17]),
        // Airports
        jeddahAirport: nn(r[15]),
        madinahAirport: nn(r[16]),
        taifAirport: nn(r[48]) + nn(r[49]) + nn(r[50]),
        yanbuAirport: nn(r[51]) + nn(r[52]) + nn(r[53]),
        // Water
        makkahWater: nn(r[24]) + nn(r[25]) + nn(r[26]) + nn(r[27]),
        madinahWater: nn(r[28]) + nn(r[29]) + nn(r[30]) + nn(r[31]),
        // Energy
        makkahEnergy: nn(r[44]) + nn(r[46]),
        madinahEnergy: nn(r[45]) + nn(r[47]),
        // Telecom
        makkahTelecom: nn(r[59]) + nn(r[60]) + nn(r[61]) + nn(r[62]),
        madinahTelecom: nn(r[63]) + nn(r[64]) + nn(r[65]),
        // Land Borders
        kingFahdCauseway: nn(r[54]) + nn(r[55]),
        salwa: nn(r[56]) + nn(r[57]),
        alBatha: nn(r[74]) + nn(r[75]),
        alHaditha: nn(r[76]) + nn(r[77]),
        alKhadra: nn(r[78]) + nn(r[79]),
        alKhafji: nn(r[80]) + nn(r[81]),
        alDurrah: nn(r[82]) + nn(r[83]),
        emptyQuarter: nn(r[84]) + nn(r[85]),
        alRuqi: nn(r[86]) + nn(r[87]),
        alWadiah: nn(r[90]) + nn(r[91]),
        jadidatArar: nn(r[92]) + nn(r[93]),
        halatAmmar: nn(r[94]) + nn(r[95]),
      },
    })
  }
  return result
}

/* ── merge S3 + D3 by date ────────────────────────────────────── */
function mergeByDate(s3Data, d3Data) {
  const d3Map = new Map(d3Data.map(r => [r.date, r.demand]))
  return s3Data.map(r => ({
    date: r.date,
    year: r.year,
    supply: r.supply,
    demand: d3Map.get(r.date) ?? {},
  }))
}

/* ── aggregate rows → yearly averages ─────────────────────────── */
function aggregateByYear(rows) {
  const acc = {}

  for (const r of rows) {
    if (!acc[r.year]) acc[r.year] = { count: 0, supply: {}, demand: {} }
    const a = acc[r.year]
    a.count++
    for (const [k, v] of Object.entries(r.supply))
      a.supply[k] = (a.supply[k] ?? 0) + v
    for (const [k, v] of Object.entries(r.demand))
      a.demand[k] = (a.demand[k] ?? 0) + v
  }

  const yearly = {}
  for (const [yr, a] of Object.entries(acc)) {
    const n = a.count
    yearly[yr] = {
      daysInSample: n,
      supply: Object.fromEntries(Object.entries(a.supply).map(([k, v]) => [k, Math.round(v / n)])),
      demand: Object.fromEntries(Object.entries(a.demand).map(([k, v]) => [k, Math.round(v / n)])),
    }
  }
  return yearly
}

/* ── strip null/zero fields for compact output (like build-data.js) ── */
function compact(row) {
  const out = { date: row.date }
  const SKIP = new Set(['date', 'year'])
  for (const [k, v] of Object.entries(row)) {
    if (SKIP.has(k)) continue
    if (v != null && v !== '' && typeof v !== 'object') out[k] = v
    if (typeof v === 'object' && v !== null) {
      const sub = {}
      for (const [sk, sv] of Object.entries(v)) {
        if (sv != null && sv !== 0) sub[sk] = sv
      }
      if (Object.keys(sub).length) out[k] = sub
    }
  }
  return out
}

/* ══════════════════════════════════════════════════════════════
   MAIN — split-by-year output (same pattern as build-data.js)
══════════════════════════════════════════════════════════════ */
const [, , supplyPath = 'public/Supply Sheet.xlsx',
  demandPath = 'public/Demand Sheet.xlsx',
  outDir = 'public/'] = process.argv

const prefix = outDir.endsWith('/') ? outDir : outDir + '/'

console.log(`📂 Supply : ${supplyPath}`)
console.log(`📂 Demand : ${demandPath}`)
console.log(`📤 Output : ${prefix}executive-*.json`)

const s3Rows = readRows(supplyPath, 'S3 - BI Data')
const d3Rows = readRows(demandPath, 'D3 - BI Data')

console.log(`   S3 rows read : ${s3Rows.length - 1}`)
console.log(`   D3 rows read : ${d3Rows.length - 1}`)

const s3Data = processS3(s3Rows)
const d3Data = processD3(d3Rows)
const merged = mergeByDate(s3Data, d3Data)
const yearly = aggregateByYear(merged)

/* ── Step 1: Split by year (like build-data.js) ───────────────── */
const buckets = {}
for (const row of merged) {
  if (!buckets[row.year]) buckets[row.year] = []
  buckets[row.year].push(compact(row))
}

const allYears = Object.keys(buckets).map(Number).sort()

/* ── Step 2: Write meta file ──────────────────────────────────── */
const meta = { years: allYears, supplyKeys: Object.keys(merged[0]?.supply ?? {}), demandKeys: Object.keys(merged[0]?.demand ?? {}) }
writeFileSync(`${prefix}executive-meta.json`, JSON.stringify(meta))
console.log(`✅ executive-meta.json (${allYears.length} years)`)

/* ── Step 3: Write per-year files ─────────────────────────────── */
let totalKB = 0
for (const yr of allYears) {
  const str = JSON.stringify(buckets[yr])
  writeFileSync(`${prefix}executive-${yr}.json`, str)
  totalKB += str.length / 1024
  console.log(`✅ executive-${yr}.json (${buckets[yr].length} rows, ${(str.length / 1024).toFixed(0)} KB)`)
}

/* ── Step 4: Write yearly aggregates ──────────────────────────── */
const yearlyStr = JSON.stringify(yearly, null, 2)
writeFileSync(`${prefix}executive-yearly.json`, yearlyStr)
totalKB += yearlyStr.length / 1024
console.log(`✅ executive-yearly.json`)

console.log(`\n📊 Total: ${totalKB.toFixed(0)} KB across ${allYears.length + 2} files`)
console.log(`   Years found : ${allYears.join(', ')}`)
console.log(`   Daily rows  : ${merged.length}`)