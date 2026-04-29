import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { C, injectNavStyles, footerStyles, MODAL_CONTENT } from './theme'
import { Navbar, Footer, GlassModal } from './SharedLayout'
import { parseWorkbook, RAMADAN, HAJJ } from './parse.js'
import ExportModal, { buildReportPayload } from './ExportModal.jsx'
import {
  ComposedChart, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts'
import * as XLSX from 'xlsx';
import { FiMoon, FiAlertTriangle, FiCheck, FiCheckCircle, FiTrendingUp, FiTrendingDown, FiCalendar, FiArrowUp, FiArrowDown, FiInbox, FiClipboard, FiInfo, FiX, FiSliders } from 'react-icons/fi'
import { MdHotel, MdConstruction, MdFlightTakeoff, MdDirectionsBus, MdBed, MdWarning, MdSwapHoriz, MdStraighten, MdBarChart, MdCircle, MdDiamond } from 'react-icons/md'
import { FaMosque } from 'react-icons/fa'

/* ════════════════════════════════════════════════════════════════
   DESIGN TOKENS
════════════════════════════════════════════════════════════════ */
const T = {
  // ── Surfaces — light mode
  bg: '#fefefe', bgM: '#f4f2ee', bgL: '#ece8e1',
  card: 'rgba(65,64,66,0.04)', border: 'rgba(65,64,66,0.10)',
  hover: 'rgba(150,113,38,0.06)',

  // ── Gold — Primary / CTA / Warning / Deficit
  bronze: '#967126', bronzeL: '#b08432', bronzeXL: '#c9a048',

  // ── Emerald — Brand / Supply / Surplus / Positive
  green: '#007a53', greenL: '#009a65', greenXL: '#1aae78', greenDk: '#005236',
  sideHdr: '#2c2b2d', sideBg: '#414042', sideDk: '#1a1919',

  // ── الطاقة الاستيعابية — Supply = Emerald
  sup: '#007a53', supL: 'rgba(0,122,83,0.22)', supBg: 'rgba(0,122,83,0.08)',

  // ── المستهدفات — Demand = Gold/Bronze
  dem: '#967126', demL: 'rgba(150,113,38,0.24)', demBg: 'rgba(150,113,38,0.08)',

  // ── Outcome state — Rust for deficit, Emerald for surplus
  deficit: '#b85c4e', deficitL: 'rgba(184,92,78,0.28)', deficitBg: 'rgba(184,92,78,0.08)',
  surplus: '#007a53', surplusL: 'rgba(0,122,83,0.22)', surplusBg: 'rgba(0,122,83,0.08)',

  // ── Demand sub-types
  outside: '#7a5a1e',   // Deep gold  — زوار خارجيون
  inside: '#d4a843',    // Light gold — زوار داخليون

  // ── Seasons — Teal-blue family from #006e96
  ram: '#006e96', ramL: 'rgba(0,110,150,0.22)', ramBg: 'rgba(0,110,150,0.07)',
  hajj: '#004d6a', hajjL: 'rgba(0,77,106,0.22)', hajjBg: 'rgba(0,77,106,0.07)',

  // ── Text — dark on light
  txt: '#414042', txtSub: '#75787b', txtDim: 'rgba(65,64,66,0.45)',

  // ── Warning — Gold
  warn: '#967126', warnBg: 'rgba(150,113,38,0.08)', warnBdr: 'rgba(150,113,38,0.3)',
}
const YEARS = [2026, 2027, 2028, 2029, 2030]
const AR_MON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

/* ════════════════════════════════════════════════════════════════
   UTILS
════════════════════════════════════════════════════════════════ */
const fmtN = n => { if (n == null || isNaN(n)) return '—'; const a = Math.abs(n); return a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}م` : Math.round(a).toLocaleString('en-US').replace(/,/g, '،') }
const fmtFull = n => n == null ? '—' : Math.round(Math.abs(n)).toLocaleString('en-US').replace(/,/g, '،')
const fmtExact = n => { if (n == null || isNaN(n)) return '—'; const a = Math.abs(n); const rounded = Math.round(a * 10) / 10; return rounded.toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/,/g, '،') }
const pctStr = v => (v >= 0 ? `+${v}` : `${v}`) + '%'
const fmtDate = d => d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '—'

/* ─── findExtremePeriod ──────────────────────────────────────────
   Given an array of rows (each with a .date Date field and already
   having .dateLabel), returns the LONGEST consecutive calendar run
   that all share the extreme (max or min) value of getVal(row).
   Returns { value, first, last, days, isSingleDay }
─────────────────────────────────────────────────────────────────── */
const findExtremePeriod = (rows, getVal, findMax = true) => {
  if (!rows.length) return null
  const extremeVal = findMax
    ? rows.reduce((m, r) => { const v = getVal(r); return v > m ? v : m }, -Infinity)
    : rows.reduce((m, r) => { const v = getVal(r); return v < m ? v : m }, Infinity)
  const peakRows = rows.filter(r => getVal(r) === extremeVal).sort((a, b) => a.date - b.date)
  if (!peakRows.length) return null
  const groups = []; let cur = [peakRows[0]]
  for (let i = 1; i < peakRows.length; i++) {
    const diff = Math.round((peakRows[i].date - peakRows[i - 1].date) / 86400000)
    if (diff <= 1) cur.push(peakRows[i])
    else { groups.push(cur); cur = [peakRows[i]] }
  }
  groups.push(cur)
  const longest = groups.reduce((m, g) => g.length > m.length ? g : m, groups[0])
  const first = longest[0], last = longest[longest.length - 1]
  return { value: extremeVal, first, last, days: longest.length, isSingleDay: longest.length === 1 }
}

/* ════════════════════════════════════════════════════════════════
   RAMADAN HELPERS — supports 2030 dual-Ramadan (array format)
════════════════════════════════════════════════════════════════ */
// RAMADAN[yr] is always an array in parse.js; this guards legacy single-obj too
const getRamadanPeriods = yr => {
  const r = RAMADAN[yr]
  if (!r) return []
  return Array.isArray(r) ? r : [r]
}
// Arabic ordinal labels
const RAM_ORDINAL = ['الأول', 'الثاني', 'الثالث']

/* ════════════════════════════════════════════════════════════════
   SHARED TOOLTIP WRAPPER — Recharts chart tooltips
   Renders via createPortal into document.body at the live mouse
   position (position:fixed), so it can never be clipped by any
   ancestor overflow, stacking context, or Recharts inline style.
════════════════════════════════════════════════════════════════ */
const TT = ({ children, minW = 160 }) => {
  const [pos, setPos] = useState({ x: -9999, y: -9999 })
  const divRef = useRef(null)

  useEffect(() => {
    const GAP = 14
    const EDGE = 8

    const onMove = e => {
      const node = divRef.current
      const w = node ? node.offsetWidth : 340
      const h = node ? node.offsetHeight : 0
      const vw = window.innerWidth
      const vh = window.innerHeight

      let x = e.clientX + GAP
      let y = e.clientY + GAP

      /* only clamp once we have a real measured height */
      if (h > 0 && y + h + EDGE > vh) y = e.clientY - h - GAP
      if (x + w + EDGE > vw) x = e.clientX - w - GAP
      if (x < EDGE) x = EDGE
      if (y < EDGE) y = EDGE

      setPos({ x, y })
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    return () => document.removeEventListener('mousemove', onMove)
  }, [])

  return createPortal(
    <div ref={divRef} style={{
      position: 'fixed',
      left: pos.x,
      top: pos.y,
      background: '#ffffff',
      border: '1px solid rgba(65,64,66,0.14)',
      borderRadius: 12,
      color: T.txt, fontSize: 12,
      boxShadow: '0 8px 32px rgba(65,64,66,0.18)',
      padding: '12px 15px',
      minWidth: minW,
      maxWidth: 'min(calc(100vw - 24px), 340px)',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
      zIndex: 99999,
      pointerEvents: 'none',
      isolation: 'isolate',
      fontFamily: "'BahijTheSansArabic', 'Segoe UI', sans-serif",
    }}>
      {children}
    </div>,
    document.body
  )
}

/* ════════════════════════════════════════════════════════════════
   PERIOD LABEL — renders a single date or a date range
════════════════════════════════════════════════════════════════ */
const PeriodLabel = ({ period }) => {
  if (!period) return <span style={{ color: T.txtDim }}>—</span>
  if (period.isSingleDay) {
    return (
      <>
        {period.first.dateLabel}
        {period.first.hijriDate ? <> · {period.first.hijriDate}</> : ''}
      </>
    )
  }
  const hasDates = period.first.dateLabel || period.last.dateLabel
  const hasHijri = period.first.hijriDate || period.last.hijriDate
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {hasDates && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: T.txtDim }}>من</span>
          <span style={{ fontSize: 10.5, color: T.txtSub }}>{period.first.dateLabel}</span>
          <span style={{ fontSize: 10, color: T.txtDim }}>حتى</span>
          <span style={{ fontSize: 10.5, color: T.txtSub }}>{period.last.dateLabel}</span>
        </span>
      )}
      {hasHijri && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: T.txtDim }}>من</span>
          <span style={{ fontSize: 10.5, color: T.txtDim }}>{period.first.hijriDate}</span>
          <span style={{ fontSize: 10, color: T.txtDim }}>حتى</span>
          <span style={{ fontSize: 10.5, color: T.txtDim }}>{period.last.hijriDate}</span>
        </span>
      )}
    </span>
  )
}
/* ════════════════════════════════════════════════════════════════
   SEGMENT BUTTON
════════════════════════════════════════════════════════════════ */
const Seg = ({ active, onClick, children, color }) => (
  <button className={`seg-btn${active ? ' active' : ''}`} onClick={onClick}
    style={{ '--seg-color': color || T.bronze, ...(active ? { background: color || T.bronze, borderColor: color || T.bronze } : {}) }}>
    {children}
  </button>
)

/* ════════════════════════════════════════════════════════════════
   KPI CARD
════════════════════════════════════════════════════════════════ */
const Kpi = ({ label, value, sub, color, icon }) => (
  <div className="card fade-up"
    style={{ padding: '14px 16px', borderTop: `2px solid ${color}`, borderRadius: 12, transition: 'transform 0.25s, box-shadow 0.25s', cursor: 'default' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 40px rgba(65,64,66,0.14),0 0 0 1px ${color}28` }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: T.txtSub, lineHeight: 1.45, flex: 1 }}>{label}</div>
      {icon && <span style={{ fontSize: 17, opacity: .75 }}>{icon}</span>}
    </div>
    <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11.5, color: T.txtDim, marginTop: 6 }}>{sub}</div>}
  </div>
)

/* ════════════════════════════════════════════════════════════════
   SLIDER — percent, full −100..+100
════════════════════════════════════════════════════════════════ */
const Slider = ({ label, value, onChange, color, icon }) => {
  const MIN = -100, MAX = 100
  const isNeg = value < 0
  const isEmpty = value === 0
  const accent = isEmpty ? T.txtDim : isNeg ? T.deficit : color
  const id = `sl-${label.replace(/\s+/g, '-')}`
  // fill from zero toward thumb
  const pct = ((value - MIN) / (MAX - MIN)) * 100  // 0–100 thumb position
  const fillLeft = isNeg ? pct : 50
  const fillW = Math.abs(pct - 50)

  return (
    <div className={`sc-slider${isEmpty ? '' : ' sc-slider--on'}${isNeg ? ' sc-slider--neg' : ''}`}
      style={{ '--acc': accent }}>
      {/* top row: icon + label + live value */}
      <div className="sc-sl-row">
        {icon && <span className="sc-sl-icon">{icon}</span>}
        <label className="sc-sl-lbl" htmlFor={id}>{label}</label>
        <span className="sc-sl-val" style={{
          color: accent,
          background: isEmpty ? 'transparent' : isNeg ? T.deficitBg : `${color}14`,
          borderColor: isEmpty ? 'rgba(65,64,66,0.10)' : isNeg ? T.deficitL : `${color}38`,
        }}>{pctStr(value)}</span>
      </div>
      {/* track */}
      <div className="sc-sl-track" dir="ltr">
        <div className="sc-sl-groove" />
        {!isEmpty && <div className="sc-sl-fill" style={{ left: `${fillLeft}%`, width: `${fillW}%` }} />}
        <div className="sc-sl-notch" style={{ left: '50%' }} />
        <input id={id} className="sc-sl-input" type="range"
          min={MIN} max={MAX} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))} />
      </div>
      {/* edge labels */}
      <div className="sc-sl-edge" dir="ltr"><span>−100%</span><span>0</span><span>+100%</span></div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   SLIDER ABS — absolute value (beds-per-room), with normal marker
════════════════════════════════════════════════════════════════ */
const SliderAbs = ({ label, sublabel, value, onChange, color, icon, min, max, step, normal }) => {
  const isChanged = value !== normal
  const isBelow = value < normal
  const accent = !isChanged ? T.txtDim : isBelow ? T.deficit : color
  const normPct = ((normal - min) / (max - min)) * 100
  const valPct = ((value - min) / (max - min)) * 100
  const fillLeft = Math.min(normPct, valPct)
  const fillW = Math.abs(valPct - normPct)
  const id = `slabs-${label.replace(/\s+/g, '-')}`

  return (
    <div className={`sc-slider${isChanged ? ' sc-slider--on' : ''}${isBelow && isChanged ? ' sc-slider--neg' : ''}`}
      style={{ '--acc': accent }}>
      <div className="sc-sl-row">
        {icon && <span className="sc-sl-icon">{icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <label className="sc-sl-lbl" htmlFor={id}>{label}</label>
          {sublabel && <div style={{ fontSize: 9, color: T.txtDim, lineHeight: 1, marginTop: 1 }}>{sublabel}</div>}
        </div>
        <span className="sc-sl-val" style={{
          color: accent,
          background: !isChanged ? 'transparent' : isBelow ? T.deficitBg : `${color}14`,
          borderColor: !isChanged ? 'rgba(65,64,66,0.10)' : isBelow ? T.deficitL : `${color}38`,
        }}>{value.toFixed(1)}</span>
      </div>
      <div className="sc-sl-track" dir="ltr">
        <div className="sc-sl-groove" />
        {isChanged && <div className="sc-sl-fill" style={{ left: `${fillLeft}%`, width: `${fillW}%` }} />}
        {/* normal-value marker */}
        <div className="sc-sl-notch sc-sl-notch--normal" style={{ left: `${normPct}%` }}>
          <span className="sc-sl-notch-lbl">{normal}</span>
        </div>
        <input id={id} className="sc-sl-input" type="range"
          min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))} />
      </div>
      <div className="sc-sl-edge" dir="ltr"><span>{min}</span><span style={{ color: 'rgba(65,64,66,0.40)', fontSize: 8 }}>افتراضي: {normal}</span><span>{max}</span></div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   INFO BADGE — always-portal tooltip with smart viewport positioning.

   Strategy
   ─────────
   1. Always renders into document.body via createPortal → zero risk
      of being clipped by any ancestor overflow/transform/stacking.
   2. On every show, calls getBoundingClientRect() to know exactly
      where the badge is relative to the viewport.
   3. Vertical: prefers BELOW the badge; falls back to ABOVE when
      there isn't room (< MIN_HEIGHT px of space below).
   4. Horizontal: right-aligns to the badge edge, then clamps so the
      box never crosses the left or right viewport margin.
   5. Touch support: tap toggles; a document click listener dismisses
      when tapping elsewhere (mouseLeave doesn't fire on touch).
════════════════════════════════════════════════════════════════ */
function InfoBadge({ text }) {
  const [visible, setVisible] = useState(false)
  const [ttStyle, setTtStyle] = useState({})
  const ref = useRef(null)

  /* ── geometry constants ── */
  const TT_W = 220        // desired tooltip width (px)
  const EDGE_GAP = 10     // minimum distance from viewport edge (px)
  const ARROW_GAP = 8     // gap between badge bottom/top and tooltip (px)
  const MIN_HEIGHT = 56   // minimum vertical space needed to render below/above

  const computeTtStyle = useCallback(() => {
    if (!ref.current) return {}
    const r = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    /* ── vertical placement ── */
    const spaceBelow = vh - r.bottom - EDGE_GAP
    const spaceAbove = r.top - EDGE_GAP
    let topVal, bottomVal

    if (spaceBelow >= MIN_HEIGHT) {
      /* preferred: below */
      topVal = r.bottom + ARROW_GAP
    } else if (spaceAbove >= MIN_HEIGHT) {
      /* fallback: above */
      bottomVal = vh - r.top + ARROW_GAP
    } else {
      /* last resort: below but clamped to keep inside viewport */
      topVal = Math.max(EDGE_GAP, Math.min(r.bottom + ARROW_GAP, vh - MIN_HEIGHT - EDGE_GAP))
    }

    /* ── horizontal placement ── */
    /* Start right-aligned to the badge; then clamp both edges */
    const effectiveW = Math.min(TT_W, vw - EDGE_GAP * 2)
    let leftVal = r.right - effectiveW
    leftVal = Math.max(EDGE_GAP, Math.min(leftVal, vw - effectiveW - EDGE_GAP))

    const s = {
      position: 'fixed',
      width: effectiveW,
      maxWidth: `calc(100vw - ${EDGE_GAP * 2}px)`,
      left: leftVal,
      zIndex: 99999,
      pointerEvents: 'none',
    }
    if (topVal !== undefined) s.top = topVal
    if (bottomVal !== undefined) s.bottom = bottomVal
    return s
  }, [])

  const showTooltip = useCallback(() => {
    setTtStyle(computeTtStyle())
    setVisible(true)
  }, [computeTtStyle])

  const hideTooltip = useCallback(() => setVisible(false), [])

  /* tap-to-toggle for touch devices */
  const handleClick = useCallback((e) => {
    e.stopPropagation()
    if (visible) hideTooltip()
    else showTooltip()
  }, [visible, showTooltip, hideTooltip])

  /* dismiss when user taps anywhere else on the page */
  useEffect(() => {
    if (!visible) return
    const dismiss = () => hideTooltip()
    document.addEventListener('click', dismiss, { passive: true })
    return () => document.removeEventListener('click', dismiss)
  }, [visible, hideTooltip])

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label="معلومات إضافية"
      aria-expanded={visible}
    >
      {/* ── badge circle ── */}
      <div style={{
        width: 15, height: 15, borderRadius: '50%',
        border: `1.5px solid ${visible ? 'rgba(65,64,66,0.45)' : 'rgba(65,64,66,0.15)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700,
        color: visible ? 'rgba(65,64,66,0.60)' : 'rgba(65,64,66,0.35)',
        cursor: 'default', flexShrink: 0, transition: 'all 0.18s ease',
        minWidth: 15, minHeight: 15,
        userSelect: 'none',
      }}>i</div>

      {/* ── portal tooltip — always escapes any stacking context ── */}
      {visible && createPortal(
        <div style={{
          ...ttStyle,
          background: '#ffffff',
          border: '1px solid rgba(65,64,66,0.13)',
          borderRadius: 9,
          padding: '9px 12px',
          fontSize: 11,
          color: 'rgba(65,64,66,0.72)',
          lineHeight: 1.65,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          boxShadow: '0 8px 28px rgba(65,64,66,0.16)',
          fontFamily: "'Cairo', sans-serif",
          direction: 'rtl',
          /* Subtle fade-in without layout jank */
          animation: 'fadeUp 0.14s ease both',
        }}>{text}</div>,
        document.body
      )}
    </div>
  )
}

const ChartCard = ({ title, accent, info, children, className = '', style = {}, headerExtra }) => (
  <div className={`card chart-card ${className}`}
    style={{ padding: '16px 16px 14px', ...style }}>
    <div className="chart-card-header" style={{ marginBottom: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: T.txt, lineHeight: 1.2 }}>{title}</span>
          {info && <InfoBadge text={info} />}
        </div>
      </div>
      {headerExtra && <div className="chart-card-header-extra">{headerExtra}</div>}
    </div>
    {children}
  </div>
)

/* ════════════════════════════════════════════════════════════════
   MINI CHART 1 — DONUT: deficit vs surplus days
════════════════════════════════════════════════════════════════ */
function DonutChart({ donut, defPct }) {
  const total = donut.reduce((s, d) => s + d.value, 0)
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const p = payload[0]
    return (
      <TT minW={155}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', background: p.payload.color,
            boxShadow: `0 0 6px ${p.payload.color}80`
          }} />
          <span style={{ fontWeight: 800, fontSize: 13 }}>{p.name}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: p.payload.color, lineHeight: 1 }}>
          {p.value} <span style={{ fontSize: 10, fontWeight: 400, color: T.txtDim }}>يوم</span>
        </div>
        <div style={{ fontSize: 10.5, color: T.txtDim, marginTop: 5 }}>
          {total ? Math.round(p.value / total * 100) : 0}% من إجمالي الأيام
        </div>
      </TT>
    )
  }
  return (
    <ChartCard title="نسبة أيام العجز والفائض" accent={T.deficit}
      info="يوضح نسبة أيام العجز مقارنةً بأيام الفائض خلال الفترة المحددة">
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={155} minWidth={0}>
          <PieChart>
            <Pie data={donut} cx="50%" cy="50%"
              innerRadius={46} outerRadius={68} paddingAngle={5}
              dataKey="value" stroke="none" cornerRadius={5}
              animationBegin={80} animationDuration={1200} animationEasing="ease-out">
              {donut.map((e, i) => (
                <Cell key={i} fill={e.color} opacity={0.92}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 9999 }} allowEscapeViewBox={{ x: true, y: true }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: '52%', left: '50%', transform: 'translate(-50%,-52%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: defPct > 50 ? T.deficit : T.surplus, lineHeight: 1 }}>{defPct > 50 ? defPct : 100 - defPct}%</div>
          <div style={{ fontSize: 8.5, color: T.txtDim, marginTop: 3, textTransform: 'uppercase' }}>{defPct > 50 ? 'عجز' : 'فائض'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 6 }}>
        {donut.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.txtSub }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0,
              boxShadow: `0 0 5px ${s.color}55`
            }} />
            {s.name} <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

/* ════════════════════════════════════════════════════════════════
   MINI CHART 2 — MONTHLY gap (bars + styled)
════════════════════════════════════════════════════════════════ */
function MonthlyBarChart({ monthly, monthlyHijri }) {
  const [calType, setCalType] = useState('gregorian') // 'gregorian' | 'hijri'
  const data = calType === 'hijri' ? (monthlyHijri ?? []) : monthly

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const v = payload[0]?.value
    const def = v < 0
    return (
      <TT minW={180}>
        <div style={{ fontWeight: 800, fontSize: 13, color: T.txt, marginBottom: 5 }}>{label}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 18, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: T.txtSub }}>{def ? 'متوسط العجز' : 'متوسط الفائض'}</span>
          <strong style={{ fontSize: 18, color: def ? T.deficit : T.surplus }}>{fmtFull(Math.abs(v))}</strong>
        </div>
        <div style={{ fontSize: 9.5, color: T.txtDim, marginTop: 3 }}>سرير / يوم</div>
      </TT>
    )
  }

  /* Custom tick for month names — splits two-word names on small screens */
  const MonthTick = ({ x, y, payload }) => {
    const name = payload?.value ?? ''
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (
        <text x={x} y={y} textAnchor="middle" fill={T.txtDim} style={{ fontSize: 8 }}>
          <tspan x={x} dy="0">{parts[0]}</tspan>
          <tspan x={x} dy="11">{parts.slice(1).join(' ')}</tspan>
        </text>
      )
    }
    return (
      <text x={x} y={y + 4} textAnchor="middle" fill={T.txtDim} style={{ fontSize: 8 }}>
        {name}
      </text>
    )
  }

  return (
    <ChartCard title="العجز أو الفائض الشهري"
      info="يوضح الفرق بين الطلب والطاقة الاستيعابية لكل شهر"
      accent={T.bronze} className="monthly-chart-wide"
      headerExtra={
        <div style={{ display: 'flex', background: 'rgba(65,64,66,0.06)', borderRadius: 8, padding: 2, gap: 2 }}>
          {[{ id: 'gregorian', label: 'الشهور الميلادية' }, { id: 'hijri', label: 'الشهور الهجرية' }].map(opt => (
            <button key={opt.id} onClick={() => setCalType(opt.id)}
              style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: calType === opt.id ? 800 : 500,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
                background: calType === opt.id ? '#ffffff' : 'transparent',
                color: calType === opt.id ? T.bronze : T.txtSub,
                boxShadow: calType === opt.id ? '0 1px 4px rgba(65,64,66,0.12)' : 'none',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      }>

      <div style={{ display: 'flex', gap: 14, marginBottom: 8 }}>
        {[{ c: T.deficit, l: 'عجز' }, { c: T.surplus, l: 'فائض' }].map(x => (
          <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.txtDim }}>
            <span style={{ width: 10, height: 3, background: x.c, borderRadius: 2, display: 'inline-block' }} />{x.l}
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={160} minWidth={0}>
        <BarChart data={data} margin={{ top: 8, right: 3, left: -35, bottom: 2 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(65,64,66,0.08)" vertical={false} />
          <XAxis dataKey="name" type="category"
            tick={<MonthTick />}
            axisLine={false} tickLine={false} interval={0}
            reversed={true}
            height={35}
            tickMargin={6}
          />
          <YAxis type="number"
            tick={{ fontSize: 9, fill: T.txtDim }}
            axisLine={false} tickLine={false}
            tickFormatter={v => Math.abs(v) >= 1_000_000 ? `${(Math.abs(v) / 1_000_000).toFixed(1)}م` : Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(0)}ألف` : `${Math.abs(v)}`}
            width={46} />
          <ReferenceLine y={0} stroke="rgba(65,64,66,0.28)" strokeWidth={1.5} strokeDasharray="4 3" />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(65,64,66,0.03)', radius: 4 }}
            allowEscapeViewBox={{ x: true, y: true }}
            position={{ y: -10 }}
            wrapperStyle={{ zIndex: 9999 }}
          />
          <Bar dataKey="gap" radius={[4, 4, 0, 0]} maxBarSize={20}
            animationBegin={150} animationDuration={1100} animationEasing="ease-out">
            {data.map((e, i) => (
              <Cell key={i}
                fill={e.gap < 0 ? T.deficit : T.surplus}
                strokeWidth={0} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ════════════════════════════════════════════════════════════════
   MINI CHART 3 — SEASONAL RADIAL BAR: deficit % per period
════════════════════════════════════════════════════════════════ */
function SeasonalRadialBar({ seasonal }) {
  const data = [...seasonal].sort((a, b) => a.defPct - b.defPct).map(s => ({ ...s, fill: s.color }))
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const p = payload[0]
    const item = seasonal.find(s => s.name === p.payload.name)
    return (
      <TT minW={160}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.payload.color }} />
          <span style={{ fontWeight: 800, fontSize: 13 }}>{p.payload.name}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: p.payload.color, lineHeight: 1 }}>
          {p.payload.defPct}%
        </div>
        <div style={{ fontSize: 10, color: T.txtDim, marginTop: 5 }}>
          نسبة أيام العجز{item?.days > 0 ? ` · ${fmtFull(item.days)} يوم` : ''}
        </div>
      </TT>
    )
  }
  return (
    <ChartCard title="حالات العجز حسب الموسم" accent={T.ram}
      info="يوضح نسبة أيام العجز في كل موسم (رمضان، الحج، باقي الأيام)">
      <div style={{ position: 'relative', paddingTop: '10px' }}>
        <ResponsiveContainer width="100%" height={160} minWidth={0}>
          <RadialBarChart cx="50%" cy="50%" innerRadius="28%" outerRadius="92%"
            data={data} startAngle={180} endAngle={-180}>
            <RadialBar dataKey="defPct" cornerRadius={5}
              background={{ fill: 'rgba(65,64,66,0.04)' }}
              animationBegin={200} animationDuration={1200} animationEasing="ease-out">
              {data.map((e, i) => (<Cell key={i} fill={e.color} fillOpacity={0.88} />))}
            </RadialBar>
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 9999 }} allowEscapeViewBox={{ x: true, y: true }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
          {seasonal.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.txtSub }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              {s.name}
              <strong style={{ color: s.color }}>{s.defPct}%</strong>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

/* ════════════════════════════════════════════════════════════════
   RAMADAN QUEUE
   - Measures viewport width via ResizeObserver
   - Card width = (containerW - GAP) / 2  → exactly 2 whole cards visible
   - Track = 2N cards, translateX(-50%) = N cards = perfect seamless loop
   - direction:ltr on viewport so scroll is always left (overrides RTL page)
════════════════════════════════════════════════════════════════ */
function RamadanCarousel({ periods = [] }) {
  const GAP = 12   // gap between cards (px)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const [cardW, setCardW] = useState(210)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const dragStart = useRef(null)
  const scrollStart = useRef(0)
  const animRef = useRef(null)
  const posRef = useRef(0)
  const speedRef = useRef(0)

  useEffect(() => {
    if (!viewportRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w <= 0) return
      const vw = window.innerWidth
      if (vw <= 599) {
        setCardW(Math.floor((w - GAP) / 1.3))  // ~1.3 cards visible on iPhone
      } else if (vw <= 1180) {
        setCardW(Math.floor((w - GAP) / 2))     // 2 cards on iPad
      } else {
        setCardW(Math.floor((w - GAP * 2) / 3)) // 3 cards on desktop
      }
    })
    obs.observe(viewportRef.current)
    return () => obs.disconnect()
  }, [])

  const SLOT = cardW + GAP   // total width per card slot

  const visibleCards = typeof window !== 'undefined'
    ? window.innerWidth <= 599 ? 1 : window.innerWidth <= 1180 ? 2 : 3
    : 3
  // Scroll when 3+ cards (including when exactly equal to visible)
  const needsScroll = periods.length >= 3 || periods.length > visibleCards
  const track = needsScroll ? [...periods, ...periods] : periods
  // Speed: 4 s per card, min 8 s total
  const duration = Math.max(periods.length * 4, 8)
  const totalScrollWidth = periods.length * SLOT

  // --- Auto-scroll animation using requestAnimationFrame ---
  useEffect(() => {
    if (!needsScroll || !trackRef.current) return
    const speed = totalScrollWidth / (duration * 60) // pixels per frame at 60fps
    speedRef.current = speed
    let pos = posRef.current
    let lastTime = performance.now()

    const animate = (now) => {
      if (!isDragging && !isHovered) {
        const dt = (now - lastTime) / (1000 / 60) // normalize to 60fps
        pos += speedRef.current * dt
        if (pos >= totalScrollWidth) pos -= totalScrollWidth
        posRef.current = pos
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${pos}px)`
        }
      }
      lastTime = now
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [needsScroll, isDragging, isHovered, totalScrollWidth, duration])

  // --- Mouse drag handlers ---
  const handleMouseDown = (e) => {
    if (!needsScroll) return
    setIsDragging(true)
    dragStart.current = e.clientX
    scrollStart.current = posRef.current
    e.preventDefault()
  }
  const handleMouseMove = (e) => {
    if (!isDragging || dragStart.current == null) return
    const diff = dragStart.current - e.clientX
    let newPos = scrollStart.current + diff
    if (newPos < 0) newPos += totalScrollWidth
    if (newPos >= totalScrollWidth) newPos -= totalScrollWidth
    posRef.current = newPos
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${newPos}px)`
    }
  }
  const handleMouseUp = () => {
    setIsDragging(false)
    dragStart.current = null
  }

  // --- Touch drag handlers ---
  const handleTouchStart = (e) => {
    if (!needsScroll) return
    setIsDragging(true)
    dragStart.current = e.touches[0].clientX
    scrollStart.current = posRef.current
  }
  const handleTouchMove = (e) => {
    if (!isDragging || dragStart.current == null) return
    const diff = dragStart.current - e.touches[0].clientX
    let newPos = scrollStart.current + diff
    if (newPos < 0) newPos += totalScrollWidth
    if (newPos >= totalScrollWidth) newPos -= totalScrollWidth
    posRef.current = newPos
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${newPos}px)`
    }
  }
  const handleTouchEnd = () => {
    setIsDragging(false)
    dragStart.current = null
  }

  // Global mouse up listener
  useEffect(() => {
    if (isDragging) {
      const up = () => handleMouseUp()
      const move = (e) => handleMouseMove(e)
      document.addEventListener('mouseup', up)
      document.addEventListener('mousemove', move)
      return () => {
        document.removeEventListener('mouseup', up)
        document.removeEventListener('mousemove', move)
      }
    }
  }, [isDragging])

  const RamRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: T.txtSub }}>{label}</span>
      <strong style={{ fontSize: 12, color: T.txt }}>{value}</strong>
    </div>
  )

  const PeriodCard = ({ p }) => (
    <div style={{
      width: cardW,
      flexShrink: 0,
      marginRight: GAP,
      background: 'rgba(65,64,66,0.03)',
      borderRadius: 10,
      border: '1px solid rgba(65,64,66,0.10)',
      padding: '10px 12px',
      boxSizing: 'border-box',
      direction: 'rtl',
      userSelect: 'none',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.ram, marginBottom: 8 }}>{p.label}</div>
      <div style={{ fontSize: 10.5, color: T.txtSub, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.ram, flexShrink: 0 }} />{p.dateRange}
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.ram, flexShrink: 0 }} />{p.days} يوم
      </div>
      {p.days > 0 ? (
        <>
          <div style={{
            borderRadius: 7, padding: '6px 9px', fontSize: 11, fontWeight: 800, marginBottom: 9,
            background: p.pct > 50 ? T.deficitBg : T.surplusBg,
            color: p.pct > 50 ? T.deficit : T.surplus,
            border: `1px solid ${p.pct > 50 ? T.deficitL : T.surplusL}`
          }}>
            {p.pct > 50
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiAlertTriangle size={11} /> عجز في {Math.round(p.pct)}% من الأيام</span>
              : <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiCheckCircle size={11} /> فائض في {Math.round(100 - p.pct)}% من الأيام</span>}
          </div>
          <RamRow label="متوسط العجز" value={`${fmtFull(p.avg)} سرير/يوم`} />
          {p.max?.gap < 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, color: T.txtSub }}>أعلى عجز</span>
                <strong style={{ fontSize: 12, color: T.deficit }}>
                  {fmtFull(-p.max.gap)}{' '}
                  <span style={{ fontSize: 10, fontWeight: 500, color: T.txtDim }}>سرير/يوم</span>
                </strong>
              </div>
              <div style={{ fontSize: 10.5, color: T.txtSub, marginTop: 1, textAlign: 'left' }}>
                {p.max.dateLabel}{p.max.hijriDate ? <span> · {p.max.hijriDate}</span> : ''}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 11, color: T.txtDim }}>لا توجد بيانات</div>
      )}
    </div>
  )

  return (
    <div className="card analysis-ram-card" style={{
      padding: 14,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexShrink: 0, direction: 'rtl' }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: T.txtSub, display: 'flex', alignItems: 'center', gap: 7 }}>
          <FiMoon size={13} style={{ color: T.ram, flexShrink: 0 }} /> تحليل شهر رمضان
          <InfoBadge text="يوضح حالة العجز أو الفائض في الطاقة الاستيعابية خلال شهر رمضان" />
        </div>
      </div>

      {/* Ref container for ResizeObserver — always rendered */}
      <div ref={viewportRef} style={{ position: 'relative' }}>

        {/* Static cards (1-2): rendered directly in RTL — NO scrolling viewport */}
        {periods.length > 0 && !needsScroll && (
          <div style={{
            display: 'flex', gap: GAP, direction: 'rtl',
            padding: '0 2px',
          }}>
            {periods.map((p, i) => (
              <div key={i} style={{
                flex: periods.length === 1 ? '1 1 auto' : '1 1 0%',
                minWidth: 0,
              }}>
                <div style={{
                  background: 'rgba(65,64,66,0.03)',
                  borderRadius: 10,
                  border: '1px solid rgba(65,64,66,0.10)',
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                  direction: 'rtl',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.ram, marginBottom: 8 }}>{p.label}</div>
                  <div style={{ fontSize: 10.5, color: T.txtSub, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.ram, flexShrink: 0 }} />{p.dateRange}
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.ram, flexShrink: 0 }} />{p.days} يوم
                  </div>
                  {p.days > 0 ? (
                    <>
                      <div style={{
                        borderRadius: 7, padding: '6px 9px', fontSize: 11, fontWeight: 800, marginBottom: 9,
                        background: p.pct > 50 ? T.deficitBg : T.surplusBg,
                        color: p.pct > 50 ? T.deficit : T.surplus,
                        border: `1px solid ${p.pct > 50 ? T.deficitL : T.surplusL}`
                      }}>
                        {p.pct > 50
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiAlertTriangle size={11} /> عجز في {Math.round(p.pct)}% من الأيام</span>
                          : <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiCheckCircle size={11} /> فائض في {Math.round(100 - p.pct)}% من الأيام</span>}
                      </div>
                      <RamRow label="متوسط العجز" value={`${fmtFull(p.avg)} سرير/يوم`} />
                      {p.max?.gap < 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 11, color: T.txtSub }}>أعلى عجز</span>
                            <strong style={{ fontSize: 12, color: T.deficit }}>
                              {fmtFull(-p.max.gap)}{' '}
                              <span style={{ fontSize: 10, fontWeight: 500, color: T.txtDim }}>سرير/يوم</span>
                            </strong>
                          </div>
                          <div style={{ fontSize: 10.5, color: T.txtSub, marginTop: 1, textAlign: 'left' }}>
                            {p.max.dateLabel}{p.max.hijriDate ? <span> · {p.max.hijriDate}</span> : ''}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: T.txtDim }}>لا توجد بيانات</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scrolling viewport: direction:ltr — ONLY used for 3+ cards */}
        {needsScroll && (
          <div
            style={{
              overflow: 'hidden', flex: 1, minHeight: 0, direction: 'ltr',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsDragging(false); dragStart.current = null }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              ref={trackRef}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                height: '100%',
                width: 'max-content',
                willChange: 'transform',
              }}
            >
              {track.map((p, i) => <PeriodCard key={i} p={p} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {periods.length === 0 && (
          <div style={{ fontSize: 11, color: T.txtDim, direction: 'rtl' }}>لا توجد بيانات لهذه السنة</div>
        )}

      </div>{/* /ref container */}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   MINI CHART 4 — DEMAND SPLIT: outside vs inside (donut)
════════════════════════════════════════════════════════════════ */
function DemandSplitChart({ split: rawRows }) {
  const COLORS = [T.outside, T.inside]
  const LABELS = ['معتمري الخارج', 'معتمري الداخل (مبيت)']

  const [moFilter, setMoFilter] = useState('all')   // 'all' | 0-11
  const [ramOnly, setRamOnly] = useState(false)

  const filtered = useMemo(() => {
    let rows = rawRows
    if (ramOnly) rows = rows.filter(r => r.isRamadan)
    if (moFilter !== 'all') rows = rows.filter(r => r.date.getMonth() === moFilter)
    return rows
  }, [rawRows, moFilter, ramOnly])

  const avgOut = filtered.length ? filtered.reduce((s, r) => s + (r.ado ?? 0), 0) / filtered.length : 0
  const avgIn = filtered.length ? filtered.reduce((s, r) => s + (r.adi ?? 0), 0) / filtered.length : 0
  const total = avgOut + avgIn
  const data = [
    { name: LABELS[0], value: Math.round(avgOut), fill: COLORS[0] },
    { name: LABELS[1], value: Math.round(avgIn), fill: COLORS[1] },
  ]

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const p = payload[0]
    const pct = total ? Math.round(p.value / total * 100) : 0
    return (
      <TT minW={165}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.payload.fill }} />
          <span style={{ fontWeight: 800, fontSize: 13 }}>{p.name}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: p.payload.fill, lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: 10, color: T.txtSub, marginTop: 4 }}>{fmtFull(p.value)} سرير/يوم (متوسط)</div>
      </TT>
    )
  }

  // Months available in rawRows
  const availMos = [...new Set(rawRows.map(r => r.date.getMonth()))].sort((a, b) => a - b)

  return (
    <ChartCard
      title=" الفئات من المستهدفات"
      accent={T.bronzeL}
      info="يوضح توزيع فئات الطلب بين المتوسط اليومي لأعداد المعتمرين"
      headerExtra={
        <>
          <select
            value={moFilter}
            onChange={e => { setMoFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setRamOnly(false) }}
            style={{
              background: '#ffffff', border: '1px solid rgba(65,64,66,0.15)',
              borderRadius: 6, color: T.txt, fontSize: 10,
              padding: '0 8px', cursor: 'pointer', outline: 'none', direction: 'rtl',
              height: 26, boxSizing: 'border-box',
            }}>
            <option value="all" style={{ background: '#ffffff' }}>كل الأشهر</option>
            {availMos.map(m => (
              <option key={m} value={m} style={{ background: '#ffffff' }}>{AR_MON[m]}</option>
            ))}
          </select>
          <button
            onClick={() => { setRamOnly(v => !v); setMoFilter('all') }}
            style={{
              height: 26, boxSizing: 'border-box',
              padding: '0 10px', borderRadius: 6, fontSize: 10,
              border: `1px solid ${ramOnly ? T.ram : 'rgba(65,64,66,0.13)'}`,
              background: ramOnly ? 'rgba(150,113,38,0.10)' : 'rgba(65,64,66,0.04)',
              color: ramOnly ? T.ram : T.txtSub, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
              opacity: moFilter !== 'all' ? 0.30 : 1,
            }}>
            رمضان
          </button>
          {(moFilter !== 'all' || ramOnly) && (
            <button
              type="button"
              aria-label="إزالة الفلتر"
              title="إزالة الفلتر"
              onClick={() => {
                setMoFilter('all');
                setRamOnly(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                padding: 0,
                borderRadius: 6,
                background: 'rgba(65,64,66,0.05)',
                border: '1px solid rgba(65,64,66,0.10)',
                color: T.txtSub || T.txtDim,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1,
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(65,64,66,0.10)';
                e.currentTarget.style.borderColor = 'rgba(65,64,66,0.20)';
                e.currentTarget.style.color = T.txt;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(65,64,66,0.05)';
                e.currentTarget.style.borderColor = 'rgba(65,64,66,0.10)';
                e.currentTarget.style.color = T.txtSub || T.txtDim;
              }}
            >
              <FiX size={12} />
            </button>
          )}
        </>
      }>

      {total > 0 ? (
        <>
          <div style={{ position: 'relative', paddingTop: '5px' }}>
            <ResponsiveContainer width="100%" height={155} minWidth={0}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%"
                  innerRadius={46} outerRadius={68} paddingAngle={5}
                  dataKey="value" cornerRadius={5} stroke="none"
                  animationBegin={100} animationDuration={900} animationEasing="ease-out">
                  {data.map((e, i) => (
                    <Cell key={i} fill={e.fill} opacity={0.9}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 9999 }} allowEscapeViewBox={{ x: true, y: true }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-52%)', textAlign: 'center', pointerEvents: 'none'
            }}>
              <div style={{ fontSize: 8, color: T.txtSub, marginTop: 0, marginBottom: 4, letterSpacing: '0.3px' }}>الإجمالي</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.txtSub, lineHeight: 1 }}>{fmtN(total)}</div>
              <div style={{ fontSize: 8, color: T.txtSub, marginTop: 2 }}>متوسط/يوم</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
            {data.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.txtSub }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
                {d.name}
                <strong style={{ color: d.fill }}>{total ? Math.round(d.value / total * 100) : 0}%</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{
          height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.txtSub, fontSize: 11
        }}>لا توجد بيانات</div>
      )}
    </ChartCard>
  )
}

/* ════════════════════════════════════════════════════════════════
   MAIN CHART TOOLTIP
════════════════════════════════════════════════════════════════ */
const GapTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload; if (!d) return null
  const def = d.gap < 0
  return (
    <TT minW={235}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <strong style={{ fontSize: 13, color: T.txt, display: 'block' }}>
            {d.dateLabel}{d.hijriDate ? <span style={{ color: T.txtSub }}> · {d.hijriDate}</span> : ''}
          </strong>
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginRight: 8 }}>
          {d.isRamadan && <span style={{ fontSize: 11, background: T.ramL, color: T.ram, padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><FiMoon size={10} />رمضان</span>}
          {d.isHajj && <span style={{ fontSize: 11, background: T.hajjL, color: T.hajj, padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><FaMosque size={10} />حج</span>}
        </div>
      </div>
      {[{ l: 'المستهدفات', v: d.demand, c: T.dem }, { l: 'الطاقة الاستيعابية', v: d.supply, c: T.sup }].map(r => (
        <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 6 }}>
          <span style={{ color: T.txtSub, fontSize: 11 }}>{r.l}</span>
          <strong style={{ color: r.c, fontSize: 13 }}>{fmtFull(r.v)} <span style={{ fontWeight: 400, fontSize: 11, color: T.txtDim }}>سرير/يوم</span></strong>
        </div>
      ))}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(65,64,66,0.10)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 11px', borderRadius: 20, background: def ? T.deficitBg : T.surplusBg, color: def ? T.deficit : T.surplus, border: `1px solid ${def ? T.deficitL : T.surplusL}` }}>
          {def ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiAlertTriangle size={11} /> عجز</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiCheck size={11} /> فائض</span>}
        </span>
        <strong style={{ fontSize: 17, color: def ? T.deficit : T.surplus }}>{fmtFull(Math.abs(d.gap))}</strong>
      </div>
    </TT>
  )
}

/* ════════════════════════════════════════════════════════════════
   LOADING & ERROR
════════════════════════════════════════════════════════════════ */
function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, background: T.bg, padding: 24 }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid rgba(150,113,38,0.2)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid transparent`, borderTopColor: T.bronze, animation: 'spin 1s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: T.bronzeXL }}><FaMosque size={26} /></div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.txt }}>جاري تحميل البيانات</div>
        <div style={{ fontSize: 13, color: T.txtSub, marginTop: 5 }}>housing.xlsx</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, width: '100%', maxWidth: 500 }}>
        {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}
      </div>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: T.bg, padding: 32 }}>
      <div style={{ fontSize: 52, color: T.deficit }}><MdWarning size={52} /></div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.txt }}>تعذّر تحميل البيانات</div>
      <div className="card" style={{ padding: '16px 24px', color: T.deficit, fontSize: 13, maxWidth: 580, lineHeight: 1.9, borderRight: `3px solid ${T.deficit}` }}>{message}</div>
      <div className="card" style={{ padding: '16px 24px', color: T.txtSub, fontSize: 12, maxWidth: 500, lineHeight: 2 }}>
        <strong style={{ color: T.txt, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><FiClipboard size={13} /> الخطوات المطلوبة:</strong>
        {['housing.xlsx في مجلد public/', 'ورقتي Supply و Demand', 'عمود Date Gregorian', 'أعد تشغيل npm run dev'].map((s, i) => (
          <div key={i}>{i + 1}. <code style={{ background: 'rgba(150,113,38,0.15)', padding: '1px 7px', borderRadius: 4, color: T.bronzeXL }}>{s}</code></div>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   SCENARIO SIDEBAR — redesigned: chips + steppers, no sliders
════════════════════════════════════════════════════════════════ */
function ScenarioSidebar({ sc, setSci, onClose }) {
  const PCT_KEYS = ['sl', 'sf', 'sh', 'do_', 'di']
  const supplyKeys = ['sl', 'sf', 'sh']
  const demandKeys = ['do_', 'di']

  const hasPctChange = PCT_KEYS.some(k => (sc[k] ?? 0) !== 0)
  const hasBnH = (sc.bnH ?? 3.1) !== 3.1
  const hasBH = (sc.bH ?? 4.3) !== 4.3
  const hasAnyChange = hasPctChange || hasBnH || hasBH
  const activeCount = PCT_KEYS.filter(k => (sc[k] ?? 0) !== 0).length + (hasBnH ? 1 : 0) + (hasBH ? 1 : 0)

  const netSup = supplyKeys.reduce((s, k) => s + (sc[k] ?? 0), 0)
    + Math.round((sc.bnH / 3.1 - 1) * 100)
    + Math.round((sc.bH / 4.3 - 1) * 100)
  const netDem = demandKeys.reduce((s, k) => s + (sc[k] ?? 0), 0)
  const netImpact = netSup - netDem
  const impactPos = netImpact >= 0

  const ALL_ITEMS = [
    { k: 'sl', l: 'المرافق المرخصة', icon: <MdHotel size={14} />, cat: 'supply' },
    { k: 'sf', l: 'المشاريع المستقبلية', icon: <MdConstruction size={14} />, cat: 'supply' },
    { k: 'sh', l: 'مساكن الحجاج', icon: <FaMosque size={13} />, cat: 'supply' },
    { k: 'do_', l: 'معتمري الخارج', icon: <MdFlightTakeoff size={14} />, cat: 'demand' },
    { k: 'di', l: 'معتمري الداخل (مبيت)', icon: <MdDirectionsBus size={14} />, cat: 'demand' },
    { k: 'bnH', l: 'أسرة/غرفة (خارج الحج)', icon: <MdBed size={14} />, cat: 'supply', isAbs: true, normal: 3.1 },
    { k: 'bH', l: 'أسرة/غرفة (موسم الحج)', icon: <MdBed size={14} />, cat: 'supply', isAbs: true, normal: 4.3 },
  ]

  return (
    <div className="scenario-sidebar">

      {/* ══ HEADER ══ */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FiSliders size={16} style={{ color: T.bronzeXL }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: T.txt, letterSpacing: '0.3px' }}>أداة ماذا لو؟</div>
            <InfoBadge portal text="أداة تُمكّنك من تعديل افتراضي لبيانات الطاقة الاستيعابية والمستهدفات لمحاكاة سيناريوهات مختلفة، دون أي تأثير على البيانات الأصلية." />
          </div>
          <div style={{ fontSize: 9.5, color: T.txtSub, marginTop: 3, fontWeight: 600 }}>محاكاة افتراضية للبيانات</div>
        </div>
        {hasAnyChange && <div className="sidebar-active-badge">{activeCount}</div>}
        {onClose && (
          <button className="sidebar-close-btn" onClick={onClose} aria-label="إغلاق">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* ══ NET IMPACT BANNER ══ */}
      {hasAnyChange && (
        <div className={`sc-impact-banner${impactPos ? ' positive' : ' negative'}`}>
          <span className="sc-impact-icon">{impactPos ? '↑' : '↓'}</span>
          <div className="sc-impact-body">
            <div className="sc-impact-label">{impactPos ? 'السيناريو يُحسّن الطاقة' : 'السيناريو يزيد الضغط'}</div>
            <div className="sc-impact-sub">
              الطاقة {netSup > 0 ? '+' : ''}{netSup}% · المستهدفات {netDem > 0 ? '+' : ''}{netDem}%
            </div>
          </div>
          <div className={`sc-impact-delta${impactPos ? ' pos' : ' neg'}`}>
            {impactPos ? '+' : ''}{netImpact}%
          </div>
        </div>
      )}

      {/* ══ SUPPLY SECTION ══ */}
      <div className="sc-vars-section">
        <div className="sc-vars-section-label supply-label">
          <span className="sc-dot supply-dot" />
          الطاقة الاستيعابية
        </div>

        {[
          { k: 'sl', l: 'المرافق المرخصة', icon: <MdHotel size={14} /> },
          { k: 'sf', l: 'المشاريع المستقبلية', icon: <MdConstruction size={14} /> },
          { k: 'sh', l: 'مساكن الحجاج', icon: <FaMosque size={13} /> },
        ].map(({ k, l, icon }) => (
          <Slider key={k} label={l} icon={icon}
            value={sc[k] ?? 0} onChange={v => setSci(k, v)} color={T.greenXL} />
        ))}
      </div>

      <div className="sc-section-sep" />

      {/* ══ DEMAND SECTION ══ */}
      <div className="sc-vars-section">
        <div className="sc-vars-section-label demand-label">
          <span className="sc-dot demand-dot" />
          المستهدفات
        </div>

        {[
          { k: 'do_', l: 'معتمري الخارج', icon: <MdFlightTakeoff size={14} /> },
          { k: 'di', l: 'معتمري الداخل (مبيت)', icon: <MdDirectionsBus size={14} /> },
        ].map(({ k, l, icon }) => (
          <Slider key={k} label={l} icon={icon}
            value={sc[k] ?? 0} onChange={v => setSci(k, v)} color={T.dem} />
        ))}
      </div>

      <div className="sc-section-sep" />

      {/* ══ BEDS / ROOM SECTION ══ */}
      <div className="sc-vars-section">
        <div className="sc-vars-section-label beds-label">
          <span className="sc-dot beds-dot" />
          معدل الأسرة لكل غرفة
        </div>

        <SliderAbs
          label="خارج موسم الحج"
          sublabel="سرير/غرفة"
          value={sc.bnH ?? 3.1}
          onChange={v => setSci('bnH', v)}
          color={T.greenXL} icon={<MdBed size={14} />}
          min={0.0} max={6.2} step={0.1} normal={3.1}
        />
        <SliderAbs
          label="موسم الحج"
          sublabel="سرير/غرفة"
          value={sc.bH ?? 4.3}
          onChange={v => setSci('bH', v)}
          color={T.greenXL} icon={<FaMosque size={13} />}
          min={0.0} max={8.6} step={0.1} normal={4.3}
        />
      </div>

      {/* ══ ACTIVE CHANGES SUMMARY ══ */}
      {hasAnyChange && (
        <div className="active-changes-panel">
          <div className="active-changes-title">
            <span className="pulse-dot" />
            التعديلات النشطة
            <span style={{ marginRight: 'auto', fontSize: 9, color: 'rgba(65,64,66,0.35)', fontWeight: 500 }}>{activeCount} متغيّر</span>
          </div>
          <div className="sc-changes-table">
            {ALL_ITEMS.filter(i => {
              if (i.isAbs) return (sc[i.k] ?? i.normal) !== i.normal
              return (sc[i.k] ?? 0) !== 0
            }).map(i => {
              const val = sc[i.k]
              const isPos = i.isAbs ? val > i.normal : val > 0
              const color = i.cat === 'supply' ? (isPos ? T.surplus : T.deficit) : (isPos ? T.deficit : T.surplus)
              const displayVal = i.isAbs ? val.toFixed(1) : `${isPos ? '+' : ''}${val}%`
              return (
                <div key={i.k} className="sc-change-row">
                  <span className="sc-change-cat" style={{ background: i.cat === 'supply' ? `${T.sup}18` : `${T.dem}18`, color: i.cat === 'supply' ? T.sup : T.dem }}>
                    {i.cat === 'supply' ? 'طاقة' : 'طلب'}
                  </span>
                  <span className="sc-change-icon">{i.icon}</span>
                  <span className="sc-change-label">{i.l}</span>
                  <span className="sc-change-val" style={{ color }}>{displayVal}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ RESET BUTTON ══ */}
      <div className="sc-reset-area">
        <button
          className={`reset-btn${hasAnyChange ? ' active' : ''}`}
          onClick={() => { PCT_KEYS.forEach(k => setSci(k, 0)); setSci('bnH', 3.1); setSci('bH', 4.3) }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 8a6 6 0 1 0 1.5-3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M2 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          إعادة الضبط
          {hasAnyChange && <span className="reset-count">{activeCount}</span>}
        </button>
      </div>

    </div>
  )
}


/* ════════════════════════════════════════════════════════════════
   DETAILS MODAL
════════════════════════════════════════════════════════════════ */
function DetailsModal({ yr, tableRows, onClose, onExport }) {
  const [search, setSearch] = useState('')
  const filtered = search ? tableRows.filter(r => r.dateLabel.includes(search) || r.monthLabel.includes(search)) : tableRows
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(65,64,66,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
        backdropFilter: 'blur(8px)'
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '94%',
          maxWidth: 920,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 16,
          background: '#ffffff',
          border: '1px solid rgba(65,64,66,0.12)',
          boxShadow: '0 24px 64px rgba(65,64,66,0.22)'
        }}
      >
        <div
          className="modal-header-wrap"
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(65,64,66,0.09)',
            background: 'rgba(150,113,38,0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 900, color: T.bronzeXL }}><FiClipboard size={15} /> التفاصيل اليومية</span>
            <span style={{ fontSize: 11, color: T.txtSub }}>({fmtFull(filtered.length)} يوم)</span>
          </div>

          <div
            className="modal-header-actions"
            style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالشهر..."
              style={{
                padding: '6px 13px',
                borderRadius: 8,
                border: '1px solid rgba(65,64,66,0.15)',
                fontSize: 12,
                direction: 'rtl',
                width: 155,
                background: '#f8f7f5',
                color: T.txt
              }}
            />
            <button
              onClick={onExport}
              style={{
                background: `linear-gradient(135deg,${T.green},${T.greenL})`,
                color: 'white',
                padding: '7px 16px',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiArrowDown size={12} /> Excel</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(65,64,66,0.05)',
                border: '1px solid rgba(65,64,66,0.12)',
                width: 32,
                height: 32,
                borderRadius: 8,
                fontSize: 15,
                color: T.txtSub,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FiX size={14} />
            </button>
          </div>
        </div>

        <div className="modal-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: `linear-gradient(135deg,#2c2b2d,#414042)` }}>
                {[
                  '#',
                  'التاريخ الميلادي',
                  'التاريخ الهجري',
                  'الطاقة الاستيعابية',
                  'المستهدفات',
                  'الفجوة',
                  'الحالة',
                  'رمضان',
                  'حج'
                ].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.85)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: T.txtDim }}>
                    لا توجد نتائج
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr
                    key={r.dateKey}
                    style={{
                      background:
                        r.gap < 0
                          ? T.deficitBg
                          : r.isRamadan
                            ? T.ramBg
                            : r.isHajj
                              ? T.hajjBg
                              : i % 2 === 0
                                ? 'transparent'
                                : 'rgba(65,64,66,0.025)',
                      borderBottom: '1px solid rgba(65,64,66,0.06)'
                    }}
                  >
                    <td style={{ padding: '7px 14px', color: T.txtDim, fontSize: 11 }}>{i + 1}</td>

                    <td style={{ padding: '7px 14px', fontWeight: 600, color: T.txt }}>
                      {r.dateLabel}
                    </td>

                    <td style={{ padding: '7px 14px', fontWeight: 600, color: T.txtSub }}>
                      {r.hijriDate || '-'}
                    </td>

                    <td style={{ padding: '7px 14px', fontWeight: 700, color: T.sup }}>
                      {fmtFull(r.supply)}
                    </td>

                    <td style={{ padding: '7px 14px', fontWeight: 700, color: T.dem }}>
                      {fmtFull(r.demand)}
                    </td>

                    <td
                      style={{
                        padding: '7px 14px',
                        fontWeight: 800,
                        color: r.gap < 0 ? T.deficit : T.surplus
                      }}
                    >
                      {fmtFull(r.gap)}
                    </td>

                    <td style={{ padding: '7px 14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          background: r.gap < 0 ? T.deficitBg : T.surplusBg,
                          color: r.gap < 0 ? T.deficit : T.surplus,
                          border: `1px solid ${r.gap < 0 ? T.deficitL : T.surplusL}`
                        }}
                      >
                        {r.gap < 0
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiAlertTriangle size={10} /> عجز</span>
                          : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiCheck size={10} /> فائض</span>}
                      </span>
                    </td>

                    <td style={{ padding: '7px 14px', textAlign: 'center', color: T.ram }}>
                      {r.isRamadan ? <FiMoon size={13} /> : ''}
                    </td>

                    <td style={{ padding: '7px 14px', textAlign: 'center', color: T.hajj }}>
                      {r.isHajj ? <FaMosque size={12} /> : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   METHODOLOGY MODAL HELPERS
════════════════════════════════════════════════════════════════ */
const MethodSection = ({ icon, title, accent, children }) => (
  <div style={{ paddingBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
      <div style={{ width: 3, height: 18, borderRadius: 3, background: accent, flexShrink: 0 }} />
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontWeight: 900, color: T.txt, fontSize: 13.5 }}>{title}</span>
    </div>
    {children}
  </div>
)

const MethodFormula = ({ children }) => (
  <div style={{ fontSize: 12, color: T.bronzeXL, background: 'rgba(150,113,38,0.1)', border: '1px solid rgba(150,113,38,0.22)', borderRadius: 8, padding: '9px 14px', marginBottom: 10, lineHeight: 1.6, direction: 'ltr', textAlign: 'left' }}>
    {children}
  </div>
)

const MethodTable = ({ rows }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
    {rows.map(([term, formula, note]) => (
      <div key={term} style={{ display: 'grid', gridTemplateColumns: '1.6fr 2fr 1.5fr', gap: 8, background: 'rgba(65,64,66,0.04)', borderRadius: 7, padding: '7px 12px', fontSize: 11, alignItems: 'start' }}>
        <span style={{ fontWeight: 800, color: T.txt }}>{term}</span>
        <span style={{ color: T.txtSub, direction: 'ltr', textAlign: 'left' }}>{formula}</span>
        <span style={{ color: T.txtDim, fontSize: 10.5 }}>{note}</span>
      </div>
    ))}
  </div>
)

const MethodNote = ({ children }) => (
  <div style={{ fontSize: 11, color: T.txtDim, marginTop: 8, paddingRight: 4, lineHeight: 1.7, display: 'flex', alignItems: 'flex-start', gap: 6 }}><FiInfo size={12} style={{ flexShrink: 0, marginTop: 2 }} />{children}</div>
)

const MethodDivider = () => (
  <div style={{ height: 1, background: 'rgba(65,64,66,0.08)', margin: '4px 0 18px' }} />
)

/* Equation block: colored title + two stacked variable rows with result arrow (used in الفرضيات tab) */
const EquationBlock = ({ title, color, rows, transparent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
    <div style={{
      background: transparent ? `${color}18` : color,
      color: transparent ? color : '#fff',
      border: transparent ? `1px solid ${color}30` : 'none',
      borderBottom: transparent ? 'none' : undefined,
      borderRadius: '8px 8px 0 0', padding: '7px 6px',
      textAlign: 'center', fontSize: 9.5, fontWeight: 800, lineHeight: 1.4,
      minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {title}
    </div>
    <div style={{
      background: transparent ? `${color}08` : 'rgba(65,64,66,0.03)',
      border: transparent ? `1px solid ${color}30` : '1px solid rgba(65,64,66,0.10)',
      borderTop: 'none',
      borderRadius: '0 0 6px 6px',
      padding: '6px 4px',
    }}>
      {rows.map((r, i) => (
        <div key={i}>
          {i > 0 && (
            <div style={{ fontSize: 12, color: T.txtDim, textAlign: 'center', margin: '2px 0' }}>×</div>
          )}
          <div style={{
            background: 'rgba(65,64,66,0.04)',
            border: '1px solid rgba(65,64,66,0.08)',
            borderRadius: 5, padding: '5px 4px',
            textAlign: 'center', lineHeight: 1.3,
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.txtSub }}>{r.label}</div>
            <div style={{ fontSize: 8.5, color: T.txtDim, marginTop: 1 }}>{r.sub}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

/* ════════════════════════════════════════════════════════════════
   PAGE HEADER
════════════════════════════════════════════════════════════════ */
function PageHeader({
  yrs, years, yr, isAllYrs, toggleYr, selectAllYrs,
  demTypes, toggleDemType, supTypes, toggleSupType,
  showSc, setShowSc, hasAnyScChange, activeScCount,
  onExport, onDetails, onMethodology, peakDemand, kpi, series, fileDate,
  TPname,
}) {
  const [showMethodology, setShowMethodology] = useState(false)
  const [activeTab, setActiveTab] = useState('core')

  // Derive active season label
  const activeSeason = (() => {
    if (!series?.length) return null
    const activeRam = series.some(r => r.isRamadan)
    const activeHajj = series.some(r => r.isHajj)
    if (activeRam && activeHajj) return { label: 'رمضان + حج', color: T.ram }
    if (activeRam) return { label: 'رمضان', color: T.ram }
    if (activeHajj) return { label: 'الحج', color: T.hajj }
    return { label: 'كل الأشهر', color: T.bronzeXL, icon: <FiCalendar size={11} /> }
  })()

  // Data health: any deficit days?
  const deficitPct = kpi ? Math.round(kpi.defPct) : null

  return (
    <>
      {/* ── Hero band ── */}
      <div className="page-header-hero">
        {/* Multi-layer decorative glows */}
        <div className="page-header-inner">

          {/* ── Row 1: Title + Actions ── */}
          <div className="page-header-top">
            {/* Title block */}
            <div className="page-header-title-block">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 className="page-header-h1">{TPname}</h1>
              </div>
              <p className="page-header-subtitle">
                تحليل الطاقة الاستيعابية لنقطة اتصال {TPname}
              </p>
            </div>
          </div>

          {/* ── Row 2: Context chips ── */}
          <div className="page-header-chips">

            {/* Selected years */}
            <div className="ph-chip">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke={T.bronzeXL} strokeWidth="1.2" />
                <path d="M4 1.5v2M8 1.5v2M1.5 5.5h9" stroke={T.bronzeXL} strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="ph-chip-label">السنة</span>
              <span className="ph-chip-value" style={{ color: T.bronzeXL }}>
                {isAllYrs ? 'كل السنوات' : [...yrs].sort().join('، ')}
              </span>
            </div>

            {/* Data status */}
            {fileDate && (() => {
              const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
              const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
              const d = fileDate
              const h = d.getHours();
              const isAM = h < 12;
              const period = isAM ? "ص" : "م";
              const formatted = `${AR_DAYS[d.getDay()]} | ${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()} | ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${period}`;

              return (
                <div className="ph-chip">
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.8" stroke={T.bronzeXL} strokeWidth="1.3" />
                    <path d="M7 4v3.2l2 1.2" stroke={T.bronzeXL} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="ph-chip-label">آخر تحديث</span>
                  <span className="ph-chip-value" style={{ color: T.bronzeXL }}>{formatted}</span>
                </div>
              )
            })()}

            {/* Scenario indicator — only when active */}
            {hasAnyScChange && (
              <button className="ph-chip ph-chip-scenario" onClick={() => setShowSc(v => !v)}>
                <span className="pulse-dot" style={{ width: 6, height: 6, flexShrink: 0 }} />
                <span className="ph-chip-value" style={{ color: T.warn }}>{activeScCount}</span>
                <span className="ph-chip-label">سيناريو نشط</span>
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="page-header-actions">
            <button className="ph-btn ph-btn-ghost" onClick={() => setShowMethodology(true)}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M3 4h10M3 7h7M3 10h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              المصطلحات و المفاهيم
            </button>
            <button className="ph-btn ph-btn-ghost" onClick={onExport}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v9M4 8l4 4 4-4M2 14h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              تصدير تقرير
            </button>
            {peakDemand && (
              <button className="ph-btn ph-btn-ghost" onClick={onDetails}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                التفاصيل اليومية
              </button>
            )}
          </div>

          {/* ── Row 3: Filters ── */}
          <div className="page-header-filters">
            {/* Year chips */}
            <div className="ph-filter-group">
              <span className="ph-filter-label" style={{ color: T.txtSub }}>السنوات</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={selectAllYrs} className={`ph-year-chip${isAllYrs ? ' active' : ''}`}>
                  الكل
                </button>
                {(years.length ? years : YEARS).map(y => (
                  <button key={y} onClick={() => toggleYr(y)} className={`ph-year-chip${yrs.has(y) ? ' active' : ''}`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Demand type */}
            <div className="ph-filter-group">
              <span className="ph-filter-label" style={{ color: `${T.dem}99` }}>المستهدفات</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[{ id: 'outside', l: 'معتمري الخارج' }, { id: 'inside', l: 'معتمري الداخل (مبيت)' }].map(o => (
                  <Seg key={o.id} active={demTypes.has(o.id)} onClick={() => toggleDemType(o.id)} color={T.dem}>{o.l}</Seg>
                ))}
              </div>
            </div>

            {/* Supply type */}
            <div className="ph-filter-group">
              <span className="ph-filter-label" style={{ color: `${T.sup}99` }}>الطاقة الاستيعابية</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[{ id: 'licensed', l: 'مرافق مرخصة' }, { id: 'future', l: 'المشاريع المستقبلية' }, { id: 'hajj', l: 'مساكن الحجاج' }].map(o => (
                  <Seg key={o.id} active={supTypes.has(o.id)} onClick={() => toggleSupType(o.id)} color={T.sup}>{o.l}</Seg>
                ))}
              </div>
            </div>

            {/* Scenario toggle pushed to end */}
            <div style={{ marginRight: '0' }}>
              <button
                className={`sc-toggle-btn${hasAnyScChange ? ' has-changes' : ''}${showSc ? ' active' : ''}`}
                onClick={() => setShowSc(v => !v)}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M2 4h10M2 7h7M2 10h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                أداة ماذا لو؟                {hasAnyScChange && <span className="sc-toggle-badge">{activeScCount}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Methodology modal ── */}
      {showMethodology && (
        <div
          onClick={e => e.target === e.currentTarget && setShowMethodology(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(65,64,66,0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}>
          <div style={{
            width: '94%', maxWidth: 720,
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid rgba(65,64,66,0.10)',
            boxShadow: '0 24px 60px rgba(65,64,66,0.18)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            maxHeight: '88vh',
          }}>

            {/* ── Header ── */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(65,64,66,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: T.txt }}>المصطلحات و المفاهيم</span>
              <button
                onClick={() => setShowMethodology(false)}
                style={{
                  background: 'rgba(65,64,66,0.05)',
                  border: '1px solid rgba(65,64,66,0.10)',
                  width: 30, height: 30, borderRadius: 8,
                  color: T.txtDim, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <FiX size={14} />
              </button>
            </div>

            {/* ── Tab Bar ── */}
            {(() => {
              const tabs = [
                { id: 'core', label: 'المفاهيم الأساسية' },
                { id: 'terms', label: 'المصطلحات' },
                { id: 'assumptions', label: 'الفرضيات' },

              ]
              return (
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid rgba(65,64,66,0.08)',
                  flexShrink: 0,
                }}>
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      style={{
                        flex: 1, padding: '10px 6px',
                        fontSize: 11, fontWeight: activeTab === t.id ? 800 : 400,
                        cursor: 'pointer', border: 'none', outline: 'none',
                        background: activeTab === t.id ? 'rgba(65,64,66,0.04)' : 'transparent',
                        color: activeTab === t.id ? T.txt : T.txtDim,
                        borderBottom: activeTab === t.id
                          ? `2px solid ${T.bronze}`
                          : '2px solid transparent',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        whiteSpace: 'nowrap',
                      }}>
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* ── Tab Content ── */}
            <div style={{ overflowY: 'auto', padding: '18px 20px', flex: 1 }}>

              {/* ══ TAB 1: الفكرة الأساسية ══ */}
              {activeTab === 'core' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* المعادلة البصرية */}
                  <div className="core-formula-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                    {[
                      { label: 'الطاقة الاستيعابية', sub: 'السعة القصوى', border: `${T.sup}33`, color: T.sup },
                      { sym: '−' },
                      { label: 'المستهدفات', sub: 'الطلب المتوقع', border: `${T.dem}33`, color: T.dem },
                      { sym: '=' },
                      { label: 'الفجوة', sub: 'عجز أو فائض', border: 'rgba(212,170,82,0.2)', color: 'rgba(212,170,82,0.7)' },
                    ].map((item, i) =>
                      item.sym
                        ? <div key={i} style={{ fontSize: 20, color: 'rgba(65,64,66,0.25)', textAlign: 'center' }}>{item.sym}</div>
                        : (
                          <div key={i} style={{ background: 'rgba(65,64,66,0.03)', border: `1px solid ${item.border}`, borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: 20, marginBottom: 6 }}>{item.emoji}</div>
                            <div style={{ fontSize: 11.5, color: item.color, fontWeight: 800, marginBottom: 3 }}>{item.label}</div>
                            <div style={{ fontSize: 10.5, color: T.txtDim }}>{item.sub}</div>
                          </div>
                        )
                    )}
                  </div>

                  {/* عجز / فائض */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: `${T.deficit}08`, border: `1px solid ${T.deficit}22`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: `${T.deficit}cc`, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}><FiAlertTriangle size={13} /> عجز</div>
                      <div style={{ fontSize: 11, color: T.txtDim, lineHeight: 1.7 }}>الطلب أعلى من الطاقة الاستيعابية</div>
                    </div>
                    <div style={{ background: `${T.surplus}08`, border: `1px solid ${T.surplus}22`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: `${T.surplus}cc`, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}><FiCheckCircle size={13} /> فائض</div>
                      <div style={{ fontSize: 11, color: T.txtDim, lineHeight: 1.7 }}>الطاقة الاستيعابية أعلى من الطلب</div>
                    </div>
                  </div>

                  {/* الوحدات */}
                  <div style={{ borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(65,64,66,0.09)', background: 'rgba(65,64,66,0.02)' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: T.txtSub, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><MdStraighten size={15} /> الوحدات المستخدمة</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {[
                        { unit: 'سرير / يوم', note: 'العدد الإجمالي للأسرة في اليوم الواحد' },
                        { unit: 'معتمر / يوم', note: 'العدد الإجمالي المتوقع للمعتمرين' },
                        { unit: 'سرير / غرفة', note: 'العدد الإجمالي للأسرة في الغرفة الواحدة' },
                      ].map(({ unit, note }) => (
                        <div key={unit} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(65,64,66,0.04)', borderRadius: 7, padding: '8px 12px' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: T.txtSub, width: 85, flexShrink: 0 }}>{unit}</span>
                          <span style={{ fontSize: 11, color: T.txtDim, lineHeight: 1.6 }}>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ══ TAB 2: المصطلحات ══ */}
              {activeTab === 'terms' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* ── الطاقة الاستيعابية + أنواعها ── */}
                  <div style={{
                    border: `1px solid ${T.sup}33`,
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    <div style={{
                      background: `${T.sup}0a`,
                      padding: '12px 14px',
                      borderBottom: `1px solid ${T.sup}22`,
                      display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 11, alignItems: 'start',
                    }}>
                      <MdCircle size={18} style={{ color: T.sup, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: T.sup, marginBottom: 3 }}>الطاقة الاستيعابية</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.txtSub, marginBottom: 4 }}>إجمالي السعة المتاحة للإيواء</div>
                        <div style={{ fontSize: 11, color: T.txtDim, lineHeight: 1.75 }}>الحد الأقصى من الأسرّة التي تستطيع منظومة الإيواء توفيرها يومياً، وتشمل ثلاثة مكوّنات:</div>
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { icon: <MdHotel size={15} style={{ color: T.sup }} />, term: 'المرافق المرخصة', simple: 'الفنادق والشقق الفندقية المشغّلة حالياً', detail: 'المنشآت الفندقية القائمة والحاصلة على تراخيص تشغيل سارية، وتمثّل الطاقة الفعلية الموجودة على أرض الواقع.' },
                        { icon: <MdConstruction size={15} style={{ color: T.sup }} />, term: 'المشاريع المستقبلية', simple: 'المنشآت الفندقية قيد التطوير أو المخطط لها', detail: 'مشاريع الإيواء التي لم تدخل التشغيل بعد، وتُضاف إلى الطاقة الاستيعابية بحسب الجدول الزمني المتوقع لتشغيلها.' },
                        { icon: <FaMosque size={14} style={{ color: T.sup }} />, term: 'مساكن الحجاج', simple: 'وحدات الإيواء المخصصة لموسم الحج', detail: 'وحدات سكنية مخصصة لاستضافة الحجاج خلال موسم الحج، وتشمل مختلف أنواع الوحدات السكنية المتاحة في مكة المكرمة.' },
                      ].map(({ icon, term, simple, detail }) => (
                        <div key={term} style={{
                          background: 'rgba(65,64,66,0.02)',
                          border: `1px solid ${T.sup}18`,
                          borderRadius: 8, padding: '9px 12px',
                          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 9, alignItems: 'start',
                          marginRight: 8,
                        }}>
                          <span style={{ lineHeight: 1, marginTop: 2 }}>{icon}</span>
                          <div>
                            <div style={{ fontSize: 11.5, fontWeight: 800, color: T.sup, marginBottom: 2 }}>{term}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: T.txtSub, marginBottom: 3 }}>{simple}</div>
                            <div style={{ fontSize: 10.5, color: T.txtDim, lineHeight: 1.7 }}>{detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── المستهدفات + أنواعها ── */}
                  <div style={{
                    border: `1px solid ${T.dem}33`,
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    <div style={{
                      background: `${T.dem}0a`,
                      padding: '12px 14px',
                      borderBottom: `1px solid ${T.dem}22`,
                      display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 11, alignItems: 'start',
                    }}>
                      <MdDiamond size={18} style={{ color: T.dem, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: T.dem, marginBottom: 3 }}>المستهدفات</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.txtSub, marginBottom: 4 }}>إجمالي الطلب المتوقع على الإيواء</div>
                        <div style={{ fontSize: 11, color: T.txtDim, lineHeight: 1.75 }}>الحمل اليومي المتوقع على منظومة الإيواء، ويتكوّن من نوعين:</div>
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { icon: <MdDirectionsBus size={15} style={{ color: T.inside }} />, term: 'معتمري الداخل (مبيت)', color: T.inside, simple: 'المعتمرون المقيمون داخل المملكة الذين يبيتون ليلة أو أكثر', detail: 'المعتمرون القادمون من داخل المملكة ويحتاجون إلى إيواء لمدة ليلة واحدة أو أكثر أثناء أداء العمرة.' },
                        { icon: <MdFlightTakeoff size={15} style={{ color: T.outside }} />, term: 'معتمري الخارج', color: T.outside, simple: 'المعتمرون القادمون من خارج المملكة', detail: 'المعتمرون الوافدون من خارج المملكة، ويكون متوسط إقامتهم أطول مقارنةً بمعتمري الداخل.' },
                      ].map(({ icon, term, color, simple, detail }) => (
                        <div key={term} style={{
                          background: 'rgba(65,64,66,0.02)',
                          border: `1px solid ${T.dem}18`,
                          borderRadius: 8, padding: '9px 12px',
                          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 9, alignItems: 'start',
                          marginRight: 8,
                        }}>
                          <span style={{ lineHeight: 1, marginTop: 2 }}>{icon}</span>
                          <div>
                            <div style={{ fontSize: 11.5, fontWeight: 800, color: color || T.dem, marginBottom: 2 }}>{term}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: T.txtSub, marginBottom: 3 }}>{simple}</div>
                            <div style={{ fontSize: 10.5, color: T.txtDim, lineHeight: 1.7 }}>{detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── الفجوة + أنواعها ── */}
                  <div style={{
                    border: '1px solid rgba(212,170,82,0.25)',
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    <div style={{
                      background: 'rgba(212,170,82,0.06)',
                      padding: '12px 14px',
                      borderBottom: '1px solid rgba(212,170,82,0.18)',
                      display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 11, alignItems: 'start',
                    }}>
                      <MdSwapHoriz size={18} style={{ color: 'rgba(212,170,82,0.8)', marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(212,170,82,0.8)', marginBottom: 3 }}>الفجوة</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.txtSub, marginBottom: 4 }}>الفرق بين الطاقة الاستيعابية والمستهدفات</div>
                        <div style={{ fontSize: 11, color: T.txtDim, lineHeight: 1.75 }}>الناتج اليومي من طرح المستهدفات من الطاقة الاستيعابية، ويظهر في حالتين:</div>
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { icon: <FiTrendingDown size={15} style={{ color: T.deficit }} />, term: 'العجز', color: T.deficit, simple: 'المستهدفات تتجاوز الطاقة الاستيعابية المتاحة', detail: 'حالة يتجاوز فيها الطلب على الإيواء السعة المتاحة، وكلما تكرر العجز زادت الحاجة للتدخل وزيادة المعروض.' },
                        { icon: <FiTrendingUp size={15} style={{ color: T.surplus }} />, term: 'الفائض', color: T.surplus, simple: 'الطاقة الاستيعابية تتجاوز المستهدفات', detail: 'حالة تكون فيها السعة المتاحة أعلى من الطلب — قد يمثّل هامش أمان مقصوداً أو فرصة لتحسين الاستغلال.' },
                      ].map(({ icon, term, color, simple, detail }) => (
                        <div key={term} style={{
                          background: 'rgba(65,64,66,0.02)',
                          border: `1px solid ${color}18`,
                          borderRadius: 8, padding: '9px 12px',
                          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 9, alignItems: 'start',
                          marginRight: 8,
                        }}>
                          <span style={{ lineHeight: 1, marginTop: 2 }}>{icon}</span>
                          <div>
                            <div style={{ fontSize: 11.5, fontWeight: 800, color, marginBottom: 2 }}>{term}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: T.txtSub, marginBottom: 3 }}>{simple}</div>
                            <div style={{ fontSize: 10.5, color: T.txtDim, lineHeight: 1.7 }}>{detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ══ TAB 3: الفرضيات ══ */}
              {activeTab === 'assumptions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* مقدمة */}
                  <div style={{
                    background: 'rgba(65,64,66,0.02)',
                    border: '1px solid rgba(65,64,66,0.09)',
                    borderRadius: 10, padding: '11px 13px',
                    fontSize: 11.5, color: T.txtSub, lineHeight: 1.75,
                  }}>
                    {/* نطاق الدراسة */}
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.txt, marginBottom: 6 }}>
                      نطاق الدراسة
                    </div>
                    <div style={{ fontSize: 10, color: T.txtDim, marginBottom: 8, lineHeight: 1.6 }}>
                      نطاق إيواء مكة المكرمة الذي تم دراسته
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        'الفنادق في مكة المكرمة',
                        'مساكن الحجاج في مكة المكرمة',
                      ].map((t, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: T.txtDim }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: 4,
                            background: `${T.bronze}1a`, color: T.bronze,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 800, flexShrink: 0,
                          }}>{i + 1}</span>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── معادلة الطلب (المستهدفات) ── */}
                  <div style={{
                    border: `1px solid ${T.dem}33`,
                    borderRadius: 12, overflow: 'hidden',
                    background: `${T.dem}05`,
                  }}>
                    <div style={{
                      padding: '9px 13px',
                      background: `${T.dem}12`,
                      borderBottom: `1px solid ${T.dem}22`,
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}>
                      <MdDiamond size={14} style={{ color: T.dem }} />
                      <span style={{ fontSize: 12, fontWeight: 900, color: T.dem }}>
                        معادلة احتساب الطلب (المستهدفات)
                      </span>
                    </div>
                    <div style={{ padding: '13px' }}>
                      {/* المعادلة — responsive: stacked on mobile, grid on desktop */}
                      <div className="formula-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: '0.77fr auto 1fr auto 1fr',
                        gap: 6, alignItems: 'stretch',
                      }}>
                        <div style={{
                          background: `${T.dem}18`, color: T.dem,
                          border: `1px solid ${T.dem}30`,
                          borderRadius: 8, padding: '12px 8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textAlign: 'center', fontSize: 10.5, fontWeight: 800, lineHeight: 1.5,
                        }}>
                          إجمالي الطلب على إيواء مكة المكرمة
                        </div>
                        <div className="formula-op" style={{ fontSize: 18, color: T.txtDim, alignSelf: 'center', textAlign: 'center' }}>=</div>
                        <EquationBlock
                          title="الحمل اليومي لمعتمري الداخل (مبيت)"
                          color={T.dem}
                          transparent
                          rows={[
                            { label: 'عدد المعتمرين المستهدفين', sub: '(معتمر)' },
                            { label: 'متوسط الإقامة لمعتمري الداخل', sub: '(ليلة)' },
                          ]}
                        />
                        <div className="formula-op" style={{ fontSize: 18, color: T.txtDim, alignSelf: 'center', textAlign: 'center' }}>+</div>
                        <EquationBlock
                          title="الحمل اليومي لمعتمري الخارج"
                          color={T.dem}
                          transparent
                          rows={[
                            { label: 'عدد المعتمرين المستهدفين', sub: '(معتمر)' },
                            { label: 'متوسط الإقامة لمعتمري الخارج', sub: '(ليلة)' },
                          ]}
                        />
                      </div>
                      <div style={{
                        marginTop: 11, padding: '9px 11px',
                        background: '#fff',
                        border: '1px solid rgba(65,64,66,0.09)',
                        borderRadius: 8,
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                      }}>
                        <FiInfo size={13} style={{ color: T.dem, marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: T.txtSub, marginBottom: 3 }}>أبرز الملاحظات</div>
                          <div style={{ fontSize: 10.5, color: T.txtDim, lineHeight: 1.7 }}>
                            التغيير في متوسط عدد ليالي المبيت يؤثر على الحمل اليومي لقطاع الإيواء بالزيادة أو النقصان بشكل واضح.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── معادلة العرض (الطاقات الاستيعابية) ── */}
                  <div style={{
                    border: `1px solid ${T.sup}33`,
                    borderRadius: 12, overflow: 'hidden',
                    background: `${T.sup}05`,
                  }}>
                    <div style={{
                      padding: '9px 13px',
                      background: `${T.sup}12`,
                      borderBottom: `1px solid ${T.sup}22`,
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}>
                      <MdHotel size={14} style={{ color: T.sup }} />
                      <span style={{ fontSize: 12, fontWeight: 900, color: T.sup }}>
                        معادلة احتساب الطاقات الاستيعابية
                      </span>
                    </div>
                    <div style={{ padding: '13px' }}>
                      <div className="formula-grid formula-grid-supply" style={{
                        display: 'grid',
                        gridTemplateColumns: '1.1fr auto 0.7fr auto 1fr auto 1fr',
                        gap: 6, alignItems: 'stretch',
                      }}>
                        <div style={{
                          background: `${T.sup}18`, color: T.sup,
                          border: `1px solid ${T.sup}30`,
                          borderRadius: 8, padding: '12px 8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textAlign: 'center', fontSize: 10.5, fontWeight: 800, lineHeight: 1.5,
                        }}>
                          الطاقات الاستيعابية للإيواء في مكة المكرمة
                        </div>
                        <div className="formula-op" style={{ fontSize: 18, color: T.txtDim, alignSelf: 'center', textAlign: 'center' }}>=</div>
                        <div style={{
                          background: 'rgba(65,64,66,0.06)',
                          border: '1px solid rgba(65,64,66,0.12)',
                          borderRadius: 8, padding: '10px 6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.txtSub, lineHeight: 1.5,
                        }}>
                          نسبة الإشغال لمرافق الإيواء
                        </div>
                        <div className="formula-op" style={{ fontSize: 18, color: T.txtDim, alignSelf: 'center', textAlign: 'center' }}>×</div>
                        <EquationBlock
                          title="عدد الأسرّة للمشاريع المستقبلية"
                          color={T.sup}
                          transparent
                          rows={[
                            { label: 'عدد الغرف', sub: '(غرفة / يوم)' },
                            { label: 'متوسط عدد الأسرّة في الغرفة', sub: '(سرير / غرفة)' },
                          ]}
                        />

                        <div className="formula-op" style={{ fontSize: 18, color: T.txtDim, alignSelf: 'center', textAlign: 'center' }}>+</div>
                        <EquationBlock
                          title="عدد الأسرّة للمرافق المرخصة"
                          color={T.sup}
                          transparent
                          rows={[
                            { label: 'عدد الغرف', sub: '(غرفة / يوم)' },
                            { label: 'متوسط عدد الأسرّة في الغرفة', sub: '(سرير / غرفة)' },
                          ]}
                        />
                      </div>
                      <div style={{
                        marginTop: 11, padding: '9px 11px',
                        background: '#fff',
                        border: '1px solid rgba(65,64,66,0.09)',
                        borderRadius: 8,
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                      }}>
                        <FiInfo size={13} style={{ color: T.sup, marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: T.txtSub, marginBottom: 3 }}>أبرز الملاحظات</div>
                          <div style={{ fontSize: 10.5, color: T.txtDim, lineHeight: 1.7 }}>
                            تم الاستناد إلى أعداد الفنادق والشقق الفندقية المشغلة وغير المشغلة بحسب ما ورد في خطة زيادة المعروض 2023 من وزارة السياحة.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── أبرز الفرضيات (القيم) ── */}
                  <div style={{
                    border: '1px solid rgba(65,64,66,0.12)',
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '9px 13px',
                      background: 'rgba(65,64,66,0.04)',
                      borderBottom: '1px solid rgba(65,64,66,0.09)',
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}>
                      <FaMosque size={13} style={{ color: T.bronze }} />
                      <span style={{ fontSize: 12, fontWeight: 900, color: T.txt }}>
                        أبرز الفرضيات لعام 2026
                      </span>
                    </div>
                    <div style={{ padding: '13px', display: 'flex', flexDirection: 'column', gap: 10 }}>


                      {/* الطاقات الاستيعابية */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: T.sup, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MdHotel size={13} /> الطاقات الاستيعابية
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                          {[
                            { v: '200,057', u: 'غرفة / اليوم', l: 'الفنادق والشقق الفندقية' },
                            { v: '1,700,000', u: 'سرير / اليوم', l: 'وحدات مساكن الحجاج' },
                          ].map((k, i) => (
                            <div key={i} style={{
                              background: T.supBg,
                              border: `1px solid ${T.sup}22`,
                              borderRadius: 8, padding: '10px 11px',
                            }}>
                              <div style={{ fontSize: 10, color: T.txtDim, marginBottom: 4, lineHeight: 1.4 }}>{k.l}</div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: T.sup, lineHeight: 1.1 }}>
                                {k.v} <span style={{ fontSize: 10, fontWeight: 600, color: T.txtSub }}>{k.u}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* المستهدفات */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: T.dem, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MdDiamond size={13} /> المستهدفات
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                          {[
                            { v: '100%', l: 'نسبة المعتمرين المستهدفين في الإيواء' },
                            { v: '9.3', u: 'ليال', l: 'متوسط الإقامة لمعتمري الخارج' },
                            { v: '3.3', u: 'ليال', l: 'متوسط الإقامة لمعتمري الداخل' },
                          ].map((k, i) => (
                            <div key={i} style={{
                              background: T.demBg,
                              border: `1px solid ${T.dem}22`,
                              borderRadius: 8, padding: '10px 11px',
                            }}>
                              <div style={{ fontSize: 10, color: T.txtDim, marginBottom: 4, lineHeight: 1.4 }}>{k.l}</div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: T.dem, lineHeight: 1.1 }}>
                                {k.v}{k.u && <span style={{ fontSize: 10, fontWeight: 600, color: T.txtSub }}> {k.u}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* عدد الأسرّة */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: T.txtSub, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MdBed size={13} /> عدد الأسرّة
                        </div>
                        <div style={{
                          background: 'rgba(65,64,66,0.03)',
                          border: '1px solid rgba(65,64,66,0.10)',
                          borderRadius: 8, padding: '10px 11px',
                        }}>
                          <div style={{ fontSize: 10, color: T.txtDim, marginBottom: 4 }}>متوسط عدد الأسرّة في الغرفة خارج موسم الحج</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: T.txt, lineHeight: 1.1 }}>
                            3.1 <span style={{ fontSize: 10, fontWeight: 600, color: T.txtSub }}>سرير / غرفة</span>
                          </div>
                        </div>
                        <div style={{
                          background: 'rgba(65,64,66,0.03)',
                          border: '1px solid rgba(65,64,66,0.10)',
                          borderRadius: 8, padding: '10px 11px', marginTop: '5px'
                        }}>
                          <div style={{ fontSize: 10, color: T.txtDim, marginBottom: 4 }}>متوسط عدد الأسرّة في الغرفة خلال موسم الحج</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: T.txt, lineHeight: 1.1 }}>
                            4.3 <span style={{ fontSize: 10, fontWeight: 600, color: T.txtSub }}>سرير / غرفة</span>
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              )}


            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════════════════════ */
function Dashboard({ db, fileDate }) {
  const { rows, warns, years } = db
  const navigate = useNavigate()

  const [yrs, setYrs] = useState(() => new Set(years.length ? years : YEARS))
  const yr = yrs.size === 1 ? [...yrs][0] : null  // null = multi-year mode

  const toggleYr = y => setYrs(prev => {
    const next = new Set(prev)
    if (next.has(y) && next.size > 1) next.delete(y)
    else next.add(y)
    return next
  })
  const selectAllYrs = () => setYrs(new Set(years.length ? years : YEARS))
  const isAllYrs = (years.length ? years : YEARS).every(y => yrs.has(y))
  const [demTypes, setDemTypes] = useState(new Set(['outside', 'inside']))
  const toggleDemType = k => setDemTypes(prev => { const n = new Set(prev); n.has(k) ? (n.size > 1 && n.delete(k)) : n.add(k); return n })
  const [supTypes, setSupTypes] = useState(new Set(['licensed', 'future', 'hajj']))
  const toggleSupType = k => setSupTypes(prev => { const n = new Set(prev); n.has(k) ? (n.size > 1 && n.delete(k)) : n.add(k); return n })
  const [view, setView] = useState('lines')
  const [scope, setScope] = useState('all')
  const [showModal, setModal] = useState(false)
  const [sc, setSc] = useState({ sl: 0, sf: 0, sh: 0, do_: 0, di: 0, bnH: 3.1, bH: 4.3 })
  const setSci = (k, v) => setSc(s => ({ ...s, [k]: v }))

  /* Scenarios */
  const adjusted = useMemo(() => rows.map(r => {
    const apply = scope === 'all' || yrs.has(r.yr)
    const a = (v, k) => v != null ? Math.round(v * (1 + (apply ? sc[k] : 0) / 100)) : null
    const util = r.utilPct ?? 0.8

    const bedsPerRoom = apply
      ? (r.isHajj ? sc.bH : sc.bnH)
      : (r.isHajj ? (r.bedsHajj ?? 4.3) : (r.bedsNonHajj ?? 3.1))

    return {
      ...r,
      // asl = sl × bedsNonHajj   (util applied later in series)
      asl: r.sl != null ? Math.round(r.sl * bedsPerRoom * (1 + (apply ? sc.sl : 0) / 100)) : null,

      // asf = sf   (NO beds/room multiplier per formula — only util applied later in series)
      asf: r.sf != null ? Math.round(r.sf * (1 + (apply ? sc.sf : 0) / 100)) : null,

      // ash = sh   (raw value — no beds factor, no util)
      ash: r.sh != null ? Math.round(r.sh * (1 + (apply ? sc.sh : 0) / 100)) : null,

      ado: a(r.do_, 'do_'), adi: a(r.di, 'di'),
    }
  }), [rows, sc, scope, yrs])

  const yrRows = useMemo(() => adjusted.filter(r => yrs.has(r.yr)), [adjusted, yrs])

  /* Series */
  const series = useMemo(() => yrRows.map(r => {
    const dem = (demTypes.has('outside') ? (r.ado ?? 0) : 0) + (demTypes.has('inside') ? (r.adi ?? 0) : 0)
    const util = r.utilPct ?? 0.8
    const sup = Math.round(((supTypes.has('licensed') ? (r.asl ?? 0) : 0) + (supTypes.has('future') ? (r.asf ?? 0) : 0)) * util) + (supTypes.has('hajj') ? (r.ash ?? 0) : 0)
    const gap = sup - dem
    return {
      dateKey: r.key, date: r.date,
      dateLabel: `${String(r.day).padStart(2, '0')}/${String(r.mo + 1).padStart(2, '0')}/${r.yr}`, monthLabel: AR_MON[r.mo],
      hijriDate: r.hijriDate ?? null,
      demand: dem || null, supply: sup || null, gap,
      deficit: gap < 0 ? -gap : 0, surplus: gap > 0 ? gap : 0,
      isRamadan: r.isRamadan, isHajj: r.isHajj,
      ado: demTypes.has('outside') ? (r.ado ?? 0) : 0,
      adi: demTypes.has('inside') ? (r.adi ?? 0) : 0,
    }
  }).filter(r => r.demand || r.supply), [yrRows, demTypes, supTypes])

  /* Peak demand — longest consecutive run at max demand value */
  const peakDemand = useMemo(() => {
    const v = series.filter(r => r.demand != null)
    return findExtremePeriod(v, r => r.demand ?? 0, true)
  }, [series])

  /* Peak supply — longest consecutive run at max supply value */
  const peakSupply = useMemo(() => {
    const v = series.filter(r => r.supply != null)
    return findExtremePeriod(v, r => r.supply ?? 0, true)
  }, [series])

  /* KPIs */
  const kpi = useMemo(() => {
    const v = series.filter(r => r.demand && r.supply); if (!v.length) return null
    const avgD = v.reduce((s, r) => s + r.demand, 0) / v.length
    const avgS = v.reduce((s, r) => s + r.supply, 0) / v.length
    const defD = v.filter(r => r.gap < 0).length
    const criticalDays = v.filter(r => r.demand >= 0.8 * r.supply).length
    const criticalPct = Math.round(criticalDays / v.length * 100)
    const peakOccRow = v.reduce((m, r) => (r.demand / r.supply) > (m.demand / m.supply) ? r : m, v[0])
    const peakOccPct = Math.round(peakOccRow.demand / peakOccRow.supply * 100)
    const occupancyPct = avgS > 0 ? Math.round(avgD / avgS * 100) : 0
    return {
      avgD, avgS, avgG: v.reduce((s, r) => s + r.gap, 0) / v.length,
      defD, defPct: defD / v.length * 100, total: v.length,
      maxDef: findExtremePeriod(v.filter(r => r.gap < 0), r => r.gap, false),
      maxSur: findExtremePeriod(v.filter(r => r.gap > 0), r => r.gap, true),
      criticalDays, criticalPct, occupancyPct,
      peakOccPct, peakOccLabel: peakOccRow.dateLabel,
    }
  }, [series])

  /* Future-projects contribution — how many deficit days sf would close */
  const sfContrib = useMemo(() => {
    const rows = yrRows.map(r => {
      const dem = (demTypes.has('outside') ? (r.ado ?? 0) : 0) + (demTypes.has('inside') ? (r.adi ?? 0) : 0)
      const util = r.utilPct ?? 0.8
      const supBase = Math.round((supTypes.has('licensed') ? (r.asl ?? 0) : 0) * util) + (supTypes.has('hajj') ? (r.ash ?? 0) : 0)
      const supFull = Math.round(((supTypes.has('licensed') ? (r.asl ?? 0) : 0) + (r.asf ?? 0)) * util) + (supTypes.has('hajj') ? (r.ash ?? 0) : 0)
      return { dem, supBase, supFull }
    }).filter(r => r.dem > 0)
    if (!rows.length) return null
    const defWithout = rows.filter(r => r.dem > r.supBase).length
    const defWith = rows.filter(r => r.dem > r.supFull).length
    const resolved = Math.max(0, defWithout - defWith)
    return {
      resolved,
      pct: defWithout > 0 ? Math.round(resolved / defWithout * 100) : 0,
      defWithout,
      hasFuture: rows.some(r => r.supFull > r.supBase),
    }
  }, [yrRows, demTypes, supTypes])


  /* Ramadan — enriched with per-period breakdown for dual-Ramadan (2030) */
  const ram = useMemo(() => {
    const periods = [...yrs].sort().flatMap(y =>
      getRamadanPeriods(y).map(p => ({ ...p, yr: y }))
    )

    const r = series.filter(x => x.isRamadan && (x.demand != null || x.supply != null))
    const o = series.filter(x => !x.isRamadan && (x.demand != null || x.supply != null))
    const dp = a => a.length ? a.filter(x => x.gap < 0).length / a.length * 100 : 0
    const ad = a => a.length ? a.reduce((s, x) => s + Math.max(0, -x.gap), 0) / a.length : 0
    const mx = a => a.length ? a.reduce((m, x) => x.gap < m.gap ? x : m, a[0]) : null
    // Per-period stats — days are matched by date range so they work even if series
    // only covers part of a period (e.g. 2030 Dec Ramadan ends in 2031)
    const perPeriod = periods.map((p, i) => {
      const days = series.filter(x => x.date >= p.s && x.date <= p.e && (x.demand != null || x.supply != null))
      return {
        idx: i + 1,
        label: yrs.size > 1
          ? `رمضان ${p.yr}${periods.filter(x => x.yr === p.yr).length > 1 ? ' ' + (RAM_ORDINAL[i] || '') : ''}`
          : (periods.length > 1 ? `رمضان ${RAM_ORDINAL[i] || '#' + (i + 1)}` : `رمضان ${p.yr}`),
        dateRange: `${fmtDate(p.s)} — ${fmtDate(p.e)}`,
        days: days.length,
        pct: dp(days),
        avg: ad(days),
        max: mx(days),
      }
    })
    return {
      rDays: r.length, rPct: dp(r), rAvg: ad(r), rMax: mx(r),
      oPct: dp(o), oAvg: ad(o), oMax: mx(o),
      perPeriod,
      isDual: periods.length > 1,
    }
  }, [series, yr, yrs])

  /* Mini chart data */
  const mini = useMemo(() => {
    // Donut
    const defDays = series.filter(r => r.demand && r.supply && r.gap < 0).length
    const surDays = series.filter(r => r.demand && r.supply && r.gap >= 0).length
    const tot = defDays + surDays
    const donut = [{ name: 'عجز', value: defDays, color: T.deficit }, { name: 'فائض', value: surDays, color: T.surplus }]
    const defPct = tot ? Math.round(defDays / tot * 100) : 0

    // Monthly bar
    const HIJRI_MO_NAMES = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة']
    const getHijriMonthYear = (hijriDate) => {
      if (!hijriDate) return null
      const parts = hijriDate.split(/[\/\-\.]/)
      if (parts.length < 3) return null
      const isYMD = parts[0].length === 4
      const moNum = parseInt(parts[1], 10)
      const yr = parseInt(isYMD ? parts[0] : parts[2], 10)
      if (moNum >= 1 && moNum <= 12 && yr > 1000) return { name: HIJRI_MO_NAMES[moNum - 1], hYr: yr }
      return null
    }
    const byMo = {}
    series.forEach(r => {
      if (!r.demand || !r.supply) return
      const m = r.date.getMonth()
      const gYr = r.date.getFullYear()
      if (!byMo[m]) byMo[m] = { sum: 0, n: 0, name: AR_MON[m], m, isRam: false, isHajj: false, hijriByGYear: {} }
      byMo[m].sum += r.gap; byMo[m].n++
      if (r.isRamadan) byMo[m].isRam = true
      if (r.isHajj) byMo[m].isHajj = true
      const parsed = getHijriMonthYear(r.hijriDate)
      if (parsed) {
        if (!byMo[m].hijriByGYear[gYr]) byMo[m].hijriByGYear[gYr] = new Set()
        byMo[m].hijriByGYear[gYr].add(`${parsed.name} ${parsed.hYr}`)
      }
    })
    // hijriByYear: sorted array of { gYr, months[] }
    const monthly = Object.values(byMo).sort((a, b) => a.m - b.m).map(v => ({
      name: v.name, gap: Math.round(v.sum / v.n), isRam: v.isRam, isHajj: v.isHajj,
      hijriByYear: Object.entries(v.hijriByGYear).sort((a, b) => a[0] - b[0]).map(([gYr, set]) => ({ gYr, months: [...set] }))
    }))

    // Hijri monthly bar — grouped by hijri month number
    const byHMo = {}
    series.forEach(r => {
      if (!r.demand || !r.supply) return
      const parsed = getHijriMonthYear(r.hijriDate)
      if (!parsed) return
      const moIdx = HIJRI_MO_NAMES.indexOf(parsed.name)
      if (moIdx < 0) return
      if (!byHMo[moIdx]) byHMo[moIdx] = { sum: 0, n: 0, name: parsed.name, m: moIdx, isRam: false, isHajj: false }
      byHMo[moIdx].sum += r.gap; byHMo[moIdx].n++
      if (r.isRamadan) byHMo[moIdx].isRam = true
      if (r.isHajj) byHMo[moIdx].isHajj = true
    })
    const monthlyHijri = Object.values(byHMo).sort((a, b) => a.m - b.m).map(v => ({
      name: v.name, gap: Math.round(v.sum / v.n), isRam: v.isRam, isHajj: v.isHajj,
    }))

    // Seasonal
    const seasons = [
      { name: 'رمضان', filter: r => r.isRamadan, color: T.ram },
      { name: 'حج', filter: r => r.isHajj, color: T.hajj },
      { name: 'باقي', filter: r => !r.isRamadan && !r.isHajj, color: T.txtSub },
    ]
    const seasonal = seasons.map(s => {
      const rows = series.filter(r => s.filter(r) && r.demand && r.supply)
      return { name: s.name, defPct: rows.length ? Math.round(rows.filter(r => r.gap < 0).length / rows.length * 100) : 0, color: s.color, days: rows.length }
    })

    // Demand split: average daily outside vs inside
    const splitRawRows = yrRows.filter(r => r.ado != null || r.adi != null)
    const split = splitRawRows

    return { donut, defPct, monthly, monthlyHijri, seasonal, split }
  }, [series])

  /* Ref areas */
  const refB = useCallback(dates => {
    if (!dates || !series.length) return null
    const s = series.find(d => d.date >= dates.s), e = [...series].reverse().find(d => d.date <= dates.e)
    return s && e ? { x1: s.dateKey, x2: e.dateKey } : null
  }, [series])
  const ramRefs = useMemo(() =>
    [...yrs].sort().flatMap(y =>
      getRamadanPeriods(y).map(p => refB(p)).filter(Boolean)
    ), [yrs, series])

  const hajjRefs = useMemo(() =>
    [...yrs].sort().map(y => refB(HAJJ[y])).filter(Boolean),
    [yrs, series])

  const xTick = k => {
    const d = series.find(x => x.dateKey === k)
    if (!d || d.date.getDate() !== 1) return ''
    // Multi-year view: show the year number at each January 1st tick
    if (yrs.size >= 2) return d.date.getMonth() === 0 ? String(d.date.getFullYear()) : ''
    // Single-year view: show Arabic month name at each month start
    return AR_MON[d.date.getMonth()]
  }
  const xInt = Math.max(0, Math.floor(series.length / 13) - 1)

  const exportXLSX = () => {
    const rows = [
      [
        'التاريخ الميلادي',
        'التاريخ الهجري',
        'المستهدفات',
        'الطاقة الاستيعابية',
        'الفجوة',
        'الحالة',
        'رمضان',
        'حج'
      ],
      ...series.map(r => [
        r.dateLabel ?? r.dateKey ?? '',
        r.hijriDate ?? '',
        r.demand ?? '',
        r.supply ?? '',
        r.gap ?? '',
        r.gap < 0 ? 'عجز' : 'فائض',
        r.isRamadan ? 'نعم' : 'لا',
        r.isHajj ? 'نعم' : 'لا'
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'التفاصيل اليومية');

    XLSX.writeFile(
      wb,
      `إيواء_مكة_${yr ?? [...yrs].sort().join('-')}.xlsx`
    );
  };

  /* Shared chart config */
  const ChartDefs = () => (
    <defs>
      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={T.dem} stopOpacity={.25} />
        <stop offset="70%" stopColor={T.dem} stopOpacity={.05} />
        <stop offset="100%" stopColor={T.dem} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={T.sup} stopOpacity={.20} />
        <stop offset="70%" stopColor={T.sup} stopOpacity={.04} />
        <stop offset="100%" stopColor={T.sup} stopOpacity={0} />
      </linearGradient>
      <filter id="glow-dem"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="glow-sup"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
  )
  const Shading = () => (<>
    {ramRefs.map((ref, i) => (
      <ReferenceArea key={`ram-${i}`} x1={ref.x1} x2={ref.x2}
        fill={T.ram} fillOpacity={.09}
        stroke={T.ram} strokeOpacity={.28}
        label={{ position: 'insideTopRight', fill: T.ram, fontSize: 13 }} />
    ))}
    {hajjRefs.map((ref, i) => (
      <ReferenceArea key={`hajj-${i}`} x1={ref.x1} x2={ref.x2}
        fill={T.hajj} fillOpacity={.08}
        stroke={T.hajj} strokeOpacity={.28}
        label={{ position: 'insideTopRight', fill: T.hajj, fontSize: 13 }} />
    ))}
  </>)
  const fmtAxis = v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}م` : v >= 1000 ? `${(v / 1000).toFixed(0)}ألف` : `${v}`
  const monthStartKeys = useMemo(() =>
    yrs.size >= 2
      ? series.filter(d => d.date.getDate() === 1 && d.date.getMonth() === 0).map(d => d.dateKey)
      : series.filter(d => d.date.getDate() === 1).map(d => d.dateKey)
    , [series, yrs])
  const axisX = {
    dataKey: "dateKey",
    ticks: monthStartKeys,        // ← only render these tick positions
    tickFormatter: xTick,
    tick: { fontSize: 10, fill: T.txtDim },
    interval: 0,
    axisLine: { stroke: 'rgba(65,64,66,0.10)' },
    tickLine: false,
    reversed: true
  }
  const axisY = { tickFormatter: fmtAxis, tick: { fontSize: 10, fill: T.txtDim }, width: 52, axisLine: false, tickLine: false }
  const grid = { strokeDasharray: "3 6", stroke: 'rgba(65,64,66,0.07)', vertical: false }
  const legFmt = { formatter: v => ({ demand: 'المستهدفات', supply: 'الطاقة الاستيعابية', deficit: 'عجز', surplus: 'فائض' }[v] || v), wrapperStyle: { fontSize: 11, paddingTop: 8, color: T.txtSub } }

  const [showExport, setShowExport] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showSc, setShowSc] = useState(false)
  const SC_PCT_KEYS = ['sl', 'sf', 'sh', 'do_', 'di']
  const hasAnyScChange = SC_PCT_KEYS.some(k => (sc[k] ?? 0) !== 0) || (sc.bnH ?? 3.1) !== 3.1 || (sc.bH ?? 4.3) !== 4.3
  const activeScCount = SC_PCT_KEYS.filter(k => (sc[k] ?? 0) !== 0).length + ((sc.bnH ?? 3.1) !== 3.1 ? 1 : 0) + ((sc.bH ?? 4.3) !== 4.3 ? 1 : 0)

  useEffect(() => {
    injectNavStyles()
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])


  /* ══════════════════════════════════════ RENDER ══════════════════════════════════════ */
  return (
    <div className="cl-root" style={{ direction: 'rtl', background: '#fefefe', minHeight: '100vh', color: '#414042' }}>

      {/* ── NAVBAR ── */}
      <Navbar scrolled={true} navigate={navigate} />

      {/* ── CONTENT (padded below fixed navbar) ── */}
      <div style={{ paddingTop: 80 }}>

        {/* ── PAGE HEADER ── */}
        <PageHeader
          yrs={yrs} years={years} yr={yr}
          isAllYrs={isAllYrs} toggleYr={toggleYr} selectAllYrs={selectAllYrs}
          demTypes={demTypes} toggleDemType={toggleDemType}
          supTypes={supTypes} toggleSupType={toggleSupType}
          showSc={showSc} setShowSc={setShowSc}
          hasAnyScChange={hasAnyScChange} activeScCount={activeScCount}
          onExport={() => setShowExport(true)}
          onDetails={() => setModal(true)}
          peakDemand={peakDemand} kpi={kpi} series={series} fileDate={fileDate}
          TPname="إيواء مكة المكرمة "
        />

        {/* ── BODY — sidebar + content side by side ── */}
        <div className={`main-layout${showSc ? ' sc-open' : ''}`}>

          {/* Scenario sidebar — inline, shifts content */}
          <div className={`scenario-panel${showSc ? ' open' : ''}`}>
            <ScenarioSidebar sc={sc} setSci={setSci} onClose={() => setShowSc(false)} />
          </div>

          <div className="content-area">

            {warns.map((w, i) => (
              <div key={i} className="span-full" style={{ background: T.warnBg, border: `1px solid ${T.warnBdr}`, borderRadius: 10, padding: '9px 14px', color: T.warn, fontSize: 12 }}>{w}</div>
            ))}

            {/* ════════════════════════════════════════
               ROW 1 — TOP 4 KPI CARDS
            ════════════════════════════════════════ */}
            <div className="span-full">
              {kpi ? (
                <div className="kpi-top-grid">

                  {/* 1. أعلى حمل يومي — exact number */}
                  <div className="card fade-up"
                    style={{ padding: '14px 13px', borderTop: `2px solid ${T.dem}`, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.txtSub, lineHeight: 1.45 }}>أعلى حمل يومي <InfoBadge text="أعلى طلب يومي متوقع خلال الفترة المحددة" /></div>
                      {peakDemand && !peakDemand.isSingleDay && <span style={{ fontSize: 9.5, color: T.txtDim, fontWeight: 700, background: 'rgba(65,64,66,0.06)', border: '1px solid rgba(65,64,66,0.14)', padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap' }}>{peakDemand.days} يوم</span>}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: T.dem, lineHeight: 1 }}>                      {peakDemand ? fmtFull(peakDemand.value) : '—'}
                      <span style={{ fontSize: 11.5, fontWeight: 500, marginRight: 5 }}>معتمر/يوم</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: T.txtSub, fontWeight: 600, marginTop: 6 }}>
                      <PeriodLabel period={peakDemand} />
                    </div>
                  </div>

                  {/* 2. أعلى طاقة استيعابية */}
                  <div className="card fade-up"
                    style={{ padding: '14px 13px', borderTop: `2px solid ${T.sup}`, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.txtSub, lineHeight: 1.45 }}>أعلى طاقة استيعابية <InfoBadge text="أعلى عدد أسرّة متاحة خلال الفترة المحددة" /></div>
                      {peakSupply && !peakSupply.isSingleDay && <span style={{ fontSize: 9.5, color: T.txtDim, fontWeight: 700, background: 'rgba(65,64,66,0.06)', border: '1px solid rgba(65,64,66,0.14)', padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap' }}>{peakSupply.days} يوم</span>}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: T.sup, lineHeight: 1 }}>
                      {fmtFull(peakSupply?.value)}
                      <span style={{ fontSize: 11.5, fontWeight: 500, marginRight: 5 }}>سرير/يوم</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: T.txtSub, fontWeight: 600, marginTop: 6 }}>
                      <PeriodLabel period={peakSupply} />
                    </div>
                  </div>

                  {/* 3. أعلى عجز */}
                  {(() => {
                    const gap = Number(kpi?.maxDef?.value ?? 0)  // value is negative (min gap)
                    const hasDef = gap < 0
                    const color = hasDef ? T.deficit : T.txtSub
                    return (
                      <div className="card fade-up"
                        style={{ padding: '14px 13px', borderTop: `2px solid ${color}`, borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.txtSub, lineHeight: 1.45 }}>أعلى عجز <InfoBadge text="أعلى عجز يومي متوقع خلال الفترة المحددة" /></div>
                          {hasDef && kpi?.maxDef && !kpi.maxDef.isSingleDay && <span style={{ fontSize: 9.5, color: T.txtDim, fontWeight: 700, background: 'rgba(65,64,66,0.06)', border: '1px solid rgba(65,64,66,0.14)', padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap' }}>{kpi.maxDef.days} يوم</span>}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>
                          {hasDef ? fmtFull(-gap) : '0'}
                          {hasDef && <span style={{ fontSize: 11.5, fontWeight: 500, marginRight: 5 }}>سرير/يوم</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: T.txtSub, fontWeight: 600, marginTop: 6 }}>
                          {hasDef ? (
                            <PeriodLabel period={kpi?.maxDef} />
                          ) : (
                            <span style={{ color: T.txtDim }}>لا يوجد عجز</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 4. أعلى فائض */}
                  {kpi?.maxSur?.value > 0 ? (
                    <div className="card fade-up"
                      style={{ padding: '14px 13px', borderTop: `2px solid ${T.surplus}`, borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.txtSub, lineHeight: 1.45 }}>
                          أعلى فائض <InfoBadge text="أعلى فائض يومي في الطاقة الاستيعابية خلال الفترة المحددة" />
                        </div>
                        {kpi?.maxSur && !kpi.maxSur.isSingleDay && <span style={{ fontSize: 9.5, color: T.txtDim, fontWeight: 700, background: 'rgba(65,64,66,0.06)', border: '1px solid rgba(65,64,66,0.14)', padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap' }}>{kpi.maxSur.days} يوم</span>}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: T.surplus, lineHeight: 1 }}>
                        {fmtFull(kpi.maxSur.value)}
                        <span style={{ fontSize: 11.5, fontWeight: 500, marginRight: 5 }}>سرير/يوم</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: T.txtSub, fontWeight: 600, marginTop: 6 }}>
                        <PeriodLabel period={kpi?.maxSur} />
                      </div>
                    </div>
                  ) : (
                    <div className="card fade-up"
                      style={{ padding: '14px 13px', borderTop: `2px solid rgba(65,64,66,0.12)`, borderRadius: 12, opacity: 0.4 }}>
                      <div style={{ fontSize: 12, color: T.txtDim }}>لا يوجد فائض</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: T.warnBg, borderRadius: 12, padding: 12, color: T.warn, fontSize: 12, border: `1px solid ${T.warnBdr}`, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <FiAlertTriangle size={14} /> لا تتوفر بيانات كافية
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════
               ROW 2 — THREE CHARTS: donut | monthly (wider) | demand split
            ════════════════════════════════════════ */}
            {series.length > 0 && (
              <div className="span-full mini-charts-trio">
                <DonutChart donut={mini.donut} defPct={mini.defPct} />
                <MonthlyBarChart monthly={mini.monthly} monthlyHijri={mini.monthlyHijri} defPct={mini.defPct} series={series} yrs={yrs} />
                <SeasonalRadialBar seasonal={mini.seasonal} />
              </div>
            )}

            {/* ════════════════════════════════════════
               ROW 3 — MAIN CHART FULL WIDTH
            ════════════════════════════════════════ */}
            <div className="span-full">
              <div className="card fade-up" style={{ padding: '18px 16px 14px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10, rowGap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 4, height: 36, borderRadius: 4, background: `linear-gradient(to bottom,${T.dem},${T.sup})`, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: T.txt, display: 'flex', alignItems: 'center', gap: 6 }}>
                        الطاقة الاستيعابية مقابل المستهدفات
                        <InfoBadge text="يوضح إجمالي الطلب المتوقع على الإيواء مقابل الطاقة الاستيعابية للفترة المحددة بشكل يومي" />
                      </div>
                      <div style={{ fontSize: 13, color: T.txtDim, marginTop: -1 }}>
                        {yr ?? [...yrs].sort().join('، ')}
                      </div>
                    </div>
                  </div>
                </div>

                {series.length > 0 ? (
                  <>
                    <div className="main-chart-container" style={{ minWidth: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                        {view === 'lines' ? (
                          <ComposedChart data={series} margin={{ top: 10, right: 12, left: -30, bottom: 6 }}>
                            <ChartDefs />
                            <CartesianGrid {...grid} />
                            <Shading />
                            <XAxis {...axisX} />
                            <YAxis {...axisY} />
                            <Tooltip content={<GapTooltip />} animationDuration={120} wrapperStyle={{ zIndex: 9999 }} allowEscapeViewBox={{ x: true, y: true }} />
                            <Line type="monotone" dataKey="demand" name="demand" stroke={T.dem} strokeWidth={2.8} dot={false} animationDuration={1600} animationEasing="ease-out"
                              activeDot={({ cx, cy }) => (
                                <circle cx={cx} cy={cy} r={7} fill={T.dem} stroke="#1A1819" strokeWidth={2.5}
                                />
                              )} />
                            <Line type="monotone" dataKey="supply" name="supply" stroke={T.sup} strokeWidth={2.5} dot={false} animationDuration={1400}
                              activeDot={{ r: 6, fill: T.sup, stroke: '#ffffff', strokeWidth: 2.5 }} />
                          </ComposedChart>
                        ) : (
                          <ComposedChart data={series} margin={{ top: 10, right: 12, left: 4, bottom: 6 }}>
                            <CartesianGrid {...grid} />
                            <Shading />
                            <XAxis {...axisX} />
                            <YAxis {...axisY} />
                            <ReferenceLine y={0} stroke="rgba(65,64,66,0.20)" strokeDasharray="4 3" strokeWidth={1.5} />
                            <Tooltip content={<GapTooltip />} animationDuration={120} wrapperStyle={{ zIndex: 9999 }} allowEscapeViewBox={{ x: true, y: true }} />
                            <Legend {...legFmt} />
                            <Bar dataKey="deficit" name="deficit" fill={T.deficit} fillOpacity={.82} radius={[3, 3, 0, 0]} maxBarSize={9} animationDuration={1200} animationEasing="ease-out" />
                            <Bar dataKey="surplus" name="surplus" fill={T.surplus} fillOpacity={.85} radius={[4, 4, 0, 0]} maxBarSize={10} animationDuration={1200} animationEasing="ease-out" />
                          </ComposedChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    {/* Legend strip */}
                    <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(65,64,66,0.08)', flexWrap: 'wrap' }}>
                      {[
                        { c: T.dem, l: 'المستهدفات', type: 'line' },
                        { c: T.sup, l: 'الطاقة الاستيعابية', type: 'line' },
                        { c: T.ram, l: 'رمضان', type: 'area' },
                        { c: T.hajj, l: 'الحج', type: 'area' },
                      ].map(x => (
                        <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.txtSub }}>
                          {x.type === 'area'
                            ? <span style={{ width: 14, height: 10, background: x.c, opacity: .35, display: 'inline-block', borderRadius: 2, border: `1px dashed ${x.c}` }} />
                            : <span style={{ width: 16, height: 3, background: x.c, display: 'inline-block', borderRadius: 2, opacity: x.a || 1 }} />
                          }
                          {x.l}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, color: T.txtDim, gap: 12 }}>
                    <div style={{ fontSize: 42, color: T.txtDim, opacity: 0.5 }}><FiInbox size={42} /></div>
                    <div style={{ fontSize: 14 }}>لا توجد بيانات لسنة {yr}</div>
                  </div>
                )}
              </div>
            </div>

            {/* ════════════════════════════════════════
               ROW 4a — seasonal | ramadan carousel | باقي الأشهر
            ════════════════════════════════════════ */}
            {kpi && (
              <div className="span-full">

                {/* Top 3-col row */}
                <div className="analysis-top-row">

                  {/* Col 1: الفئات من المستهدفات */}
                  <DemandSplitChart split={mini.split} />

                  {/* Col 2: رمضان carousel */}
                  <RamadanCarousel periods={ram.perPeriod ?? []} ram={ram} T={T} />

                  {/* Col 3: تحليل باقي الأشهر */}
                  <div className="card" style={{ padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: T.txtSub, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                      تحليل باقي الأشهر <InfoBadge text="يوضح حالة العجز أو الفائض في الطاقة الاستيعابية خلال باقي الأشهر، خارج موسمي رمضان والحج" />
                    </div>
                    <div style={{ borderRadius: 8, padding: '8px 11px', fontSize: 11, fontWeight: 800, marginBottom: 10, background: ram.oPct < 30 ? T.surplusBg : T.deficitBg, color: ram.oPct < 30 ? T.surplus : T.deficit, border: `1px solid ${ram.oPct < 30 ? T.surplusL : T.deficitL}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {ram.oPct < 30
                        ? <><FiCheckCircle size={12} /> عجز في أقل من {Math.round(ram.oPct)}% من الأيام</>
                        : <><FiAlertTriangle size={12} /> عجز في {Math.round(ram.oPct)}% من الأيام</>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: T.txtSub }}>متوسط العجز</span>
                      <strong style={{ fontSize: 12, color: T.txt }}>{fmtFull(ram.oAvg)} سرير/يوم</strong>
                    </div>
                    {ram.oMax?.gap < 0 && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 11, color: T.txtSub }}>أعلى عجز</span>
                          <strong style={{ fontSize: 12, color: T.deficit }}>{fmtFull(-ram.oMax.gap)} <span style={{ fontSize: 10, fontWeight: 500, color: T.txtDim }}>سرير/يوم</span></strong>
                        </div>
                        <div style={{ fontSize: 10.5, color: T.txtSub, marginTop: 1, textAlign: 'left' }}>
                          {ram.oMax.dateLabel}{ram.oMax.hijriDate ? <span> · {ram.oMax.hijriDate}</span> : ''}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Col 4: متوسط الفجوة اليومية */}
                  {(() => {
                    const isGap = kpi.avgG < 0
                    const gapColor = isGap ? T.deficit : T.surplus
                    const gapBg = isGap ? T.deficitBg : T.surplusBg
                    const gapBdr = isGap ? T.deficitL : T.surplusL
                    const fillPct = kpi.avgD > 0 ? Math.round(kpi.avgS / kpi.avgD * 100) : 0
                    return (
                      <div className="card fade-up" style={{ padding: '16px 18px 14px', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 3, height: 16, borderRadius: 3, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: T.txtSub, display: 'flex', alignItems: 'center', gap: 5 }}>
                              متوسط الفجوة اليومية <InfoBadge text="متوسط الفرق اليومي بين الطلب والطاقة — يعكس الضغط العام على المنظومة الفندقية طوال الفترة" />
                            </span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 11px', borderRadius: 20, background: gapBg, color: gapColor, border: `1px solid ${gapBdr}`, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {isGap ? <><FiAlertTriangle size={10} /> عجز</> : <><FiCheckCircle size={10} /> فائض</>}
                          </span>
                        </div>
                        <div className="gap-analysis-row" style={{ alignItems: 'stretch', gap: 8 }}>
                          <div style={{ flex: 1, background: T.supBg, borderRadius: 10, border: `1px solid ${T.supL}`, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9.5, color: T.sup, fontWeight: 700, marginBottom: 4 }}>متوسط الطاقة الاستيعابية اليومية</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: T.sup, lineHeight: 1 }}>{fmtExact(kpi.avgS)}</div>
                            <div style={{ fontSize: 9, color: T.txtDim, marginTop: 3 }}>سرير/يوم</div>
                          </div>
                          <div className="gap-analysis-separator" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: gapColor, opacity: .6 }}>-</span>
                          </div>
                          <div style={{ flex: 1, background: T.demBg, borderRadius: 10, border: `1px solid ${T.demL}`, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9.5, color: T.dem, fontWeight: 700, marginBottom: 4 }}>متوسط المستهدفات اليومية</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: T.dem, lineHeight: 1 }}>{fmtExact(kpi.avgD)}</div>
                            <div style={{ fontSize: 9, color: T.txtDim, marginTop: 3 }}>معتمر/يوم</div>
                          </div>
                          <div className="gap-analysis-separator" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: gapColor, opacity: .6 }}>=</span>
                          </div>
                          <div style={{ flex: 1, background: gapBg, borderRadius: 10, border: `1.5px solid ${gapBdr}`, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9.5, color: gapColor, fontWeight: 700, marginBottom: 4 }}>{isGap ? 'متوسط العجز اليومي' : 'متوسط الفائض اليومي'}</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: gapColor, lineHeight: 1 }}>{fmtExact(Math.abs(kpi.avgG))}</div>
                            <div style={{ fontSize: 9, color: T.txtDim, marginTop: 3 }}>سرير/يوم</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(65,64,66,0.08)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 9, color: T.txtDim }}>نسبة تغطية المستهدفات</span>
                            <span style={{ fontSize: 9.5, fontWeight: 900, color: fillPct >= 100 ? T.surplus : T.deficit }}>{fillPct}%</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 5, background: 'rgba(65,64,66,0.08)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 5, width: `${Math.min(fillPct, 100)}%`, background: fillPct >= 100 ? `linear-gradient(to left,${T.surplus},${T.surplus}aa)` : `linear-gradient(to left,${T.deficit}dd,${T.deficit}88)`, transition: 'width .9s cubic-bezier(.4,0,.2,1)' }} />
                          </div>

                        </div>
                      </div>
                    )
                  })()}

                </div>{/* /analysis-top-row */}

              </div>
            )}

          </div>{/* /content-area */}
        </div>{/* /main-layout */}

        {showModal && <DetailsModal yr={yr ?? [...yrs].sort()[0]} tableRows={series} onClose={() => setModal(false)} onExport={exportXLSX} />}

        {showExport && (
          <ExportModal
            onClose={() => setShowExport(false)}
            payload={buildReportPayload({ yr, kpi, ram, sc, scope, peakDemand, series, demTypes, supTypes })}
          />
        )}

      </div>{/* /content padded wrapper */}

      {/* ── FOOTER ── */}
      <Footer navigate={navigate} />

    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════ */
export default function App() {
  const [db, setDb] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null)
  const [fileDate, setFileDate] = useState(null)

  useEffect(() => {
    fetch('/housing.json')
      .then(r => {
        const lastMod = r.headers.get('Last-Modified')
        if (lastMod) setFileDate(new Date(lastMod))
        else setFileDate(new Date()) // fallback: now
        return r.json()
      })
      .then(data => {
        data.rows = data.rows.map(r => ({ ...r, date: new Date(r.date) }))
        data.rows.length ? setDb(data) : setError('لا توجد بيانات صالحة')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingScreen />
  if (error || !db) return <ErrorScreen message={error || 'خطأ غير معروف'} />
  return <Dashboard db={db} fileDate={fileDate} />
}