import { useState, useRef, useCallback } from 'react'
import './ExportModal.css'
import {
  FiFileText, FiX, FiCheckCircle, FiAlertTriangle, FiTrendingDown,
  FiArrowUp, FiCalendar, FiInfo, FiLock, FiSliders,
  FiAlertCircle, FiCheck, FiMoon, FiTarget, FiActivity,
  FiBarChart2, FiClock, FiStar, FiTrendingUp
} from 'react-icons/fi'
import { MdHotel, MdBarChart, MdWarning, MdStraighten, MdSwapHoriz, MdCircle, MdDiamond } from 'react-icons/md'
import { FaMosque } from 'react-icons/fa'

// ─── Design tokens (mirror App.jsx exactly) ──────────────────────
const T = {
  // ── Surfaces (light — mirrors App.jsx)
  bg: '#fefefe', bgM: '#f4f2ee', bgL: '#ece8e1',
  card: 'rgba(65,64,66,0.04)', border: 'rgba(65,64,66,0.10)',

  // ── Gold — demand/targets (المستهدفات)
  bronze: '#967126', bronzeL: '#b08432', bronzeXL: '#c9a048',

  // ── Emerald — supply (الطاقة الاستيعابية)
  green: '#007a53', greenL: '#009a65', greenXL: '#1aae78', greenDk: '#005236',

  sup: '#007a53', supL: 'rgba(0,122,83,0.22)', supBg: 'rgba(0,122,83,0.08)',
  dem: '#967126', demL: 'rgba(150,113,38,0.24)', demBg: 'rgba(150,113,38,0.08)',

  // ── Outcome states
  deficit: '#b85c4e', deficitL: 'rgba(184,92,78,0.28)', deficitBg: 'rgba(184,92,78,0.08)',
  surplus: '#007a53', surplusL: 'rgba(0,122,83,0.22)', surplusBg: 'rgba(0,122,83,0.08)',

  // ── Seasons — Teal-blue (رمضان & حج)
  ram: '#006e96', ramL: 'rgba(0,110,150,0.22)', ramBg: 'rgba(0,110,150,0.07)',
  hajj: '#004d6a', hajjL: 'rgba(0,77,106,0.22)', hajjBg: 'rgba(0,77,106,0.07)',

  // ── Text — dark on light
  txt: '#414042', txtSub: '#75787b', txtDim: 'rgba(65,64,66,0.45)',
  warn: '#967126', warnBg: 'rgba(150,113,38,0.08)', warnBdr: 'rgba(150,113,38,0.3)',
}

const AR_MON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

// ─── Season date ranges (mirrors parse.js) ────────────────────────
const HAJJ_RANGES = [
  { s: new Date(2026, 4, 25), e: new Date(2026, 4, 30) },
  { s: new Date(2027, 4, 14), e: new Date(2027, 4, 19) },
  { s: new Date(2028, 4, 3), e: new Date(2028, 4, 8) },
  { s: new Date(2029, 3, 22), e: new Date(2029, 3, 27) },
  { s: new Date(2030, 3, 11), e: new Date(2030, 3, 16) },
]
const RAMADAN_RANGES = [
  { s: new Date(2026, 1, 18), e: new Date(2026, 2, 20) },
  { s: new Date(2027, 1, 8), e: new Date(2027, 2, 10) },
  { s: new Date(2028, 0, 28), e: new Date(2028, 1, 27) },
  { s: new Date(2029, 0, 16), e: new Date(2029, 1, 15) },
  { s: new Date(2030, 0, 5), e: new Date(2030, 1, 4) },
  { s: new Date(2030, 11, 26), e: new Date(2031, 0, 25) },
]

// ─── Ramadan → Hijri year mapping ─────────────────────────────────
// Each Gregorian year maps to an array of Hijri years for that year's Ramadan(s)
const RAMADAN_HIJRI = {
  2026: [1447], 2027: [1448], 2028: [1449], 2029: [1450], 2030: [1451, 1452],
}

const fmtFull = n => n == null || isNaN(n) ? '—'
  : Math.round(Math.abs(n)).toLocaleString('en-US').replace(/,/g, ',')

const fmtN = n => {
  if (n == null || isNaN(n)) return '—'
  const a = Math.abs(n)
  return a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}م` : fmtFull(n)
}


const nowLabel = () => {
  const d = new Date()
  return `${d.getDate()} ${AR_MON[d.getMonth()]} ${d.getFullYear()}`
}


const LS_KEY = 'pdf_recent_exports'
const getRecent = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? [] } catch { return [] } }
const saveRecent = exports => { try { localStorage.setItem(LS_KEY, JSON.stringify(exports)) } catch { } }

// ─── findExtremePeriod (mirrors App.jsx logic) ───────────────────
function rpFindExtremePeriod(rows, getVal, findMax = true) {
  if (!rows.length) return null
  const extremeVal = findMax
    ? rows.reduce((m, r) => { const v = getVal(r); return v > m ? v : m }, -Infinity)
    : rows.reduce((m, r) => { const v = getVal(r); return v < m ? v : m }, Infinity)
  const peakRows = rows.filter(r => getVal(r) === extremeVal).sort((a, b) => {
    const ta = r => r.date instanceof Date ? r.date : new Date(r.date)
    return ta(a) - ta(b)
  })
  if (!peakRows.length) return null
  const groups = []; let cur = [peakRows[0]]
  for (let i = 1; i < peakRows.length; i++) {
    const da = peakRows[i - 1].date instanceof Date ? peakRows[i - 1].date : new Date(peakRows[i - 1].date)
    const db = peakRows[i].date instanceof Date ? peakRows[i].date : new Date(peakRows[i].date)
    const diff = Math.round((db - da) / 86400000)
    if (diff <= 1) cur.push(peakRows[i])
    else { groups.push(cur); cur = [peakRows[i]] }
  }
  groups.push(cur)
  const longest = groups.reduce((m, g) => g.length > m.length ? g : m, groups[0])
  const first = longest[0], last = longest[longest.length - 1]
  return { value: extremeVal, first, last, days: longest.length, isSingleDay: longest.length === 1 }
}

// ─── Period label for report (gregorian + hijri) ──────────────────
const RpPeriodLabel = ({ period }) => {
  if (!period) return <span style={{ color: '#9ca3af', fontSize: 9 }}>—</span>
  const f = period.first, l = period.last
  if (period.isSingleDay) {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 9.5, color: '#374151', fontWeight: 600 }}>{f?.dateLabel ?? '—'}</span>
        {f?.hijriDate && <span style={{ fontSize: 8.5, color: '#374151', display: 'inline-block', width: 'fit-content' }}>{f.hijriDate}</span>}
      </span>
    )
  }
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 9, color: '#6b7280' }}>
        من <span style={{ color: '#374151', fontWeight: 600 }}>{f?.dateLabel ?? '—'}</span>
        {' '}حتى <span style={{ color: '#374151', fontWeight: 600 }}>{l?.dateLabel ?? '—'}</span>
      </span>
      {(f?.hijriDate || l?.hijriDate) && (
        <span style={{ fontSize: 8.5, color: '#374151' }}>
          {f?.hijriDate ?? '—'} — {l?.hijriDate ?? '—'}
        </span>
      )}
    </span>
  )
}

// ─── SVG Donut Chart for static report ────────────────────────────
function RpSvgDonut({ title, segments, legendValueSuffix = '' }) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (!total) return null

  const CX = 72, CY = 72, R = 52
  const C = 2 * Math.PI * R   // full circumference ≈ 326.7px
  const GAP = 5               // gap between segments in px

  let startFrac = 0
  const arcs = segments.map(seg => {
    const pct = seg.value / total
    const dashLen = Math.max(pct * C - GAP, 2)
    const rotateDeg = startFrac * 360 - 90   // start from top
    startFrac += pct
    return { ...seg, pct: Math.round(pct * 100), dashLen, rotateDeg }
  })

  const dominant = arcs.reduce((m, a) => a.value > m.value ? a : m, arcs[0])

  return (
    <div className="rp-svg-donut-card">
      <div className="rp-svg-donut-title">{title}</div>
      <div style={{ position: 'relative', width: 144, height: 144, margin: '0 auto' }}>
        <svg width={144} height={144} viewBox="0 0 144 144" style={{ display: 'block' }}>
          {/* Track ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e9eef4" strokeWidth={14} />
          {/* Colored arcs */}
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={`${arc.dashLen} ${C}`}
              strokeDashoffset={0}
              transform={`rotate(${arc.rotateDeg}, ${CX}, ${CY})`}
            />
          ))}
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', width: 68 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: dominant.color, lineHeight: 1 }}>{dominant.pct}%</div>
          <div style={{ fontSize: 8, color: '#6b7280', marginTop: 3, lineHeight: 1.3 }}>{dominant.name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10, width: '100%' }}>
        {arcs.map(a => (
          <div key={a.name} style={{ padding: '6px 8px', borderRadius: 7, background: `${a.color}12`, border: `1px solid ${a.color}28` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: '#374151', flex: 1, fontWeight: 600 }}>{a.name}</span>
              <strong style={{ fontSize: 11, color: a.color, flexShrink: 0 }}>{a.pct}%</strong>
            </div>
            <div style={{ fontSize: 8.5, color: '#9ca3af', paddingRight: 16, textAlign: 'left' }}>{fmtFull(a.value)}{legendValueSuffix ? ` ${legendValueSuffix}` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Seasonal radial bar (3 concentric rings showing % deficit days per season)
function RpSeasonalRadial({ title, segments }) {
  // segments: [{ name, defPct, color, days }]
  if (!segments?.length) return null
  // Sort ascending by defPct so smallest is innermost (matches App.jsx)
  const data = [...segments].sort((a, b) => a.defPct - b.defPct)

  const CX = 72, CY = 72
  // 3 concentric rings between innerR=20 and outerR=66
  const innerR = 22, outerR = 66
  const ringGap = 2
  const ringW = (outerR - innerR - ringGap * (data.length - 1)) / data.length

  const arcs = data.map((s, i) => {
    const r = innerR + i * (ringW + ringGap) + ringW / 2
    const C = 2 * Math.PI * r
    const dashLen = (s.defPct / 100) * C
    return { ...s, r, dashLen, C }
  })

  return (
    <div className="rp-svg-donut-card">
      <div className="rp-svg-donut-title">{title}</div>
      <div style={{ position: 'relative', width: 144, height: 144, margin: '0 auto' }}>
        <svg width={144} height={144} viewBox="0 0 144 144" style={{ display: 'block' }}>
          {/* Track rings */}
          {arcs.map((a, i) => (
            <circle key={`bg-${i}`} cx={CX} cy={CY} r={a.r}
              fill="none" stroke="#eef2f6" strokeWidth={ringW} />
          ))}
          {/* Filled arcs — start from top (rotate -90°) */}
          {arcs.map((a, i) => (
            <circle key={`arc-${i}`} cx={CX} cy={CY} r={a.r}
              fill="none" stroke={a.color} strokeWidth={ringW}
              strokeLinecap="round"
              strokeDasharray={`${a.dashLen} ${a.C}`}
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity={0.9} />
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10, width: '100%' }}>
        {segments.map(s => (
          <div key={s.name} style={{ padding: '6px 8px', borderRadius: 7, background: `${s.color}12`, border: `1px solid ${s.color}28` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: '#374151', flex: 1, fontWeight: 600 }}>{s.name}</span>
              <strong style={{ fontSize: 11, color: s.color, flexShrink: 0 }}>{s.defPct}%</strong>
            </div>
            {s.days > 0 && (
              <div style={{ fontSize: 8.5, color: '#9ca3af', paddingRight: 16, textAlign: 'left' }}>{fmtFull(s.days)} يوم</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Icon wrapper for report layout (html2canvas-safe inline SVG) ─
function RpIcon({ icon: Icon, size = 16, color, style = {} }) {
  return (
    <span className="rp-icon-wrap" style={{ color, display: 'inline-flex', alignItems: 'center', ...style }}>
      <Icon size={size} />
    </span>
  )
}

// ─── KPI Card component (for report layout) ──────────────────────
function RpKpi({ label, value, unit, sub, accentClass, valueColor }) {
  return (
    <div className={`rp-kpi rp-kpi-${accentClass}`}>
      <div className="rp-peak-label">{label}</div>
      <div className="rp-peak-val" style={valueColor ? { color: valueColor } : undefined}>
        {value}
        {unit && <span className="rp-peak-unit">{unit}</span>}
      </div>
      {sub && <div className="rp-peak-date">{sub}</div>}
    </div>
  )
}

// ─── Pure-SVG Demand vs Supply chart (html2canvas-safe) ──────────
function RpDemandChart({ series }) {
  if (!series?.length) return null

  const W = 694
  const H = 200
  const PAD = { top: 14, right: 42, bottom: 34, left: 68 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const step = Math.max(1, Math.floor(series.length / 300))
  const pts = series.filter((_, i) => i % step === 0)

  const allVals = pts.flatMap(d => [d.demand ?? 0, d.supply ?? 0]).filter(v => v > 0)
  if (!allVals.length) return null
  const yMax = Math.ceil(Math.max(...allVals) * 1.12)
  const yMin = 0

  // RTL: newest data on LEFT (index 0 = right edge, last index = left edge)
  const xScale = i => cW * (1 - i / Math.max(pts.length - 1, 1))
  const yScale = v => cH - ((v - yMin) / (yMax - yMin)) * cH

  const DEM_STROKE = '#967126'   // gold/bronze — المستهدفات (matches App.jsx T.dem)
  const SUP_STROKE = '#007a53'   // emerald     — الطاقة الاستيعابية (matches App.jsx T.sup)

  const toPath = (getter) =>
    pts.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(getter(d)).toFixed(1)}`).join(' ')

  const demPath = toPath(d => d.demand ?? 0)
  const supPath = toPath(d => d.supply ?? 0)

  const segments = { dem: [], sup: [] }
  let curType = null, curSeg = []
  pts.forEach((d, i) => {
    const type = (d.demand ?? 0) > (d.supply ?? 0) ? 'dem' : 'sup'
    if (type !== curType) {
      if (curSeg.length > 1) segments[curType].push([...curSeg])
      curType = type; curSeg = [i]
    } else { curSeg.push(i) }
  })
  if (curSeg.length > 1) segments[curType].push(curSeg)

  const fillPath = (indices) => {
    const top = indices.map((i, j) => `${j === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(pts[i].demand ?? 0).toFixed(1)}`).join(' ')
    const bot = [...indices].reverse().map((i) => `L${xScale(i).toFixed(1)},${yScale(pts[i].supply ?? 0).toFixed(1)}`).join(' ')
    return `${top} ${bot} Z`
  }

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(yMin + (yMax - yMin) * i / 4))

  // ── Y-axis: "279 ألف" / "7.2 م" ──
  const fmtK = v => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} م`
    if (v >= 1_000) return Math.round(v / 1_000) + " ألف"
    return Math.round(v)
  }

  // ── X-axis: collect all month transitions per year, then apply rule per-year ──
  const yearSet = new Set(pts.map(p => {
    const d = p.date instanceof Date ? p.date : new Date(p.date)
    return d.getFullYear()
  }))
  const numYears = yearSet.size

  // Group month-start entries by year
  const byYearLabels = {}
  let lastMoKey = null
  pts.forEach((p, i) => {
    const date = p.date instanceof Date ? p.date : new Date(p.date)
    const yr = date.getFullYear()
    const mo = date.getMonth()
    const moKey = `${yr}-${mo}`
    if (moKey !== lastMoKey) {
      if (!byYearLabels[yr]) byYearLabels[yr] = []
      byYearLabels[yr].push({ i, mo, yr })
      lastMoKey = moKey
    }
  })

  // Per year: pick which months to show based on numYears
  const shownXLabels = Object.values(byYearLabels).flatMap(yearEntries => {
    if (numYears <= 1) return yearEntries           // all months
    return [yearEntries[0]].filter(Boolean)         // first month of each year only (2–5 years)
  })

  // ── Season bands — map date ranges directly to x coords, bypasses downsampling ──
  const ptFirst = pts[0].date instanceof Date ? pts[0].date : new Date(pts[0].date)
  const ptLast = pts[pts.length - 1].date instanceof Date ? pts[pts.length - 1].date : new Date(pts[pts.length - 1].date)
  const tMin = ptFirst.getTime()
  const tMax = ptLast.getTime()

  const dateToX = (d) => {
    if (tMax === tMin) return 0
    const frac = (d.getTime() - tMin) / (tMax - tMin)
    return cW * (1 - frac)   // RTL: older = right, newer = left
  }

  const buildBandsFromRanges = (ranges) => {
    const bands = []
    ranges.forEach(({ s, e }) => {
      // Only draw if the range overlaps the visible timeline
      if (e.getTime() < tMin || s.getTime() > tMax) return
      const clampedS = new Date(Math.max(s.getTime(), tMin))
      const clampedE = new Date(Math.min(e.getTime(), tMax))
      const x1 = dateToX(clampedS)
      const x2 = dateToX(clampedE)
      const xLeft = Math.min(x1, x2)
      const xRight = Math.max(x1, x2)
      if (xRight - xLeft >= 0.5) bands.push({ xLeft, width: xRight - xLeft })
    })
    return bands
  }
  const ramBands = buildBandsFromRanges(RAMADAN_RANGES)
  const hajjBands = buildBandsFromRanges(HAJJ_RANGES)

  const hasRam = ramBands.length > 0
  const hasHajj = hajjBands.length > 0

  return (
    <div className="rp-chart-wrap">
      <div className="rp-chart-header">
        <span className="rp-chart-title">الطاقة الاستيعابية مقابل المستهدفات</span>
        <div className="rp-chart-legend">
          <span className="rp-leg-dem">— المستهدفات</span>
          <span className="rp-leg-sup">— الطاقة الاستيعابية</span>
          {hasRam && <span className="rp-leg-ram">▌ رمضان</span>}
          {hasHajj && <span className="rp-leg-hajj">▌ حج</span>}
        </div>
      </div>

      <svg
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="rp-grd-dem" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DEM_STROKE} stopOpacity="0.22" />
            <stop offset="100%" stopColor={DEM_STROKE} stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="rp-grd-sup" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SUP_STROKE} stopOpacity="0.18" />
            <stop offset="100%" stopColor={SUP_STROKE} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {yTicks.map(v => (
            <line key={v}
              x1={0} y1={yScale(v).toFixed(1)} x2={cW} y2={yScale(v).toFixed(1)}
              stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="4 3"
            />
          ))}
          <line x1={0} y1={cH} x2={cW} y2={cH} stroke="#d1d5db" strokeWidth="1" />
          <line x1={0} y1={0} x2={0} y2={cH} stroke="#d1d5db" strokeWidth="1" />

          {ramBands.map(({ xLeft, width }, bi) => (
            <rect key={`ram-${bi}`}
              x={xLeft.toFixed(1)} y={0}
              width={width.toFixed(1)} height={cH}
              fill="rgba(0,110,150,0.22)"
            />
          ))}
          {hajjBands.map(({ xLeft, width }, bi) => (
            <rect key={`hajj-${bi}`}
              x={xLeft.toFixed(1)} y={0}
              width={Math.max(3, width).toFixed(1)} height={cH}
              fill="rgba(0,77,106,0.22)"
            />
          ))}

          <path d={supPath} fill="none" stroke={SUP_STROKE} strokeWidth="1.8" strokeLinejoin="round" />
          <path d={demPath} fill="none" stroke={DEM_STROKE} strokeWidth="1.8" strokeLinejoin="round" />

          {yTicks.map(v => (
            <text key={`yt-${v}`}
              x={-8} y={yScale(v) + 3.5}
              textAnchor="end" fontSize="9" fill="#9ca3af"
              fontFamily="Cairo, sans-serif"
            >{fmtK(v)}</text>
          ))}

          {shownXLabels.map(({ i, mo, yr }, li) => {
            const x = xScale(i)
            const anchor = x > cW - 28 ? 'end' : x < 28 ? 'start' : 'middle'
            return (
              <text key={`xl-${li}`}
                x={x} y={cH + 20}
                textAnchor={anchor} fontSize="9" fill="#6b7280"
                fontFamily="Cairo, sans-serif"
              >{numYears <= 1 ? AR_MON[mo] : `${AR_MON[mo]} ${String(yr).slice(2)}`}</text>
            )
          })}
        </g>
      </svg>

      <div className="rp-chart-unit">سرير / يوم</div>
    </div>
  )
}

// ─── Insight generator (rule-based, enriched) ────────────────────
function generateInsights(payload) {
  const { kpi, ram, yr, sc, monthly, seriesYears } = payload
  const insights = []

  if (kpi) {
    const defPct = Math.round(kpi.defPct)
    const yrLabel = yr ?? seriesYears.join('–')

    if (defPct > 70)
      insights.push(`شهدت فترة ${yrLabel} عجزاً في الطاقة الاستيعابية في ${defPct}% من الأيام (${kpi.defD} يوم)، ما يعكس مستوى مرتفعاً جداً من الضغط على الطاقة الاستيعابية المتاحة.`)
    else if (defPct > 40)
      insights.push(`تجاوز العجز اليومي ${defPct}% من مجموع الأيام المرصودة، ما يدل على تكرار واضح لفجوات الطاقة الاستيعابية مقارنة بالمستهدفات خلال الفترة.`)
    else
      insights.push(`سُجّل عجز في ${defPct}% من الأيام خلال فترة ${yrLabel}، ما يشير إلى وجود ضغط مستمر على الطاقة الاستيعابية مقارنة بالمستهدفات.`)
    if (kpi.criticalPct > 50)
      insights.push(`${kpi.criticalPct}% من الأيام تقع ضمن النطاق الحرج (المستهدفات ≥ 80% من الطاقة الاستيعابية)، ما يعكس استمرار التشغيل تحت ضغط مرتفع.`)
    else if (kpi.criticalPct > 25)
      insights.push(`${kpi.criticalPct}% من الأيام ضمن النطاق الحرج، ما يشير إلى تكرار مستويات تشغيل قريبة من الحد الأقصى للطاقة الاستيعابية.`)

    const gap = kpi.avgG
    if (gap > 10000)
      insights.push(`الفجوة اليومية المتوسطة ${fmtFull(gap)} سرير، ما يعكس عجزاً هيكلياً كبيراً بين المستهدفات والطاقة الاستيعابية الحالية.`)
    else if (gap > 3000)
      insights.push(`متوسط الفجوة اليومية ${fmtFull(gap)} سرير، ما يشير إلى وجود عجز يومي ملحوظ بين المستهدفات والطاقة الاستيعابية.`)
    else if (gap < -10000)
      insights.push(`يوجد فائض يومي متوسط يتجاوز ${fmtFull(Math.abs(gap))} سرير/يوم، ما يعكس اتساع الفارق بين الطاقة الاستيعابية المتاحة ومستوى المستهدفات.`)
  }

  if (ram?.rDays > 0) {
    const ramPct = Math.round(ram.rPct)
    const outerPct = Math.round(ram.oPct)
    if (ramPct > 80)
      insights.push(`رمضان يُشكّل نقطة ضغط قصوى، مع عجز في الطاقة الاستيعابية خلال ${ramPct}% من أيامه مقارنة بـ ${outerPct}% خارجه.`)
    else if (ramPct > 50)
      insights.push(`سُجّل عجز في الطاقة الاستيعابية خلال رمضان بنسبة ${ramPct}% مقارنة في ${outerPct}% خارج رمضان، ما يبرز ارتفاع الضغط الموسمي خلال هذه الفترة.`)
    else if (ramPct > outerPct + 10)
      insights.push(`يرتفع الضغط في رمضان بمقدار ${ramPct - outerPct} نقطة مئوية فوق المعدل خارج رمضان، ما يعكس زيادة موسمية واضحة في مستوى العجز بين المستهدفات والطاقة الاستيعابية.`)
  }

  if (monthly?.length > 0) {
    const worstMonth = monthly.reduce((m, x) => x.avgGap > m.avgGap ? x : m, monthly[0])
    if (worstMonth.avgGap > 0)
      insights.push(`أشد الأشهر ضغطاً هو ${worstMonth.name} بمتوسط عجز ${fmtFull(worstMonth.avgGap)} سرير/يوم وعجز في ${worstMonth.defDays} من أصل ${worstMonth.totalDays} يوم.`)
  }

  const activeAdj = Object.values(sc).filter(v => v !== 0).length
  if (activeAdj > 0)
    insights.push(`يعكس هذا التقرير ${activeAdj} تعديلات افتراضية على السيناريو، النتائج تقديرية ولا تعكس البيانات الفعلية بشكل كامل.`)

  return insights.slice(0, 5)
}

// ─── Confidence notes ──────────────────────────────────────────
function generateNotes(payload) {
  const notes = []
  if (!payload.kpi) notes.push({ type: 'warn', text: 'لا تتوفر بيانات كافية لهذا العام.' })
  if (payload.ram?.rDays === 0) notes.push({ type: 'warn', text: 'لم يُرصد عجز في فترة رمضان — تحقق من اكتمال البيانات.' })
  const hasAdj = Object.values(payload.sc).some(v => v !== 0)
  if (hasAdj) notes.push({ type: 'info', text: 'القيم المعروضة تشمل تعديلات افتراضية على السيناريو وليست بيانات فعلية.' })
  if (payload.scope === 'year') notes.push({ type: 'lock', text: 'نطاق السيناريو مقيّد بالسنة المحددة فقط.' })
  return notes
}

// ─── Page footer ─────────────────────────────────────────────────
const RpPageFooter = ({ yrLabel, today }) => (
  <div className="rp-page-footer">
    <img src="/PEP-2030.png" alt="شعار المنصة" className="rp-footer-logo" />
    <span className="rp-footer-right">
      المنصة الوطنية لدراسات الطاقة الاستيعابية · تاريخ الإصدار: {today}
    </span>
  </div>
)

// ─── Section page header ─────────────────────────────────────────
const RpPageHeader = ({ sectionLabel, title, sub }) => (
  <div className="rp-page-header">
    <div className="rp-page-header-bar" />
    <div className="rp-page-header-body">
      {sectionLabel && <div className="rp-page-section-label">{sectionLabel}</div>}
      <h2 className="rp-section-title">{title}</h2>
      <div className="rp-section-sub">{sub}</div>
    </div>
  </div>
)

// ─── Hijri date display helper ────────────────────────────────────
const HijriDate = ({ hijri, className = '' }) =>
  hijri ? <span className={`rp-hijri-date ${className}`}>{hijri}</span> : null

// ─── SVG Monthly Bar Chart for insights page ─────────────────────
function RpMonthlyBarChart({ monthly }) {
  if (!monthly?.length) return null

  const W = 660, H = 130
  const PAD = { top: 12, right: 10, bottom: 32, left: 44 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const maxDef = Math.max(...monthly.map(m => m.defDays), 1)
  const barW = Math.max(4, (cW / monthly.length) * 0.62)
  const gap = cW / monthly.length

  const yTick = v => Math.round(cH - (v / maxDef) * cH)

  const yTickVals = [0, Math.round(maxDef / 2), maxDef].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px 8px', marginBottom: 14 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>عددأيام العجز لكل شهر</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid lines */}
          {yTickVals.map(v => (
            <line key={v} x1={0} y1={yTick(v)} x2={cW} y2={yTick(v)}
              stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="3 3" />
          ))}
          <line x1={0} y1={cH} x2={cW} y2={cH} stroke="#cbd5e1" strokeWidth="1" />

          {/* Bars */}
          {monthly.map((m, i) => {
            const x = i * gap + (gap - barW) / 2
            const barH = Math.max(2, (m.defDays / maxDef) * cH)
            const y = cH - barH
            const isRam = m.isRam
            const isHajj = m.isHajj
            const barColor = isRam ? '#006e96' : isHajj ? '#004d6a' : m.defDays > 0 ? '#b85c4e' : '#cbd5e1'
            const barBg = isRam ? 'rgba(107,143,0,0.10)' : isHajj ? 'rgba(74,100,0,0.10)' : 'transparent'
            return (
              <g key={i}>
                {/* Season highlight column */}
                {(isRam || isHajj) && (
                  <rect x={i * gap} y={0} width={gap} height={cH}
                    fill={barBg} rx={0} />
                )}
                {/* Bar */}
                <rect x={x} y={y} width={barW} height={barH}
                  fill={barColor} rx={3} opacity={0.88} />
                {/* Value label above bar */}
                {m.defDays > 0 && (
                  <text x={x + barW / 2} y={y - 3}
                    textAnchor="middle" fontSize="8" fontWeight="700"
                    fill={barColor} fontFamily="Cairo, sans-serif">
                    {m.defDays}
                  </text>
                )}
                {/* X-axis label: M/YY (e.g., 2/26) — rotated vertical */}
                <text
                  x={i * gap + gap / 2}
                  y={cH + 26}
                  textAnchor="end"
                  dy="0.32em"
                  fontSize="8.5"
                  fill="#6b7280"
                  fontFamily="Cairo, sans-serif"
                  transform={`rotate(-90 ${i * gap + gap / 2} ${cH + 26})`}
                >
                  {`${(m.mo ?? 0) + 1}/${String(m.yr ?? '').slice(-2)}`}
                </text>
              </g>
            )
          })}

          {/* Y-axis labels */}
          {yTickVals.map(v => (
            <text key={`yt-${v}`} x={-6} y={yTick(v) + 3.5}
              textAnchor="end" fontSize="8" fill="#9ca3af"
              fontFamily="Cairo, sans-serif">{v}</text>
          ))}
        </g>
      </svg>
      <div style={{ display: 'flex', gap: 12, fontSize: 8.5, color: '#6b7280', marginTop: 4, flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#b85c4e', marginLeft: 4, verticalAlign: 'middle' }} />أيام عجز</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#006e96', marginLeft: 4, verticalAlign: 'middle' }} />رمضان</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#004d6a', marginLeft: 4, verticalAlign: 'middle' }} />حج</span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  REPORT LAYOUT (hidden div that gets captured)
// ════════════════════════════════════════════════════════════════
function ReportLayout({ payload, opts }) {
  const {
    yr, kpi, ram, sc, peakDemand, peakSupply, series, monthly,
    seriesYears, demTypeLabel, supTypeLabel, scopeLabel, demTypes, supTypes,
  } = payload

  const insights = generateInsights(payload)
  const notes = generateNotes(payload)
  const today = nowLabel()
  const yrLabel = yr ?? (seriesYears?.length ? seriesYears.join('–') : '—')

  // ── Recompute day categories with 80%/100% thresholds ──────────
  const dayBreakdown = series.length > 0 ? (() => {
    let defDays = 0, critDays = 0, surDays = 0
    series.forEach(r => {
      const ratio = r.supply > 0 ? (r.demand ?? 0) / r.supply : 0
      if (ratio > 1.0) defDays++
      else if (ratio >= 0.80) critDays++
      else surDays++
    })
    const total = series.length
    return {
      defDays, critDays, surDays, total,
      defPct: Math.round(defDays / total * 100),
      critPct: Math.round(critDays / total * 100),
      surPct: Math.round(surDays / total * 100),
    }
  })() : null

  // ── Hijri years for Ramadan section ───────────────────────────
  const ramHijriYears = (seriesYears ?? [])
    .flatMap(y => RAMADAN_HIJRI[y] ?? [])
    .filter((v, i, a) => a.indexOf(v) === i)
  const ramHijriLabel = ramHijriYears.map(h => `${h}`).join(' / ')

  const SUPPLY_LABELS = {
    sl: 'مرافق مرخصة', sf: 'مشاريع مستقبلية', sh: 'مساكن الحجاج',
    br: 'نسبة الأسرّة/غرفة', bnH: 'أسرة/غرفة (خارج الحج)', bH: 'أسرة/غرفة (موسم الحج)',
  }
  const DEMAND_LABELS = { do_: 'زوار من الخارج', di: 'زوار من الداخل' }
  const activeSliders = Object.entries(sc)
    .filter(([k, v]) => {
      if (k === 'bnH') return v !== 3.1
      if (k === 'bH') return v !== 4.3
      return v !== 0
    })
    .map(([k, v]) => {
      const isAbs = k === 'bnH' || k === 'bH'
      const normal = k === 'bnH' ? 3.1 : k === 'bH' ? 4.3 : null
      return {
        label: SUPPLY_LABELS[k] ?? DEMAND_LABELS[k] ?? k,
        value: v,
        cat: k in SUPPLY_LABELS ? 'supply' : 'demand',
        isAbs,
        normal,
      }
    })

  return (
    <div id="rp-root" className="rp-root" dir="rtl">

      {/* ══════════════════════════════════════════════════════════
          PAGE 1 — المصطلحات والمفاهيم (FIRST PAGE)
      ══════════════════════════════════════════════════════════ */}
      {opts.kpis && (
        <div className="rp-page rp-page-content">
          <RpPageHeader
            sectionLabel={null}
            title="المصطلحات والمفاهيم"
            sub="دليل المصطلحات والمفاهيم المستخدمة في هذا التقرير"
          />

          {/* المصطلحات + مؤشرات الرسم البياني — unified single table */}
          <div className="rp-term-list">
            {/* ── الطاقة الاستيعابية (parent + children) ── */}
            <div className="rp-term-row" style={{ background: 'rgba(0,122,83,0.05)', borderRight: '3px solid #007a53' }}>
              <div className="rp-term-row-name" style={{ color: '#007a53', fontWeight: 900, borderRight: 'none' }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#007a53', marginLeft: 6, flexShrink: 0, verticalAlign: 'middle' }} />
                الطاقة الاستيعابية
              </div>
              <div className="rp-term-row-body"><span className="rp-term-row-simple">إجمالي السعة المتاحة للإيواء — تشمل ثلاثة مكوّنات</span></div>
            </div>
            {[
              { term: 'المرافق المرخصة', simple: 'الفنادق والشقق الفندقية المشغّلة حالياً' },
              { term: 'المشاريع المستقبلية', simple: 'المنشآت الفندقية قيد التطوير أو المخطط لها' },
              { term: 'مساكن الحجاج', simple: 'وحدات الإيواء المخصصة لموسم الحج' },
            ].map(({ term, simple }) => (
              <div key={term} className="rp-term-row" style={{ paddingRight: 22 }}>
                <div className="rp-term-row-name" style={{ color: '#374151', borderRight: 'none' }}>
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#007a53', marginLeft: 6, opacity: 0.5, flexShrink: 0, verticalAlign: 'middle' }} />
                  {term}
                </div>
                <div className="rp-term-row-body"><span className="rp-term-row-simple">{simple}</span></div>
              </div>
            ))}

            {/* ── المستهدفات (parent + children) ── */}
            <div className="rp-term-row" style={{ background: 'rgba(150,113,38,0.05)', borderRight: '3px solid #967126', marginTop: 6 }}>
              <div className="rp-term-row-name" style={{ color: '#967126', fontWeight: 900, borderRight: 'none' }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#967126', marginLeft: 6, flexShrink: 0, verticalAlign: 'middle' }} />
                المستهدفات
              </div>
              <div className="rp-term-row-body"><span className="rp-term-row-simple">إجمالي الطلب المتوقع على الإيواء — يتكوّن من نوعين</span></div>
            </div>
            {[
              { term: 'معتمري الداخل (مبيت)', simple: 'المعتمرون المقيمون داخل المملكة الذين يبيتون ليلة أو أكثر' },
              { term: 'معتمري الخارج', simple: 'المعتمرون القادمون من خارج المملكة' },
            ].map(({ term, simple }) => (
              <div key={term} className="rp-term-row" style={{ paddingRight: 22 }}>
                <div className="rp-term-row-name" style={{ color: '#374151', borderRight: 'none' }}>
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#967126', marginLeft: 6, opacity: 0.5, flexShrink: 0, verticalAlign: 'middle' }} />
                  {term}
                </div>
                <div className="rp-term-row-body"><span className="rp-term-row-simple">{simple}</span></div>
              </div>
            ))}

            {/* ── الفجوة (parent + children) ── */}
            <div className="rp-term-row" style={{ background: 'rgba(212,170,82,0.06)', borderRight: '3px solid rgba(212,170,82,0.7)', marginTop: 6 }}>
              <div className="rp-term-row-name" style={{ color: 'rgba(160,130,60,0.9)', fontWeight: 900, borderRight: 'none' }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'rgba(212,170,82,0.7)', marginLeft: 6, flexShrink: 0, verticalAlign: 'middle' }} />
                الفجوة
              </div>
              <div className="rp-term-row-body"><span className="rp-term-row-simple">الفرق بين الطاقة الاستيعابية والمستهدفات — تظهر في حالتين</span></div>
            </div>
            {[
              { term: 'العجز', accent: '#b85c4e', simple: 'المستهدفات تتجاوز الطاقة الاستيعابية المتاحة' },
              { term: 'الفائض', accent: '#007a53', simple: 'الطاقة الاستيعابية تتجاوز المستهدفات' },
            ].map(({ term, accent, simple }) => (
              <div key={term} className="rp-term-row" style={{ paddingRight: 22 }}>
                <div className="rp-term-row-name" style={{ color: '#374151', borderRight: 'none' }}>
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: accent, marginLeft: 6, flexShrink: 0, verticalAlign: 'middle' }} />
                  {term}
                </div>
                <div className="rp-term-row-body"><span className="rp-term-row-simple">{simple}</span></div>
              </div>
            ))}

            {/* ── Other standalone terms ── */}
            {[
              { term: 'أيام العجز', accent: '#b85c4e', simple: 'عندما تكون المستهدفات أكبر من ١٠٠٪ من الطاقة الاستيعابية' },
              { term: 'ذروة المستهدفات', accent: null, simple: 'أعلى قيمة يومية وصلت إليها المستهدفات خلال الفترة' },
              { term: 'نسبة الإشغال', accent: null, simple: 'نسبة المستهدفات إلى إجمالي الطاقة الاستيعابية' },
            ].map(({ term, accent, simple }) => (
              <div key={term} className="rp-term-row" style={{ marginTop: term === 'أيام العجز' ? 6 : 0 }}>
                <div className="rp-term-row-name" style={{ color: '#374151', borderRight: 'none' }}>
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: accent ?? '#6B7280', marginLeft: 6, flexShrink: 0, verticalAlign: 'middle' }} />
                  {term}
                </div>
                <div className="rp-term-row-body"><span className="rp-term-row-simple">{simple}</span></div>
              </div>
            ))}

            {/* ── Chart indicator rows ── */}
            {[
              { label: 'أعلى حمل يومي', desc: 'أعلى طلب يومي متوقع خلال الفترة المحددة' },
              { label: 'أعلى طاقة استيعابية', desc: 'أعلى عدد أسرّة متاحة خلال الفترة المحددة' },
              { label: 'أعلى عجز', desc: 'أعلى عجز يومي متوقع خلال الفترة المحددة' },
              { label: 'أعلى فائض', desc: 'أعلى فائض يومي في الطاقة الاستيعابية خلال الفترة المحددة' },
              { label: 'متوسط الفجوة اليومية', desc: 'متوسط الفرق اليومي بين الطلب والطاقة — يعكس الضغط العام على المنظومة طوال الفترة' },
              { label: 'رمضان', desc: 'تُظلَّل فترة رمضان على الرسم البياني' },
              { label: 'موسم الحج', desc: 'تُظلَّل فترة الحج على الرسم البياني' },
            ].map(({ label, desc }) => (
              <div key={label} className="rp-term-row">
                <div className="rp-term-row-name" style={{ color: '#374151', borderRight: 'none' }}>
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#6B7280', marginLeft: 6, flexShrink: 0, verticalAlign: 'middle' }} />
                  {label}
                </div>
                <div className="rp-term-row-body">
                  <span className="rp-term-row-detail">{desc}</span>
                </div>
              </div>
            ))}
          </div>

          <RpPageFooter yrLabel={yrLabel} today={today} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAGE 1 — EXECUTIVE SUMMARY / KPIs
      ══════════════════════════════════════════════════════════ */}
      {opts.kpis && kpi && (
        <div className="rp-page rp-page-content">

          <RpPageHeader
            sectionLabel="القسم الأول — جزء 2/1"
            title="الملخص التنفيذي — المؤشرات الرئيسية"
            sub="تقرير مستخرج من المنصة الوطنية لدراسات الطاقة الاستيعابية في رحلة ضيوف الرحمن"
          />

          {/* Context ribbon */}
          <div className="rp-context-ribbon">
            <div className="rp-crb-cell">
              <div className="rp-crb-lbl">فترة التحليل الميلادية</div>
              <div className="rp-crb-val">{yrLabel}</div>
            </div>
            <div className="rp-crb-sep" />
            <div className="rp-crb-cell">
              <div className="rp-crb-lbl">نوع المستهدفات</div>
              <div className="rp-crb-val" style={{ whiteSpace: 'pre-line' }}>{demTypeLabel}</div>
            </div>
            <div className="rp-crb-sep" />
            <div className="rp-crb-cell">
              <div className="rp-crb-lbl">نوع الطاقة الاستيعابية</div>
              <div className="rp-crb-val" style={{ whiteSpace: 'pre-line' }}>{supTypeLabel}</div>
            </div>
            <div className="rp-crb-sep" />
            <div className="rp-crb-cell">
              <div className="rp-crb-lbl">السيناريو</div>
              <div className={`rp-crb-val${activeSliders.length > 0 ? ' rp-crb-warn' : ''}`}>
                {activeSliders.length > 0 ? 'معدل' : 'الأساسي'}
              </div>
              {activeSliders.length > 0 && (
                <div className="rp-crb-sub-count">{activeSliders.length} تعديل</div>
              )}
            </div>
          </div>

          {/* ── TOP 4: أعلى حمل / أعلى طاقة / أعلى عجز / أعلى فائض ── */}
          <div className="rp-kpi-peak-grid">

            {/* أعلى حمل يومي */}
            <div className="rp-peak-card rp-peak-card--dem">
              <div className="rp-peak-label">أعلى حمل يومي</div>
              <div className="rp-peak-val" style={{ color: '#967126' }}>
                {peakDemand ? fmtFull(peakDemand.value) : '—'}
                <span className="rp-peak-unit">معتمر/يوم</span>
              </div>
              <div className="rp-peak-date"><RpPeriodLabel period={peakDemand} /></div>
            </div>

            {/* أعلى طاقة استيعابية */}
            <div className="rp-peak-card rp-peak-card--sup">
              <div className="rp-peak-label">أعلى طاقة استيعابية</div>
              <div className="rp-peak-val" style={{ color: '#007a53' }}>
                {peakSupply ? fmtFull(peakSupply.value) : '—'}
                <span className="rp-peak-unit">سرير/يوم</span>
              </div>
              <div className="rp-peak-date"><RpPeriodLabel period={peakSupply} /></div>
            </div>

            {/* أعلى عجز */}
            {(() => {
              const md = kpi?.maxDef
              const defVal = md ? Math.abs(md.value) : 0
              const hasDef = defVal > 0
              return (
                <div className={`rp-peak-card ${hasDef ? 'rp-peak-card--deficit' : 'rp-peak-card--empty'}`}>
                  <div className="rp-peak-label">أعلى عجز</div>
                  <div className="rp-peak-val" style={{ color: hasDef ? '#b85c4e' : '#9ca3af' }}>
                    {hasDef ? fmtFull(defVal) : '—'}
                    {hasDef && <span className="rp-peak-unit">سرير/يوم</span>}
                  </div>
                  <div className="rp-peak-date">{hasDef ? <RpPeriodLabel period={md} /> : <span style={{ color: '#9ca3af', fontSize: 9 }}>لا يوجد عجز</span>}</div>
                </div>
              )
            })()}

            {/* أعلى فائض */}
            {(() => {
              const ms = kpi?.maxSur
              const surVal = ms?.value ?? 0
              const hasSur = surVal > 0
              return (
                <div className={`rp-peak-card ${hasSur ? 'rp-peak-card--surplus' : 'rp-peak-card--empty'}`}>
                  <div className="rp-peak-label">أعلى فائض</div>
                  <div className="rp-peak-val" style={{ color: hasSur ? '#007a53' : '#9ca3af' }}>
                    {hasSur ? fmtFull(surVal) : '—'}
                    {hasSur && <span className="rp-peak-unit">سرير/يوم</span>}
                  </div>
                  <div className="rp-peak-date">{hasSur ? <RpPeriodLabel period={ms} /> : <span style={{ color: '#9ca3af', fontSize: 9 }}>لا يوجد فائض</span>}</div>
                </div>
              )
            })()}
          </div>

          {/* ── KPI grid ── */}
          <div className="rp-kpi-grid">
            <RpKpi
              label="متوسط الطاقة الاستيعابية اليومية"
              value={fmtN(kpi.avgS)}
              unit="سرير / يوم"
              valueColor="#007a53"
              accentClass="sup"
            />
            <RpKpi
              label="متوسط المستهدفات اليومية"
              value={fmtN(kpi.avgD)}
              unit="معتمر / يوم"
              valueColor="#967126"
              accentClass="dem"
            />
            <RpKpi
              label="متوسط الفجوة اليومية"
              value={fmtN(Math.abs(kpi.avgG))}
              unit="سرير / يوم"
              valueColor={kpi.avgG > 0 ? '#007a53' : '#b85c4e'}
              accentClass={kpi.avgG > 0 ? 'surplus' : 'deficit'}
            />
          </div>

          {/* ── Mini charts row: 2 donuts + coverage bar ── */}
          {(() => {
            const defDays = series.filter(r => r.demand && r.supply && r.gap < 0).length
            const surDays = series.filter(r => r.demand && r.supply && r.gap >= 0).length
            const donutDef = [
              { name: 'عجز', value: defDays, color: '#b85c4e' },
              { name: 'فائض', value: surDays, color: '#007a53' },
            ]
            // Demand split: outside vs inside from series ado/adi (mirrors App.jsx mini chart 4)
            const validRows = series.filter(r => r.demand && r.supply)
            const avgOut = validRows.length ? validRows.reduce((s, r) => s + (r.ado ?? 0), 0) / validRows.length : 0
            const avgIn = validRows.length ? validRows.reduce((s, r) => s + (r.adi ?? 0), 0) / validRows.length : 0
            // Seasonal: % deficit days per season (mirrors App.jsx SeasonalRadialBar)
            const seasonsDef = [
              { name: 'رمضان', filter: r => r.isRamadan, color: '#006e96' },
              { name: 'حج', filter: r => r.isHajj, color: '#004d6a' },
              { name: 'باقي أيام السنة', filter: r => !r.isRamadan && !r.isHajj, color: '#75787b' },
            ]
            const seasonalSeg = seasonsDef.map(s => {
              const rows = series.filter(r => s.filter(r) && r.demand && r.supply)
              return {
                name: s.name,
                defPct: rows.length ? Math.round(rows.filter(r => r.gap < 0).length / rows.length * 100) : 0,
                color: s.color,
                days: rows.length,
              }
            }).filter(s => s.days > 0)
            // Coverage %: supply / demand × 100 (mirrors App.jsx line 2510)
            const fillPct = kpi.avgD > 0 ? Math.round(kpi.avgS / kpi.avgD * 100) : 0
            const isDeficit = fillPct < 100
            return (
              <div className="rp-mini-charts-row">
                {/* Donut 1: نسبة أيام العجز والفائض */}
                <RpSvgDonut
                  title="نسبة أيام العجز والفائض"
                  segments={donutDef}
                  legendValueSuffix="يوم"
                />

                {/* Chart 2: حالات العجز حسب الموسم */}
                {seasonalSeg.length > 0 && (
                  <RpSeasonalRadial
                    title="حالات العجز حسب الموسم"
                    segments={seasonalSeg}
                  />
                )}

                {/* Coverage: نسبة تغطية الطلب — percentage only */}
                <div className="rp-coverage-card">
                  <div className="rp-svg-donut-title">نسبة تغطية المستهدفات</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flex: 1, justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 52, fontWeight: 900, color: isDeficit ? '#b85c4e' : '#007a53', lineHeight: 1 }}>{fillPct}%</div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>نسبة ما تغطيه الطاقة الإستيعابية من إجمالي الطلب</div>
                    </div>
                    <div style={{ width: '100%', height: 12, borderRadius: 10, background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 10, width: `${Math.min(fillPct, 100)}%`, background: isDeficit ? 'linear-gradient(to left,#b85c4e,#b85c4e88)' : 'linear-gradient(to left,#007a53,#007a5388)', transition: 'width .6s ease' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: isDeficit ? '#b85c4e' : '#007a53' }}>
                        {isDeficit ? 'عجز' : 'فائض'}
                      </span>
                      <span style={{ fontSize: 10, color: '#374151', fontWeight: 700 }}>
                        {isDeficit ? `الطاقة الإستيعابية تغطي ${fillPct}% من المستهدفات` : `الطاقة الإستيعابية تتجاوز المستهدفات بنسبة ${fillPct - 100}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Demand vs Supply chart */}
          <RpDemandChart series={series} />

          <RpPageFooter yrLabel={yrLabel} today={today} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAGE 2b — الاستنتاجات والتحليل (right after الملخص التنفيذي)
      ══════════════════════════════════════════════════════════ */}
      {opts.insights && (
        <div className="rp-page rp-page-content">
          <RpPageHeader
            sectionLabel="القسم الثاني"
            title="الاستنتاجات والتحليل"
            sub={`رؤى تحليلية مبنية على بيانات ${yrLabel} · ${today}`}
          />

          {/* ── 3-col KPI Summary ── */}
          {kpi && dayBreakdown && (
            <div className="rp-kpi-peak-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 5 }}>
              <div className="rp-peak-card rp-peak-card--dem">
                <div className="rp-peak-label">أيام العجز الكلية</div>
                <div className="rp-peak-val" style={{ color: '#b85c4e' }}>
                  {dayBreakdown.defDays}
                  <span className="rp-peak-unit">يوم</span>
                </div>
                <div className="rp-peak-date" style={{ color: '#b85c4e', fontWeight: 700 }}>{dayBreakdown.defPct}% من إجمالي الفترة</div>
              </div>
              <div className="rp-peak-card rp-peak-card--empty" style={{ opacity: 1, borderColor: '#e2e8f0' }}>
                <div className="rp-peak-label">الأيام الحرجة</div>
                <div className="rp-peak-val" style={{ color: '#967126' }}>
                  {dayBreakdown.critDays}
                  <span className="rp-peak-unit">يوم</span>
                </div>
                <div className="rp-peak-date" style={{ color: '#967126', fontWeight: 700 }}>{dayBreakdown.critPct}% من إجمالي الفترة</div>
              </div>
              <div className="rp-peak-card rp-peak-card--surplus">
                <div className="rp-peak-label">أيام الفائض</div>
                <div className="rp-peak-val" style={{ color: '#007a53' }}>
                  {dayBreakdown.surDays}
                  <span className="rp-peak-unit">يوم</span>
                </div>
                <div className="rp-peak-date" style={{ color: '#007a53', fontWeight: 700 }}>{dayBreakdown.surPct}% من إجمالي الفترة</div>
              </div>
            </div>
          )}

          {/* ── Legend: day type definitions ── */}
          {kpi && dayBreakdown && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                { color: '#b85c4e', bg: 'rgba(184,92,78,0.08)', border: 'rgba(184,92,78,0.22)', label: 'أيام العجز', desc: 'المستهدفات أكبر من 100% من الطاقة' },
                { color: '#967126', bg: 'rgba(150,113,38,0.08)', border: 'rgba(150,113,38,0.22)', label: 'الأيام الحرجة', desc: 'المستهدفات بين 80%-100% من الطاقة' },
                { color: '#007a53', bg: 'rgba(0,122,83,0.08)', border: 'rgba(0,122,83,0.22)', label: 'أيام الفائض', desc: 'المستهدفات < 80% من الطاقة' },
              ].map(d => (
                <div key={d.label} style={{ flex: 1, background: d.bg, border: `1px solid ${d.border}`, borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: d.color }}>{d.label}</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#6b7280' }}>{d.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Monthly deficit bar chart ── */}
          {monthly?.length > 0 && <RpMonthlyBarChart monthly={monthly} />}

          {/* ── Mini chart: الفئات من المستهدفات (خارج vs داخل) ── */}
          {kpi && (() => {
            const validRows = series.filter(r => r.demand)
            const avgOut = validRows.length ? validRows.reduce((s, r) => s + (r.ado ?? 0), 0) / validRows.length : 0
            const avgIn = validRows.length ? validRows.reduce((s, r) => s + (r.adi ?? 0), 0) / validRows.length : 0
            const donutDemSplit = [
              { name: 'معتمري الخارج', value: Math.round(avgOut), color: '#7a5a1e' },
              { name: 'معتمري الداخل (مبيت)', value: Math.round(avgIn), color: '#d4a843' },
            ].filter(d => d.value > 0)
            if (!donutDemSplit.length) return null
            return (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <div style={{ width: '52%' }}>
                  <RpSvgDonut
                    title="الفئات من المستهدفات"
                    segments={donutDemSplit}
                    legendValueSuffix="معتمر/يوم"
                  />
                </div>
              </div>
            )
          })()}

          {/* ── Text insights (numbered) ── */}
          <div className="rp-insights-box">
            <div className="rp-insights-hdr">
              <span className="rp-insights-dot" />
              أبرز النتائج التحليلية
            </div>
            {insights.map((ins, i) => (
              <div key={i} className="rp-insight-row">
                <div className="rp-insight-num">{i + 1}</div>
                <div className="rp-insight-body">
                  <p className="rp-insight-txt">{ins}</p>
                </div>
              </div>
            ))}
          </div>

          <RpPageFooter yrLabel={yrLabel} today={today} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAGE 3 — تحليل رمضان + باقي الأشهر
      ══════════════════════════════════════════════════════════ */}
      {opts.kpis && ram?.rDays > 0 && (
        <div className="rp-page rp-page-content">
          <RpPageHeader
            sectionLabel="القسم الأول — جزء 2/2"
            title="تحليل رمضان وباقي الأشهر"
            sub={`تفاصيل العجز والفائض خلال موسم رمضان والأشهر الأخرى · ${yrLabel}`}
          />

          {/* Ramadan summary */}
          <div className="rp-ram-summary">
            <div className="rp-ram-summary-title">
              <RpIcon icon={FiMoon} size={13} color="#006e96" style={{ marginLeft: 6 }} />
              تحليل رمضان — {yrLabel}
              {ramHijriLabel && <span className="rp-ram-hijri-year">{ramHijriLabel}</span>}
            </div>

            {/* Stats grid */}
            <div className="rp-ram-stats-grid">
              <div className="rp-ram-stat-cell">
                <div className="rp-rsg-lbl">عدد أيام رمضان</div>
                <div className="rp-rsg-val">{ram.rDays} <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}>يوم</span></div>
              </div>
              <div className="rp-ram-stat-cell">
                <div className="rp-rsg-lbl">نسبة أيام العجز</div>
                <div className={`rp-rsg-val ${Math.round(ram.rPct) > 50 ? 'dem' : 'sup'}`}>{Math.round(ram.rPct)}%</div>
              </div>
              {ram.rMax && Math.round(ram.rPct) > 0 && (
                <div className="rp-ram-stat-cell">
                  <div className="rp-rsg-lbl">أعلى عجز في رمضان</div>
                  <div className="rp-rsg-val dem">
                    {fmtFull(Math.abs(ram.rMax.gap ?? 0))}
                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}> سرير</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                    {ram.rMax.dateLabel}{ram.rMax.hijriDate ? ` · ${ram.rMax.hijriDate}` : ''}
                  </div>
                </div>
              )}
            </div>

            {ram.perPeriod?.length > 1 && (
              <div className="rp-ram-periods">
                {ram.perPeriod.map((p, pIdx) => {
                  const allHijri = (seriesYears ?? []).flatMap(y => RAMADAN_HIJRI[y] ?? [])
                  const periodHijri = allHijri[pIdx] ?? null
                  return (
                    <div key={p.idx} className="rp-ram-period-row">
                      <span className="rp-rpr-label">
                        {p.label}
                        {periodHijri && <span className="rp-rpr-hijri">{periodHijri}هـ</span>}
                      </span>
                      <span className="rp-rpr-range">{p.dateRange}</span>
                      <span className="rp-rpr-days">{p.days} يوم</span>
                      <span className={`rp-rpr-pct ${Math.round(p.pct) > 0 ? 'dem' : 'sup'}`}>
                        {Math.round(p.pct) === 0
                          ? '✓ لا يوجد عجز'
                          : `⚠ عجز في ${Math.round(p.pct)}% من الأيام`}
                      </span>
                      <span className="rp-rpr-avg">متوسط {fmtFull(p.avg)} سرير/يوم</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* تحليل باقي الأشهر */}
          {(() => {
            const outerDays = series.filter(r => !r.isRamadan && !r.isHajj).length
            return (
              <div className="rp-other-months-box">

                {/* Header row: title + subtitle + status pill */}
                <div className="rp-other-months-header">
                  <div>
                    <div className="rp-other-months-title">تحليل باقي الأشهر</div>
                    <div className="rp-other-months-sub">الفترات خارج موسمَي رمضان والحج</div>
                  </div>
                  <div className={`rp-other-status-pill ${Math.round(ram.oPct) === 0 ? 'sup' : Math.round(ram.oPct) < 30 ? 'sup' : 'dem'}`}>
                    {Math.round(ram.oPct) === 0
                      ? '✓ لا يوجد عجز'
                      : Math.round(ram.oPct) < 30
                        ? `✓ عجز في أقل من ${Math.round(ram.oPct)}% من الأيام`
                        : `⚠ عجز في ${Math.round(ram.oPct)}% من الأيام`}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="rp-other-stats">
                  <div className="rp-other-stat">
                    <div className="rp-other-stat-lbl">عدد أيام الفترة</div>
                    <div className="rp-rsg-val">
                      {outerDays}
                      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}>يوم</span>
                    </div>
                  </div>

                  <div className="rp-other-stat">
                    <div className="rp-other-stat-lbl">متوسط الفجوة اليومية</div>
                    <div className="rp-rsg-val">
                      {fmtFull(ram.oAvg)}
                      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}>سرير/يوم</span>
                    </div>
                  </div>

                  {ram.oMax?.gap < 0 && (
                    <div className="rp-other-stat">
                      <div className="rp-other-stat-lbl">أعلى عجز خارج المواسم</div>
                      <div className="rp-rsg-val dem">
                        {fmtFull(-ram.oMax.gap)}
                        <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}>سرير/يوم</span>
                      </div>
                      <div style={{ fontSize: 8.5, color: '#6b7280', marginTop: 3 }}>
                        {ram.oMax.dateLabel}{ram.oMax.hijriDate ? ` · ${ram.oMax.hijriDate}` : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          <RpPageFooter yrLabel={yrLabel} today={today} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAGE 2 — MONTHLY ANALYSIS TABLE (split as needed)
      ══════════════════════════════════════════════════════════ */}
      {opts.tables && monthly?.length > 0 && (() => {
        const PAGE_SIZE = 24
        const pages = []
        for (let i = 0; i < monthly.length; i += PAGE_SIZE) {
          pages.push(monthly.slice(i, i + PAGE_SIZE))
        }
        const MonthlyTable = ({ rows, isLast }) => (
          <table className="rp-table rp-monthly-table">
            <thead>
              <tr>
                <th>الشهر</th>
                <th className="rp-th-num">متوسط المستهدفات<br /><span className="rp-th-unit">معتمر/يوم</span></th>
                <th className="rp-th-num">متوسط الطاقة الإستيعابية<br /><span className="rp-th-unit">سرير/يوم</span></th>
                <th className="rp-th-num">متوسط الفجوة<br /><span className="rp-th-unit">سرير/يوم</span></th>
                <th className="rp-th-num">أيام العجز / الإجمالي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => {
                const isDeficit = m.avgGap > 0
                const defPct = m.totalDays > 0 ? Math.round(m.defDays / m.totalDays * 100) : 0
                return (
                  <tr key={i} className={`${i % 2 === 0 ? 'rp-tr-even' : ''}`}>
                    <td className="rp-td-month">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {m.name}
                        {m.isRam && <RpIcon icon={FiMoon} size={11} color="#006e96" />}
                        {m.isHajj && <RpIcon icon={FaMosque} size={11} color="#006e96" />}
                      </span>
                    </td>
                    <td className="rp-td-dem rp-td-num">{fmtFull(m.avgDem)}</td>
                    <td className="rp-td-sup rp-td-num">{fmtFull(m.avgSup)}</td>
                    <td className="rp-td-num">
                      <span style={{ color: isDeficit ? '#b85c4e' : '#007a53', fontWeight: 700 }}>
                        {fmtFull(m.avgGap)}
                      </span>
                    </td>
                    <td className="rp-td-num rp-td-pct">
                      <span className={`rp-pct-pill ${isDeficit ? 'dem' : 'sup'}`}>
                        {m.defDays} / {m.totalDays}
                      </span>
                    </td>
                    <td className="rp-td-status-cell">
                      <span className={`rp-status-pill ${isDeficit ? 'dem' : 'sup'}`}>
                        {isDeficit ? 'عجز' : 'فائض'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Summary row — only on the last page */}
            {isLast && kpi && (
              <tfoot>
                <tr className="rp-tf-row">
                  <td className="rp-tf-label">الإجمالي / المتوسط</td>
                  <td className="rp-td-dem rp-td-num"><strong>{fmtN(kpi.avgD)}</strong></td>
                  <td className="rp-td-sup rp-td-num"><strong>{fmtN(kpi.avgS)}</strong></td>
                  <td className="rp-td-num">
                    <span style={{ color: kpi.avgG > 0 ? '#b85c4e' : '#007a53', fontWeight: 700 }}>
                      {fmtN(kpi.avgG)}
                    </span>
                  </td>
                  <td className="rp-td-num"><strong>{kpi.defD} / {kpi.total}</strong></td>
                  <td className="rp-td-num">
                    <span className={`rp-pct-pill ${kpi.avgG > 0 ? 'dem' : 'sup'}`}>
                      {Math.round(kpi.defPct)}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )
        return pages.map((pageRows, pi) => (
          <div key={pi} className="rp-page rp-page-content">
            <RpPageHeader
              sectionLabel={`القسم الثالث${pages.length > 1 ? ` — جزء ${pi + 1}/${pages.length}` : ''}`}
              title="التحليل الشهري"
              sub={`متوسطات يومية لكل شهر · ${yrLabel}`}
            />
            <MonthlyTable rows={pageRows} isLast={pi === pages.length - 1} />
            <div className="rp-table-legend">
              <RpIcon icon={FiMoon} size={11} color="#006e96" />
              <span>شهر رمضان</span>
              <span className="rp-leg-sep">·</span>
              <RpIcon icon={FaMosque} size={11} color="#006e96" />
              <span>موسم الحج</span>
            </div>
            <RpPageFooter yrLabel={yrLabel} today={today} />
          </div>
        ))
      })()}

      {/* ══════════════════════════════════════════════════════════
          PAGE 5 — SCENARIO DETAILS
      ══════════════════════════════════════════════════════════ */}
      {opts.scenario && (
        <div className="rp-page rp-page-content">
          <RpPageHeader
            sectionLabel="القسم الرابع"
            title="تعديلات السيناريو الافتراضي"
            sub={`نطاق التطبيق: ${scopeLabel} · ${activeSliders.length} تعديل نشط`}
          />

          {activeSliders.length > 0 ? (
            <>
              <div className="rp-sc-summary">
                <div className="rp-sc-sm-cell">
                  <span className="rp-sc-sm-lbl">تعديلات الطاقة الاستيعابية</span>
                  <strong className="rp-sc-sm-val sup">
                    {activeSliders.filter(s => s.cat === 'supply').length} متغيّر
                  </strong>
                </div>
                <div className="rp-sc-sm-sep" />
                <div className="rp-sc-sm-cell">
                  <span className="rp-sc-sm-lbl">تعديلات المستهدفات</span>
                  <strong className="rp-sc-sm-val dem">
                    {activeSliders.filter(s => s.cat === 'demand').length} متغيّر
                  </strong>
                </div>
                <div className="rp-sc-sm-sep" />
                <div className="rp-sc-sm-cell">
                  <span className="rp-sc-sm-lbl">نطاق التطبيق</span>
                  <strong className="rp-sc-sm-val">{scopeLabel}</strong>
                </div>
              </div>

              <table className="rp-table rp-sc-table">
                <thead>
                  <tr>
                    <th>المتغيّر</th>
                    <th className="rp-th-num">الفئة</th>
                    <th className="rp-th-num">التعديل</th>
                    <th>الأثر المتوقع</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSliders.map((s, i) => {
                    const isSup = s.cat === 'supply'
                    const isPos = s.value > 0
                    const isPositiveEffect = isSup ? isPos : !isPos
                    return (
                      <tr key={i} className={i % 2 === 0 ? 'rp-tr-even' : ''}>
                        <td><strong>{s.label}</strong></td>
                        <td className="rp-td-num">
                          <span className={`rp-cat-pill ${isSup ? 'sup' : 'dem'}`}>
                            {isSup ? 'طاقة استيعابية' : 'مستهدفات'}
                          </span>
                        </td>
                        <td className="rp-td-num">
                          {s.isAbs ? (
                            <span className={`rp-delta-val ${s.value > s.normal ? 'pos' : 'neg'}`}>
                              {s.value} ← القيمة الأساسية: {s.normal}
                            </span>
                          ) : (
                            <span className={`rp-delta-val with-icon ${isPos ? 'pos' : 'neg'}`}>
                              {isPos ? '+' : ''}{s.value}%
                              <RpIcon
                                icon={isPos ? FiArrowUp : FiTrendingDown}
                                size={14}
                                color={isPos ? '#007a53' : '#b85c4e'}
                              />
                            </span>
                          )}
                        </td>
                        <td className={isPositiveEffect ? 'rp-td-effect-pos' : 'rp-td-effect-neg'}>
                          {isSup
                            ? (isPos ? 'رفع الطاقة الاستيعابية' : 'خفض الطاقة الاستيعابية')
                            : (isPos ? 'زيادة الضغط على المنشآت' : 'تخفيف الضغط على المنشآت')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="rp-sc-warning">
                <RpIcon icon={FiAlertTriangle} size={12} color="#92400e" style={{ marginLeft: 6, flexShrink: 0 }} />
                جميع نتائج هذا التقرير تعكس السيناريو المعدَّل ولا تمثّل البيانات الفعلية.
                يُشار إلى التعديلات الافتراضية بنسب مئوية مُطبَّقة على القيم الأساسية.
              </div>
            </>
          ) : (
            <div className="rp-sc-empty">
              <div className="rp-sc-empty-icon">
                <RpIcon icon={FiCheckCircle} size={40} color="#d1d5db" />
              </div>
              <div className="rp-sc-empty-title">لا توجد تعديلات نشطة</div>
              <div className="rp-sc-empty-sub">
                يعكس هذا التقرير البيانات الأساسية دون أي تعديلات افتراضية.
                جميع الأرقام مبنية على القيم الفعلية المُدخلة في قاعدة البيانات.
              </div>
            </div>
          )}

          <RpPageFooter yrLabel={yrLabel} today={today} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PAGE 6 — APPENDIX
      ══════════════════════════════════════════════════════════ */}
      <div className="rp-page rp-page-content">
        <RpPageHeader
          sectionLabel="الملحق"
          title="بيانات التصدير والمنهجية"
          sub="معلومات تقنية وسياق البيانات"
        />

        <div className="rp-ap-section-title">بيانات التقرير</div>
        <table className="rp-table rp-ap-table">
          <tbody>
            {[
              ['تاريخ التصدير', today],
              ['الفترة المحلَّلة', yrLabel],
              ['نوع المستهدفات', demTypeLabel],
              ['نوع الطاقة الاستيعابية', supTypeLabel],
              ['إجمالي نقاط البيانات', `${series.length} يوم`],
              ['أيام رمضان المرصودة', `${ram?.rDays ?? 0} يوم`],
              ['إجمالي أيام العجز', kpi ? `${kpi.defD} يوم (${Math.round(kpi.defPct)}%)` : '—'],
              ['إجمالي أيام الفائض', kpi ? `${kpi.total - kpi.defD} يوم (${100 - Math.round(kpi.defPct)}%)` : '—'],
              ['التعديلات الافتراضية المفعّلة', `${activeSliders.length} تعديل`],
              ['منصة التحليل', 'المنصة الوطنية لدراسات الطاقة الاستيعابية في رحلة ضيوف الرحمن'],
            ].map(([k, v], i) => (
              <tr key={i} className={i % 2 === 0 ? 'rp-tr-even' : ''}>
                <td className="rp-ap-key">{k}</td>
                <td className="rp-ap-val"><strong>{v}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rp-disclaimer">
          <strong>هذا التقرير مُولَّد تلقائياً  من المنصة الوطنية لدراسات الطاقة الاستيعابية في رحلة ضيوف الرحمن، ضمن برنامج خدمة ضيوف الرحمن.
            المعلومات الواردة للاستخدام الداخلي فقط وقد تحتوي على بيانات تقديرية ومستقبلية.
            لا يُعتمد عليها مرجعاً رسمياً نهائياً دون مراجعة الجهات المختصة.</strong>
        </div>

        <RpPageFooter yrLabel={yrLabel} today={today} />
      </div>

    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  PDF GENERATOR — uses CP.pdf as cover, merges via pdf-lib
// ════════════════════════════════════════════════════════════════
async function generatePDF(rootEl, yr, quality, onProgress) {
  const { default: jsPDF } = await import('jspdf')
  const { default: html2canvas } = await import('html2canvas')

  const pages = [...rootEl.querySelectorAll('.rp-page')]
  const W = 210, H = 297
  const scale = quality === 'high' ? 2.5 : 1.8

  onProgress(5)

  const contentDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  for (let i = 0; i < pages.length; i++) {
    onProgress(Math.round((i / pages.length) * 55) + 10)
    const canvas = await html2canvas(pages[i], {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
    })
    const imgData = canvas.toDataURL('image/jpeg', quality === 'high' ? 0.95 : 0.85)
    if (i > 0) contentDoc.addPage()
    contentDoc.addImage(imgData, 'JPEG', 0, 0, W, H)
  }

  onProgress(68)

  const now = new Date()

  const date = now.toLocaleDateString('ar-SA') // التاريخ هجري/ميلادي حسب الإعداد
  const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

  const filename = `تحليل المنصة الوطنية للطاقة الاستيعابية لإيواء مكة المكرمة - ${date}.pdf`

  try {
    const { PDFDocument } = await import('pdf-lib')
    onProgress(72)

    const [coverBuffer, contentArrayBuffer] = await Promise.all([
      fetch('/CP.pdf').then(r => {
        if (!r.ok) throw new Error('CP.pdf not found')
        return r.arrayBuffer()
      }),
      Promise.resolve(contentDoc.output('arraybuffer')),
    ])

    onProgress(80)

    const mergedDoc = await PDFDocument.create()
    const coverDoc = await PDFDocument.load(coverBuffer)
    const coverPages = await mergedDoc.copyPages(coverDoc, coverDoc.getPageIndices())
    coverPages.forEach(p => mergedDoc.addPage(p))

    const contentPdfDoc = await PDFDocument.load(contentArrayBuffer)
    const contentPdfPages = await mergedDoc.copyPages(contentPdfDoc, contentPdfDoc.getPageIndices())
    contentPdfPages.forEach(p => mergedDoc.addPage(p))

    onProgress(90)

    const mergedBytes = await mergedDoc.save()
    const blob = new Blob([mergedBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)

    onProgress(100)
    return filename

  } catch (coverErr) {
    console.warn('[ExportModal] CP.pdf merge skipped:', coverErr.message)
    contentDoc.save(filename)
    onProgress(100)
    return filename
  }
}

// ════════════════════════════════════════════════════════════════
//  EXPORT MODAL
// ════════════════════════════════════════════════════════════════
const STEPS = ['جمع البيانات', 'تجهيز الصفحات', 'توليد PDF', 'التحميل']

export default function ExportModal({ onClose, payload }) {
  const reportRef = useRef(null)

  const [reportName, setReportName] = useState(
    `تقرير تحليل المنصة الوطنية للطاقة الاستيعابية لإيواء مكة المكرمة - ${nowLabel()}`
  )
  const [opts, setOpts] = useState({
    kpis: true, tables: true, insights: true, scenario: true,
  })
  const [quality, setQuality] = useState('standard')
  const [phase, setPhase] = useState('config')
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(0)
  const [errMsg, setErrMsg] = useState('')
  const [recent, setRecent] = useState(() => getRecent())

  const toggleOpt = k => setOpts(o => ({ ...o, [k]: !o[k] }))

  const handleGenerate = useCallback(async () => {
    setPhase('generating')
    setProgress(5)
    setStep(0)
    try {
      await new Promise(r => setTimeout(r, 180))
      setStep(1); setProgress(12)

      await new Promise(r => setTimeout(r, 280))
      setStep(2); setProgress(22)

      const el = reportRef.current
      if (!el) throw new Error('فشل تحميل تخطيط التقرير')

      const filename = await generatePDF(el, payload.yr, quality, p => {
        setProgress(p)
        if (p > 30) setStep(2)
        if (p > 65) setStep(3)
        if (p > 85) setStep(4)
      })

      const entry = { name: reportName, filename, yr: payload.yr, ts: Date.now() }
      const updated = [entry, ...getRecent()].slice(0, 5)
      saveRecent(updated)
      setRecent(updated)
      setStep(4); setProgress(100)
      setPhase('done')
    } catch (e) {
      console.error(e)
      setErrMsg(e.message ?? 'حدث خطأ أثناء التوليد')
      setPhase('error')
    }
  }, [payload, quality, reportName])

  const activeCount = Object.values(payload.sc).filter(v => v !== 0).length

  // Section options config
  const OPTS_CONFIG = [
    { key: 'kpis', Icon: FiBarChart2, label: 'الملخص التنفيذي', sub: 'المؤشرات الرئيسية والرسم البياني' },
    { key: 'tables', Icon: FiCalendar, label: 'جداول التحليل', sub: 'التحليل الشهري وأشد أيام العجز' },
    { key: 'insights', Icon: FiActivity, label: 'الاستنتاجات', sub: 'الرؤى التحليلية وتوزيع الأيام' },
    { key: 'scenario', Icon: FiSliders, label: 'السيناريو الافتراضي', sub: `${activeCount} تعديل نشط` },
  ]

  return (
    <>
      {/* Hidden report layout */}
      <div style={{ position: 'fixed', top: 0, left: '-9999px', width: '794px', zIndex: -1 }}>
        <div ref={reportRef} style={{ width: '100%' }}>
          <ReportLayout payload={payload} opts={opts} />
        </div>
      </div>

      {/* Modal backdrop */}
      <div className="exp-backdrop" onClick={phase === 'config' ? onClose : undefined}>
        <div className="exp-modal" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="exp-header">
            <div className="exp-header-left">
              <div className="exp-header-icon">
                <FiFileText size={20} color="#D4AA52" />
              </div>
              <div>
                <div className="exp-header-title">تصدير تقرير PDF</div>
                <div className="exp-header-sub">
                  {payload.yr
                    ? `تقرير ${payload.yr} · ${payload.series?.length ?? 0} يوم`
                    : `تقرير متعدد السنوات · ${payload.seriesYears?.join('–')}`}
                </div>
              </div>
            </div>
            {phase === 'config' && (
              <button className="exp-close" onClick={onClose}>
                <FiX size={14} />
              </button>
            )}
          </div>

          {/* ── CONFIG ── */}
          {phase === 'config' && (
            <div className="exp-body">
              <div className="exp-field">
                <label className="exp-label">اسم التقرير</label>
                <input
                  className="exp-input"
                  value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  placeholder="اسم التقرير..."
                />
              </div>


              <div className="exp-actions">
                <button className="exp-btn-cancel" onClick={onClose}>إلغاء</button>
                <button className="exp-btn-primary" onClick={handleGenerate}>
                  <FiFileText size={14} />
                  إنشاء التقرير
                </button>
              </div>
            </div>
          )}

          {/* ── GENERATING ── */}
          {phase === 'generating' && (
            <div className="exp-body exp-body-center">
              <div className="exp-gen-spinner">
                <svg width="60" height="60" viewBox="0 0 60 60">
                  {/* Track */}
                  <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(0,188,125,0.12)" strokeWidth="7" />
                  {/* Arc */}
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#00BC7D" strokeWidth="7"
                    strokeLinecap="round" strokeDasharray="90 150" strokeDashoffset="0"
                    style={{ transformOrigin: '30px 30px', animation: 'expSpinOuter 1.1s cubic-bezier(0.4,0,0.2,1) infinite' }} />
                </svg>
              </div>
              <div className="exp-gen-title">جاري إنشاء التقرير...</div>
              <div className="exp-progress-wrap">
                <div className="exp-progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="exp-progress-pct">{progress}%</div>
              <div className="exp-steps">
                {STEPS.map((s, i) => (
                  <div key={i} className={`exp-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                    <div className="exp-step-dot">
                      {i < step
                        ? <FiCheck size={12} />
                        : i === step
                          ? <span className="exp-step-active-dot" />
                          : <span className="exp-step-idle-dot" />}
                    </div>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
              <div className="exp-gen-note">يُرجى عدم إغلاق النافذة أثناء التوليد</div>
            </div>
          )}

          {/* ── DONE ── */}
          {phase === 'done' && (
            <div className="exp-body exp-body-center">
              <div className="exp-done-icon exp-done-success">
                <FiCheckCircle size={48} />
              </div>
              <div className="exp-done-title">تم التصدير بنجاح</div>
              <div className="exp-done-sub">
                تم تحميل <strong>{reportName}</strong> إلى جهازك
              </div>
              <div className="exp-actions" style={{ marginTop: 24 }}>
                <button className="exp-btn-cancel" onClick={onClose}>إغلاق</button>
                <button className="exp-btn-primary"
                  onClick={() => { setPhase('config'); setProgress(0); setStep(0) }}>
                  <FiFileText size={14} />
                  تصدير آخر
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {phase === 'error' && (
            <div className="exp-body exp-body-center">
              <div className="exp-done-icon exp-done-error">
                <FiAlertCircle size={48} />
              </div>
              <div className="exp-done-title">فشل التصدير</div>
              <div className="exp-done-sub">{errMsg}</div>
              <div className="exp-actions" style={{ marginTop: 24 }}>
                <button className="exp-btn-cancel" onClick={onClose}>إغلاق</button>
                <button className="exp-btn-primary"
                  onClick={() => { setPhase('config'); setProgress(0); setStep(0) }}>
                  المحاولة مجدداً
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── buildReportPayload — call from App.jsx ───────────────────────
export function buildReportPayload({ yr, kpi, ram, sc, scope, peakDemand, series, demTypes, supTypes, ramPeriods, hajjPeriod }) {
  const DEM_LABELS = { outside: 'معتمري الخارج', inside: 'معتمري الداخل (مبيت)' }
  const SUP_LABELS = { licensed: 'مرافق مرخصة', future: 'مشاريع مستقبلية', hajj: 'مساكن الحجاج' }

  const demArr = demTypes instanceof Set ? [...demTypes] : (Array.isArray(demTypes) ? demTypes : [demTypes])
  const supArr = supTypes instanceof Set ? [...supTypes] : (Array.isArray(supTypes) ? supTypes : [supTypes])

  const demTypeLabel = demArr.map(k => DEM_LABELS[k] ?? k).join('\n')
  const supTypeLabel = supArr.map(k => SUP_LABELS[k] ?? k).join('\n')
  const SCOPE_LABELS = { all: 'جميع السنوات', year: yr ? `${yr} فقط` : 'السنة المحددة' }

  const byMo = {}
    ; (series ?? []).forEach(r => {
      if (!r.demand && !r.supply) return
      const m = r.date.getMonth()
      const y = r.date.getFullYear()
      const key = `${y}-${String(m).padStart(2, '0')}`
      if (!byMo[key]) byMo[key] = { mo: m, yr: y, name: AR_MON[m], demSum: 0, supSum: 0, n: 0, defDays: 0, isRam: false, isHajj: false }
      byMo[key].demSum += r.demand ?? 0
      byMo[key].supSum += r.supply ?? 0
      byMo[key].n++
      if ((r.demand ?? 0) > (r.supply ?? 0)) byMo[key].defDays++
      if (r.isRamadan) byMo[key].isRam = true
      if (r.isHajj) byMo[key].isHajj = true
    })

  const seriesYears = [...new Set((series ?? []).map(r => r.date.getFullYear()))].sort()

  // ── Compute peakSupply from series ──
  const validSup = (series ?? []).filter(r => r.supply != null && r.supply > 0)
  const peakSupplyComputed = rpFindExtremePeriod(validSup, r => r.supply ?? 0, true)

  // ── Compute maxDef/maxSur fresh from series (using supply-demand gap sign) ──
  // series.gap = supply - demand; negative = deficit
  const defRows = (series ?? []).filter(r => r.gap < 0 && r.demand && r.supply)
  const surRows = (series ?? []).filter(r => r.gap > 0 && r.demand && r.supply)
  const maxDefFresh = rpFindExtremePeriod(defRows, r => r.gap, false) // most negative
  const maxSurFresh = rpFindExtremePeriod(surRows, r => r.gap, true)  // most positive

  // ── Compute maxDef from series (in case kpi.maxDef is missing) ──
  let maxDefComputed = kpi?.maxDef ?? null
  if (!maxDefComputed) {
    let best = null
      ; (series ?? []).forEach(r => {
        const gap = (r.demand ?? 0) - (r.supply ?? 0)
        if (gap > 0 && (best === null || gap > best.gap)) {
          const d = r.date instanceof Date ? r.date : new Date(r.date)
          best = {
            gap,
            dateLabel: `${d.getDate()} ${AR_MON[d.getMonth()]} ${d.getFullYear()}`,
            hijriDate: r.hijriDate ?? null,
            isRamadan: r.isRamadan ?? false,
            isHajj: r.isHajj ?? false,
          }
        }
      })
    maxDefComputed = best
  }

  // Merge maxDef: prefer the fresh one (has .first/.last for period labels)
  const maxDefMerged = maxDefFresh ?? maxDefComputed
  const maxSurMerged = maxSurFresh ?? kpi?.maxSur ?? null
  const kpiEnriched = kpi ? { ...kpi, maxDef: maxDefMerged, maxSur: maxSurMerged } : kpi

  const monthly = Object.entries(byMo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      name: !yr && seriesYears.length > 1 ? `${v.name} ${v.yr}` : v.name,
      mo: v.mo,
      yr: v.yr,
      avgDem: v.n ? Math.round(v.demSum / v.n) : 0,
      avgSup: v.n ? Math.round(v.supSum / v.n) : 0,
      avgGap: v.n ? Math.round((v.demSum - v.supSum) / v.n) : 0,
      defDays: v.defDays,
      totalDays: v.n,
      isRam: v.isRam,
      isHajj: v.isHajj,
    }))

  return {
    yr, kpi: kpiEnriched, ram, sc, scope, peakDemand,
    peakSupply: peakSupplyComputed,
    series: series ?? [],
    monthly,
    seriesYears,
    demTypes: demArr,
    supTypes: supArr,
    demTypeLabel,
    supTypeLabel,
    scopeLabel: SCOPE_LABELS[scope] ?? scope,
    ramPeriods: ramPeriods ?? [],
    hajjPeriod: hajjPeriod ?? null,
  }
}