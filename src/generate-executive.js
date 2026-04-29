/**
 * generate-executive.js
 * ─────────────────────────────────────────────────────────────────
 * Reads S3 - BI Data (supply) and D3 - BI Data (demand) sheets
 * from two separate xlsx files, filters for years 2026–2030,
 * merges by date, and writes public/executive.json.
 *
 * Usage:
 *   node scripts/generate-executive.js \
 *     public/supply.xlsx \
 *     public/demand.xlsx \
 *     public/executive.json
 *
 * Defaults: public/supply.xlsx  public/demand.xlsx  public/executive.json
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
  const d = new Date(cell)
  return isNaN(d) ? null : d
}

/* ── read a sheet as array-of-arrays ──────────────────────────── */
function readRows(filePath, sheetName) {
  const buf = readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  const ws = wb.Sheets[sheetName]
  if (!ws) {
    const available = Object.keys(wb.Sheets).join(', ')
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}.\nAvailable: ${available}`)
  }
  // header:1 → first row becomes index 0; raw:true keeps numbers as-is
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
}

/* ══════════════════════════════════════════════════════════════
   S3 — SUPPLY  (column positions correspond to S3 - BI Data)
   Col 0  : Date (Gregorian)
   Col 3  : Jeddah Airport (T1 + North + Hajj Hall)        pax/day
   Col 4  : Makkah Accommodation                            beds/day
   Col 7  : Madinah Accommodation                          beds/day
   Col 10 : Masaa (Sa'i) Capacity                          worshippers/day
   Col 11 : Mataf (Tawaf) Capacity                         worshippers/day
   Col 12 : Makkah Grand Mosque Prayer Capacity            worshippers/day
   Col 13 : Madinah Prophet's Mosque Prayer Capacity       worshippers/prayer
   Col 14 : Madinah Airport (international terminal)        pax/day
   Col 15 : Taif Airport (international terminal)           pax/day
   Col 16 : Yanbu Airport (international terminal)          pax/day
   Col 17 : Makkah Water                                   persons
   Col 18 : Madinah Water                                  persons
   Col 24 : Makkah Energy (persons served)                 persons
   Col 25 : Madinah Energy (persons served)                persons
   Col 26 : Makkah Telecom                                 persons/day
   Col 27 : Madinah Telecom                                persons/day
   Col 28 : Salwa Land Border                              persons/day
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
      date: date.toISOString().slice(0, 10),
      year,
      supply: {
        jeddahAirport: nn(r[3]),
        makkahAccommodation: nn(r[4]),
        madinahAccommodation: nn(r[7]),
        masaa: nn(r[10]),
        mataf: nn(r[11]),
        makkahPrayer: nn(r[12]),
        madinahPrayer: nn(r[13]),
        madinahAirport: nn(r[14]),
        taifAirport: nn(r[15]),
        yanbuAirport: nn(r[16]),
        makkahWater: nn(r[17]),
        madinahWater: nn(r[18]),
        makkahEnergy: nn(r[24]),
        madinahEnergy: nn(r[25]),
        makkahTelecom: nn(r[26]),
        madinahTelecom: nn(r[27]),
        salwa: nn(r[28]),
      },
    })
  }
  return result
}

/* ══════════════════════════════════════════════════════════════
   D3 — DEMAND  (column positions correspond to D3 - BI Data)

   ACCOMMODATION
   Col 7  : Total Makkah daily demand (excl. day-trippers)   beds/day
   Col 11 : Total Madinah daily accommodation demand          beds/day

   RELIGIOUS
   Col 14 : Makkah Grand Mosque — daily prayers              worshippers
   Col 12 : Madinah Prophet's Mosque — daily prayers         worshippers
   Col 13 : Masaa (Sa'i)                                     worshippers
   Col 17 : Mataf (Tawaf)                                    worshippers

   AIRPORTS
   Col 15      : Jeddah — intl travelers total               pax/day
   Col 16      : Madinah — intl travelers total              pax/day
   Col 48+49+50: Taif (hajj + non-umrah + umrah)             pax/day
   Col 51+52+53: Yanbu (hajj + non-umrah + umrah)            pax/day

   WATER  (sum of sub-populations)
   Col 24+25+26+27: Makkah Water demand                     persons
   Col 28+29+30+31: Madinah Water demand                    persons

   ENERGY (persons served)
   Col 44+46 : Makkah Energy demand                         persons
   Col 45+47 : Madinah Energy demand                        persons

   TELECOM
   Col 59+60+61+62 : Makkah Telecom demand                 persons/day
   Col 63+64+65    : Madinah Telecom demand                 persons/day

   LAND BORDERS (non-umrah + umrah for each)
   Col 54+55 : King Fahd Causeway
   Col 56+57 : Salwa
   Col 74+75 : Al Batha
   Col 76+77 : Al Haditha
   Col 78+79 : Al Khadra
   Col 80+81 : Al Khafji
   Col 82+83 : Al Durrah
   Col 84+85 : Empty Quarter (Rub' al-Khali)
   Col 86+87 : Al Ruq'i
   Col 90+91 : Al Wadiah
   Col 92+93 : Jadidat Arar
   Col 94+95 : Halat Ammar
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
      date: date.toISOString().slice(0, 10),
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

/* ── main ─────────────────────────────────────────────────────── */
const [, , supplyPath = 'public/Supply Sheet.xlsx',
  demandPath = 'public/Demand Sheet.xlsx',
  outputPath = 'public/executive.json'] = process.argv

console.log(`📂 Supply : ${supplyPath}`)
console.log(`📂 Demand : ${demandPath}`)
console.log(`📤 Output : ${outputPath}`)

const s3Rows = readRows(supplyPath, 'S3 - BI Data')
const d3Rows = readRows(demandPath, 'D3 - BI Data')

console.log(`   S3 rows read : ${s3Rows.length - 1}`)
console.log(`   D3 rows read : ${d3Rows.length - 1}`)

const s3Data = processS3(s3Rows)
const d3Data = processD3(d3Rows)
const merged = mergeByDate(s3Data, d3Data)
const yearly = aggregateByYear(merged)

const yearsFound = Object.keys(yearly).sort()
console.log(`   Years found  : ${yearsFound.join(', ')}`)
console.log(`   Daily rows   : ${merged.length}`)

writeFileSync(outputPath, JSON.stringify({ yearly, rows: merged }, null, 2))
console.log(`✅ executive.json generated`)