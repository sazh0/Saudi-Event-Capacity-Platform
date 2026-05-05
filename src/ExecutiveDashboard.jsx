import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar, Footer } from './SharedLayout'
import { C, injectNavStyles } from './theme'
import './ExecutiveDashboard.css'
import SA_MAP_PATHS from './saMapPaths'

/* ════════════════════════════════════════════════════════════════
   EXECUTIVE DASHBOARD v8
   المنصة الوطنية لدراسات الطاقة الاستيعابية
════════════════════════════════════════════════════════════════ */

const T = {
  navy: '#0f1720', navyL: '#1a2836',
  gold: '#c8a04a', goldL: '#d4b366', goldDk: '#967126',
  txt: '#414042', txtSub: '#75787b', txtDim: 'rgba(65,64,66,0.45)',
  surplus: '#007a53', deficit: '#b85c4e',
}

const YEARS = [2026, 2027, 2028, 2029, 2030]
const fmtN = n => {
  if (n == null || isNaN(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)} م`
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)} ألف`
  return Math.round(n).toLocaleString('en-US').replace(/,/g, '،')
}

/* ═══ ANIMATED NUMBER HOOK ═══ */
function useAnimatedNumber(target, duration = 600) {
  const [display, setDisplay] = useState(target)
  const rafRef = useRef(null)
  const fromRef = useRef(target)
  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    const startTime = performance.now()
    const animate = now => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (target - from) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])
  useEffect(() => { fromRef.current = target }, []) // eslint-disable-line
  return display
}

const SECTIONS = [
  { id: 'arrival', label: 'الانطباع الأول', color: '#007a53' },
  { id: 'nusuk', label: 'أداء النسك', color: '#967126' },
  { id: 'city', label: 'تجربة المدينتين', color: '#006e96' },
  { id: 'support', label: 'الخدمات المساندة', color: '#833B2E' },
]

const ring = (cx, cy, r, i, n) => ({
  x: cx + r * Math.cos((i / n) * Math.PI * 2 - Math.PI / 2),
  y: cy + r * Math.sin((i / n) * Math.PI * 2 - Math.PI / 2),
})
const MK = { x: 351, y: 535 }, MD = { x: 240, y: 399 }

const TOUCHPOINTS = [
  { id: 'jeddahAirport', section: 'arrival', label: 'مطار جدة', unit: 'راكب/يوم', supKey: 'jeddahAirport', demKey: 'jeddahAirport', x: 290, y: 510 },
  { id: 'madinahAirport', section: 'arrival', label: 'مطار المدينة', unit: 'راكب/يوم', supKey: 'madinahAirport', demKey: 'madinahAirport', x: 262, y: 385 },
  { id: 'taifAirport', section: 'arrival', label: 'مطار الطائف', unit: 'راكب/يوم', supKey: 'taifAirport', demKey: 'taifAirport', x: 388, y: 560 },
  { id: 'yanbuAirport', section: 'arrival', label: 'مطار ينبع', unit: 'راكب/يوم', supKey: 'yanbuAirport', demKey: 'yanbuAirport', x: 192, y: 420 },
  { id: 'kingFahdCauseway', section: 'arrival', label: 'جسر الملك فهد', unit: 'شخص/يوم', supKey: 'kingFahdCauseway', demKey: 'kingFahdCauseway', x: 778, y: 410 },
  { id: 'salwa', section: 'arrival', label: 'سلوى', unit: 'شخص/يوم', supKey: 'salwa', demKey: 'salwa', x: 755, y: 478 },
  { id: 'alBatha', section: 'arrival', label: 'البطحاء', unit: 'شخص/يوم', supKey: 'alBatha', demKey: 'alBatha', x: 718, y: 558 },
  { id: 'alHaditha', section: 'arrival', label: 'الحديثة', unit: 'شخص/يوم', supKey: 'alHaditha', demKey: 'alHaditha', x: 205, y: 188 },
  { id: 'halatAmmar', section: 'arrival', label: 'حالة عمار', unit: 'شخص/يوم', supKey: 'halatAmmar', demKey: 'halatAmmar', x: 148, y: 225 },
  { id: 'jadidatArar', section: 'arrival', label: 'جديدة عرعر', unit: 'شخص/يوم', supKey: 'jadidatArar', demKey: 'jadidatArar', x: 405, y: 152 },
  { id: 'alKhadra', section: 'arrival', label: 'الخضراء', unit: 'شخص/يوم', supKey: 'alKhadra', demKey: 'alKhadra', x: 615, y: 368 },
  { id: 'alKhafji', section: 'arrival', label: 'الخفجي', unit: 'شخص/يوم', supKey: 'alKhafji', demKey: 'alKhafji', x: 688, y: 305 },
  { id: 'alDurrah', section: 'arrival', label: 'الدرة', unit: 'شخص/يوم', supKey: 'alDurrah', demKey: 'alDurrah', x: 785, y: 438 },
  { id: 'emptyQuarter', section: 'arrival', label: 'الربع الخالي', unit: 'شخص/يوم', supKey: 'emptyQuarter', demKey: 'emptyQuarter', x: 648, y: 638 },
  { id: 'alRuqi', section: 'arrival', label: 'الرقي', unit: 'شخص/يوم', supKey: 'alRuqi', demKey: 'alRuqi', x: 698, y: 572 },
  { id: 'alWadiah', section: 'arrival', label: 'الوديعة', unit: 'شخص/يوم', supKey: 'alWadiah', demKey: 'alWadiah', x: 538, y: 708 },
  { id: 'alb', section: 'arrival', label: 'علب', unit: 'شخص/يوم', supKey: 'alb', demKey: null, x: 382, y: 742 },
  { id: 'mataf', section: 'nusuk', label: 'المطاف', unit: 'طائف/يوم', supKey: 'mataf', demKey: 'mataf', ...ring(MK.x, MK.y, 24, 0, 3) },
  { id: 'masaa', section: 'nusuk', label: 'المسعى', unit: 'ساعٍ/يوم', supKey: 'masaa', demKey: 'masaa', ...ring(MK.x, MK.y, 24, 1, 3) },
  { id: 'makkahPrayer', section: 'nusuk', label: 'الحرم المكي', unit: 'مصلٍّ/يوم', supKey: 'makkahPrayer', demKey: 'makkahPrayer', ...ring(MK.x, MK.y, 24, 2, 3) },
  { id: 'madinahPrayer', section: 'nusuk', label: 'المسجد النبوي', unit: 'مصلٍّ/صلاة', supKey: 'madinahPrayer', demKey: 'madinahPrayer', x: MD.x, y: MD.y },
  { id: 'makkahAccommodation', section: 'city', label: 'إيواء مكة', unit: 'سرير/يوم', supKey: 'makkahAccommodation', demKey: 'makkahAccommodation', x: MK.x - 30, y: MK.y + 8 },
  { id: 'madinahAccommodation', section: 'city', label: 'إيواء المدينة', unit: 'سرير/يوم', supKey: 'madinahAccommodation', demKey: 'madinahAccommodation', x: MD.x - 26, y: MD.y + 8 },
  { id: 'makkahWater', section: 'support', label: 'مياه مكة', unit: 'شخص', supKey: 'makkahWater', demKey: 'makkahWater', ...ring(MK.x, MK.y, 40, 0, 4) },
  { id: 'makkahEnergy', section: 'support', label: 'طاقة مكة', unit: 'شخص', supKey: 'makkahEnergy', demKey: 'makkahEnergy', ...ring(MK.x, MK.y, 40, 1, 4) },
  { id: 'makkahTelecom', section: 'support', label: 'اتصالات مكة', unit: 'شخص/يوم', supKey: 'makkahTelecom', demKey: 'makkahTelecom', ...ring(MK.x, MK.y, 40, 2, 4) },
  { id: 'madinahWater', section: 'support', label: 'مياه المدينة', unit: 'شخص', supKey: 'madinahWater', demKey: 'madinahWater', ...ring(MD.x, MD.y, 34, 0, 3) },
  { id: 'madinahEnergy', section: 'support', label: 'طاقة المدينة', unit: 'شخص', supKey: 'madinahEnergy', demKey: 'madinahEnergy', ...ring(MD.x, MD.y, 34, 1, 3) },
  { id: 'madinahTelecom', section: 'support', label: 'اتصالات المدينة', unit: 'شخص/يوم', supKey: 'madinahTelecom', demKey: 'madinahTelecom', ...ring(MD.x, MD.y, 34, 2, 3) },
]

/* ═══ LAYOUT ═══ */
const SIDE_W_1COL = 700
const SIDE_W_2COL = 380 * 2 + 14 + 60
const MAP_BASE_H = 900
const CARD_W = 380, CARD_H = 230, CARD_GAP = 14
const CARD_PAD_TOP = 28, CARD_PAD_BOT = 28
const L_CARD_X = -CARD_W - 40
const R_CARD_X = 1000 + 40
const L_ARROW_END = L_CARD_X + CARD_W
const R_ARROW_END = R_CARD_X
const COL2_THRESHOLD = 3

/* ═══ SEMI-GAUGE — light-theme track ═══ */
let _gid = 0
function SemiGaugeSVG({ cx, cy, r, pct, color, trackColor = 'rgba(0,0,0,0.06)', sw = 11, showTicks = false }) {
  const uid = useMemo(() => `sg${++_gid}`, [])
  const semiLen = Math.PI * r
  const clamped = Math.min(pct, 100)
  const dashOff = semiLen * (1 - clamped / 100)
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const ticks = showTicks ? [0, 25, 50, 75, 100].map(p => {
    const a = Math.PI * (1 - p / 100)
    const ri = r + sw / 2 + 3, ro = r + sw / 2 + 8
    return { x1: cx + ri * Math.cos(a), y1: cy - ri * Math.sin(a), x2: cx + ro * Math.cos(a), y2: cy - ro * Math.sin(a), major: p === 0 || p === 50 || p === 100 }
  }) : []
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="40%" stopColor={color} stopOpacity="0.82" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <path d={arc} fill="none" stroke={color} strokeWidth={sw + 16} strokeLinecap="round" opacity={0.04} />
      <path d={arc} fill="none" stroke={trackColor} strokeWidth={sw} strokeLinecap="round" />
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.major ? 'rgba(65,64,66,0.14)' : 'rgba(65,64,66,0.07)'}
          strokeWidth={t.major ? 1.3 : 0.7} strokeLinecap="round" />
      ))}
      {clamped > 0 && (
        <>
          <path d={arc} fill="none" stroke={color} strokeWidth={sw + 5} strokeLinecap="round" opacity={0.08}
            strokeDasharray={semiLen} strokeDashoffset={semiLen} className="gauge-arc" style={{ '--gauge-target': dashOff }} />
          <path d={arc} fill="none" stroke={`url(#${uid}-g)`} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={semiLen} strokeDashoffset={semiLen} className="gauge-arc" style={{ '--gauge-target': dashOff }} />
        </>
      )}
    </g>
  )
}

/* ═══ SIDE CARD — Light theme ═══ */
let _cid = 0
function SideCard({ x, y, tp, secColor, delay, isHighlighted }) {
  const cuid = useMemo(() => `sc${++_cid}`, [])
  const isDef = tp.gap < 0
  const col = isDef ? T.deficit : T.surplus
  const W = CARD_W, H = CARD_H
  const PAD = 18
  const HEADER_Y = y + PAD
  const GAUGE_CX = x + W / 2, GAUGE_CY = y + 115, GAUGE_R = 60
  const METRICS_Y = y + H - 60
  const colW = (W - PAD * 2 - 16) / 3
  const col1X = x + PAD, col2X = col1X + colW + 8, col3X = col2X + colW + 8

  return (
    <g className={`exec-side-card${isHighlighted ? ' exec-card-highlight' : ''}`}
      style={{ '--c-delay': `${delay + 0.45}s` }} data-card-id={tp.id}>
      <defs>
        <filter id={`${cuid}-sh`} x="-6%" y="-4%" width="112%" height="114%">
          <feDropShadow dx="0" dy="3" stdDeviation="10" floodColor="rgba(65,64,66,0.12)" />
        </filter>
        <filter id={`${cuid}-hl`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor={secColor || col} floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Card shell — white */}
      <rect x={x} y={y} width={W} height={H} rx={16} fill="#ffffff"
        filter={isHighlighted ? `url(#${cuid}-hl)` : `url(#${cuid}-sh)`} />
      <rect x={x} y={y} width={W} height={H} rx={16} fill="none"
        stroke={isHighlighted ? (secColor || col) : 'rgba(65,64,66,0.08)'}
        strokeWidth={isHighlighted ? 1.8 : 0.8} />
      {/* Section accent */}
      <rect x={x + W - 4} y={y + 16} width={3.5} height={H - 32} rx={2} fill={secColor || col} opacity={0.55} />
      {/* Header */}
      <text x={x + W - PAD} y={HEADER_Y + 14} fill={T.txt}
        fontSize={16} fontWeight={800} fontFamily="'BahijTheSansArabic',sans-serif">{tp.label}</text>
      <rect x={x + PAD} y={HEADER_Y + 1} width={52} height={20} rx={6}
        fill={isDef ? 'rgba(184,92,78,0.08)' : 'rgba(0,122,83,0.08)'}
        stroke={isDef ? 'rgba(184,92,78,0.18)' : 'rgba(0,122,83,0.18)'} strokeWidth={0.7} />
      <text x={x + PAD + 26} y={HEADER_Y + 14.5} textAnchor="middle" fill={col}
        fontSize={9.5} fontWeight={800} fontFamily="'Cairo','BahijTheSansArabic',sans-serif">{isDef ? 'عجز' : 'فائض'}</text>
      {/* Gauge */}
      <SemiGaugeSVG cx={GAUGE_CX} cy={GAUGE_CY} r={GAUGE_R} pct={tp.pct} color={col}
        trackColor="rgba(65,64,66,0.06)" sw={15} showTicks />
      <text x={GAUGE_CX} y={GAUGE_CY - 8} textAnchor="middle" fill={col}
        fontSize={26} fontWeight={900} letterSpacing="-0.7" fontFamily="'Cairo','BahijTheSansArabic',sans-serif">{tp.pct}%</text>
      <text x={GAUGE_CX} y={GAUGE_CY + 10} textAnchor="middle" fill={T.txtSub}
        fontSize={8} fontWeight={600} fontFamily="'BahijTheSansArabic',sans-serif">نسبة التغطية</text>
      {/* Metrics divider */}
      <line x1={x + PAD} y1={METRICS_Y - 20} x2={x + W - PAD} y2={METRICS_Y - 20} stroke="rgba(65,64,66,0.07)" strokeWidth={0.7} />
      {/* Col 3 */}
      <text x={col3X + colW / 2} y={METRICS_Y + 6} textAnchor="middle" fill={T.txtSub} fontSize={10} fontWeight={600} fontFamily="'BahijTheSansArabic',sans-serif" >الطاقة الاستيعابية</text>
      <text x={col3X + colW / 2} y={METRICS_Y + 35} textAnchor="middle" fill={T.txt} fontSize={18} fontWeight={900} fontFamily="'Cairo',sans-serif">{fmtN(tp.supply)}</text>
      <line x1={col3X - 4} y1={METRICS_Y - 2} x2={col3X - 4} y2={METRICS_Y + 34} stroke="rgba(65,64,66,0.06)" strokeWidth={0.6} />
      {/* Col 1 */}
      <text x={col1X + colW / 2} y={METRICS_Y + 6} textAnchor="middle" fill={T.txtSub} fontSize={10} fontWeight={600} fontFamily="'BahijTheSansArabic',sans-serif">المستهدفات</text>
      <text x={col1X + colW / 2} y={METRICS_Y + 35} textAnchor="middle" fill={T.txt} fontSize={18} fontWeight={900} fontFamily="'Cairo',sans-serif">{fmtN(tp.demand)}</text>
      <line x1={col2X - 4} y1={METRICS_Y - 2} x2={col2X - 4} y2={METRICS_Y + 34} stroke="rgba(65,64,66,0.06)" strokeWidth={0.6} />
      {/* Col 2 */}
      <text x={col2X + colW / 2} y={METRICS_Y + 6} textAnchor="middle" fill={T.txtSub} fontSize={10} fontWeight={600} fontFamily="'BahijTheSansArabic',sans-serif">الفارق</text>
      <text x={col2X + colW / 2} y={METRICS_Y + 35} textAnchor="middle" fill={col} fontSize={18} fontWeight={900} fontFamily="'Cairo',sans-serif">
        {isDef ? '▼' : '▲'} {fmtN(Math.abs(tp.gap))}
      </text>
    </g>
  )
}

/* ═══ SIDE CHARTS LAYER ═══ */
function SideChartsLayer({ sectionId, yearlyData, highlightedId }) {
  const sec = SECTIONS.find(s => s.id === sectionId)
  if (!sec || !yearlyData) return null
  const tps = TOUCHPOINTS.filter(tp => tp.section === sectionId).map(tp => {
    const s = yearlyData.supply?.[tp.supKey] ?? 0
    const d = tp.demKey ? (yearlyData.demand?.[tp.demKey] ?? 0) : 0
    return { ...tp, supply: s, demand: d, gap: s - d, pct: d > 0 ? Math.min(Math.round((s / d) * 100), 200) : s > 0 ? 100 : 0 }
  })
  const MID = 500
  let leftTPs = tps.filter(tp => tp.x < MID)
  let rightTPs = tps.filter(tp => tp.x >= MID)
  if (!leftTPs.length || !rightTPs.length) {
    const sorted = [...tps].sort((a, b) => a.y - b.y)
    leftTPs = sorted.filter((_, i) => i % 2 === 0)
    rightTPs = sorted.filter((_, i) => i % 2 === 1)
  }
  leftTPs.sort((a, b) => a.y - b.y)
  rightTPs.sort((a, b) => a.y - b.y)

  const spaceCards = (list, side) => {
    const startY = CARD_PAD_TOP
    const use2Col = list.length > COL2_THRESHOLD

    if (!use2Col) {
      const baseX = side === 'left' ? L_CARD_X : R_CARD_X
      return list.map((tp, i) => ({ ...tp, cardX: baseX, cardY: startY + i * (CARD_H + CARD_GAP) }))
    }

    return list.map((tp, i) => {
      const row = Math.floor(i / 2)
      const col = i % 2
      const cardY = startY + row * (CARD_H + CARD_GAP)
      let cardX
      if (side === 'left') {
        cardX = col === 0
          ? -(2 * CARD_W + CARD_GAP + 40)
          : -(CARD_W + 40)
      } else {
        cardX = col === 0
          ? 1000 + 40
          : 1000 + 40 + CARD_W + CARD_GAP
      }
      return { ...tp, cardX, cardY }
    })
  }

  /* Tighter arrow curves */
  const arrowPath = (pin, cardX, cardY, side) => {
    const ex = side === 'left' ? cardX + CARD_W : cardX
    const ey = cardY + CARD_H / 2
    const dx = Math.abs(pin.x - ex)
    return side === 'left'
      ? `M ${pin.x} ${pin.y} C ${pin.x - dx * 0.18} ${pin.y}, ${ex + dx * 0.08} ${ey}, ${ex} ${ey}`
      : `M ${pin.x} ${pin.y} C ${pin.x + dx * 0.18} ${pin.y}, ${ex - dx * 0.08} ${ey}, ${ex} ${ey}`
  }

  const renderSide = (list, side) => list.map((tp, i) => {
    const delay = i * 0.06
    const ex = side === 'left' ? tp.cardX + CARD_W : tp.cardX
    const ey = tp.cardY + CARD_H / 2
    return (
      <g key={tp.id}>
        <path d={arrowPath(tp, tp.cardX, tp.cardY, side)} fill="none" stroke={sec.color} strokeWidth={1} opacity={0.35}
          className="exec-arrow-line" style={{ '--a-delay': `${delay}s` }} />
        <circle cx={ex} cy={ey} r={2.5} fill={sec.color} className="exec-arrow-dot" style={{ '--d-delay': `${delay + 0.4}s` }} />
        <circle cx={tp.x} cy={tp.y} r={9} fill="none" stroke={sec.color} strokeWidth={0.8}
          opacity={0} className="exec-pin-ring" style={{ '--r-delay': `${delay}s` }} />
        <SideCard x={tp.cardX} y={tp.cardY} tp={tp} secColor={sec.color} delay={delay} isHighlighted={highlightedId === tp.id} />
      </g>
    )
  })

  return (
    <g className="exec-side-charts">
      {renderSide(spaceCards(leftTPs, 'left'), 'left')}
      {renderSide(spaceCards(rightTPs, 'right'), 'right')}
    </g>
  )
}

/* ═══ Dynamic viewBox dimensions ═══ */
function computeSideWidth(sectionId) {
  if (!sectionId) return SIDE_W_1COL
  const tps = TOUCHPOINTS.filter(tp => tp.section === sectionId)
  const MID = 500
  let leftCount = tps.filter(tp => tp.x < MID).length
  let rightCount = tps.filter(tp => tp.x >= MID).length
  if (!leftCount || !rightCount) { leftCount = Math.ceil(tps.length / 2); rightCount = tps.length - leftCount }
  return (leftCount > COL2_THRESHOLD || rightCount > COL2_THRESHOLD) ? SIDE_W_2COL : SIDE_W_1COL
}

function computeViewBoxHeight(sectionId) {
  if (!sectionId) return MAP_BASE_H
  const tps = TOUCHPOINTS.filter(tp => tp.section === sectionId)
  const MID = 600
  let leftCount = tps.filter(tp => tp.x < MID).length
  let rightCount = tps.filter(tp => tp.x >= MID).length
  if (!leftCount || !rightCount) { leftCount = Math.ceil(tps.length / 2); rightCount = tps.length - leftCount }
  const leftRows = leftCount > COL2_THRESHOLD ? Math.ceil(leftCount / 2) : leftCount
  const rightRows = rightCount > COL2_THRESHOLD ? Math.ceil(rightCount / 2) : rightCount
  const maxRows = Math.max(leftRows, rightRows)
  return Math.max(MAP_BASE_H, CARD_PAD_TOP + maxRows * CARD_H + (maxRows - 1) * CARD_GAP + CARD_PAD_BOT)
}


/* ═══ MAP CANVAS ═══ */
function MapCanvas({ selected, onSelect, onDeselect, sectionFilter, yearlyData, highlightedId, svgRef }) {
  const [hovered, setHovered] = useState(null)
  const visible = useMemo(() =>
    sectionFilter ? TOUCHPOINTS.filter(tp => tp.section === sectionFilter) : TOUCHPOINTS, [sectionFilter])
  const getStats = useCallback(pin => {
    if (!yearlyData) return { s: 0, d: 0, gap: 0, status: 'neutral' }
    const s = yearlyData.supply?.[pin.supKey] ?? 0
    const d = pin.demKey ? (yearlyData.demand?.[pin.demKey] ?? 0) : 0
    return { s, d, gap: s - d, status: (s - d) >= 0 ? 'surplus' : 'deficit' }
  }, [yearlyData])
  const vbH = computeViewBoxHeight(sectionFilter)
  const sideW = computeSideWidth(sectionFilter)
  const vbX = -sideW
  const vbW = 1000 + sideW * 2

  const hoveredPin = hovered ? TOUCHPOINTS.find(t => t.id === hovered) : null
  const hoveredStats = hoveredPin ? getStats(hoveredPin) : null

  return (
    <svg ref={svgRef} viewBox={`${vbX} 0 ${vbW} ${vbH}`} className="exec-map-svg" onClick={onDeselect}>
      <defs>
        <radialGradient id="gMk" cx="351" cy="535" r="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={T.gold} stopOpacity="0.18" /><stop offset="100%" stopColor={T.gold} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gMd" cx="240" cy="399" r="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={T.gold} stopOpacity="0.14" /><stop offset="100%" stopColor={T.gold} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g style={{ fill: 'rgba(0,122,83,0.10)', stroke: 'rgb(0, 122, 83)', strokeWidth: 0.6 }}>
        {SA_MAP_PATHS.map(p => <path key={p.id} d={p.d} />)}
      </g>
      {sectionFilter && <SideChartsLayer key={sectionFilter} sectionId={sectionFilter} yearlyData={yearlyData} highlightedId={highlightedId} />}
      {visible.map(pin => {
        const { status } = getStats(pin)
        const isSelected = selected === pin.id, isHovered = hovered === pin.id
        const col = status === 'deficit' ? T.deficit : status === 'surplus' ? T.surplus : T.txtDim
        const r = isSelected ? 8 : isHovered ? 7 : 5
        return (
          <g key={pin.id} onClick={e => { e.stopPropagation(); onSelect(pin.id) }}
            onMouseEnter={() => setHovered(pin.id)} onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(pin.id)} onBlur={() => setHovered(null)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onSelect(pin.id) } }}
            tabIndex={0} role="button" aria-label={`${pin.label} — ${status === 'deficit' ? 'عجز' : 'فائض'}`}
            style={{ cursor: 'pointer', outline: 'none' }}>
            {status === 'deficit' && !isSelected && (
              <circle cx={pin.x} cy={pin.y} r={r + 5} fill="none" stroke={T.deficit} strokeWidth={1} opacity={0.35}>
                <animate attributeName="r" from={r + 2} to={r + 14} dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.35" to="0" dur="2.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={pin.x} cy={pin.y} r={r + 4} fill={col} opacity={isSelected ? 0.2 : isHovered ? 0.12 : 0.05} />
            <circle cx={pin.x} cy={pin.y} r={r} fill={col} stroke="#fff" strokeWidth={isSelected ? 2 : 1.2} />
            {isSelected && (
              <circle cx={pin.x} cy={pin.y} r={r + 7} fill="none" stroke={T.gold} strokeWidth={1.5}
                strokeDasharray="3 4" opacity={0.55}>
                <animateTransform attributeName="transform" type="rotate"
                  from={`0 ${pin.x} ${pin.y}`} to={`360 ${pin.x} ${pin.y}`} dur="10s" repeatCount="indefinite" />
              </circle>
            )}
            {/* ═══ Pin label ═══ */}
            <text x={pin.x} y={pin.y - (isSelected ? 14 : 10)} textAnchor="middle"
              fill={isHovered || isSelected ? T.txt : T.txtSub}
              fontSize={isHovered || isSelected ? 10 : 8.5}
              fontWeight={isHovered || isSelected ? 700 : 600}
              fontFamily="'BahijTheSansArabic',sans-serif"
              opacity={isHovered || isSelected ? 1 : 0.7}
              style={{ transition: 'font-size 0.2s, opacity 0.2s' }}>
              {pin.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ═══ KPI CARD — with animated values and empty state ═══ */
function AnimatedKpiValue({ value, color }) {
  const isNumeric = typeof value === 'number'
  const animated = useAnimatedNumber(isNumeric ? value : 0)
  return (
    <div className="exec-kpi-value" style={{ color }}>
      {isNumeric ? animated : value}
    </div>
  )
}

function KpiCard({ label, value, sub, color, indicator, emptyMsg }) {
  const isEmpty = value === '—' || value === 0 || value === '0'
  return (
    <div className="exec-kpi-card" style={{ borderTopColor: color }}>
      <div className="exec-kpi-header">
        <span className="exec-kpi-label">{label}</span>
        {indicator && (
          <span className="exec-kpi-indicator">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="4" fill="none" stroke={color} strokeWidth={0.8} opacity={0.3}>
                <animate attributeName="r" from="4" to="9" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.35" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="10" cy="10" r="3.5" fill={color} opacity={0.9} />
              <circle cx="10" cy="10" r="3.5" fill="none" stroke="#fff" strokeWidth={0.8} />
            </svg>
          </span>
        )}
      </div>
      {typeof value === 'number' ? (
        <AnimatedKpiValue value={value} color={color} />
      ) : (
        <div className="exec-kpi-value" style={{ color }}>{value}</div>
      )}
      {isEmpty && emptyMsg ? (
        <div className="exec-kpi-sub" style={{ color: T.txtDim, fontStyle: 'italic' }}>{emptyMsg}</div>
      ) : sub ? (
        <div className="exec-kpi-sub">{sub}</div>
      ) : null}
    </div>
  )
}

/* ═══ PAGE HEADER ═══ */
function ExecPageHeader({ yearLabel, sectionLabel }) {
  return (
    <div className="exec-page-header-hero">
      <div className="exec-page-header-inner">
        <div className="exec-page-header-top">
          <div className="exec-page-header-title-block">
            <h1 className="exec-page-header-h1">لوحة المؤشرات التنفيذية</h1>
            <p className="exec-page-header-subtitle">رؤية استراتيجية شاملة للطاقة الاستيعابية عبر جميع نقاط الاتصال لرحلة ضيوف الرحمن</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══ FILTER BAR ═══ */
function FilterBar({ yrs, toggleYr, selectAllYrs, isAllYrs, activeSection, onSection }) {
  return (
    <div className="exec-filter-bar">
      <div className="exec-filter-row">
        <span className="exec-filter-label">القسم</span>
        <div className="exec-filter-chips">
          <button className={`exec-f-chip sec${!activeSection ? ' active' : ''}`} onClick={() => onSection(null)}>الكل</button>
          {SECTIONS.map(sec => (
            <button key={sec.id}
              className={`exec-f-chip sec ${activeSection === null || activeSection === sec.id ? ' active' : ''}`}
              onClick={() => onSection(activeSection === sec.id ? null : sec.id)}
              style={{ '--chip-color': sec.color }}>{sec.label}</button>
          ))}
        </div>
      </div>
      <div className="exec-filter-row">
        <span className="exec-filter-label">السنة</span>
        <div className="exec-filter-chips">
          <button className={`exec-f-chip${isAllYrs ? ' active' : ''}`} onClick={selectAllYrs}>الكل</button>
          {YEARS.map(yr => (
            <button key={yr} className={`exec-f-chip${yrs.has(yr) ? ' active' : ''}`} onClick={() => toggleYr(yr)}>{yr}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══ MAIN DASHBOARD ═══ */
export default function ExecutiveDashboard() {
  const navigate = useNavigate()
  useEffect(() => { injectNavStyles() }, [])
  useEffect(() => {
    if (!document.getElementById('exec-tooltip-styles')) {
      const style = document.createElement('style')
      style.id = 'exec-tooltip-styles'
      style.textContent = `
        @keyframes tooltipFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .exec-map-svg g[tabindex="0"]:focus > circle { stroke-width: 2.5; }
        .exec-map-svg g[tabindex="0"]:focus { outline: none; }
      `
      document.head.appendChild(style)
    }
  }, [])

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const [yrs, setYrs] = useState(() => new Set(YEARS))
  const toggleYr = y => setYrs(prev => { const n = new Set(prev); if (n.has(y) && n.size > 1) n.delete(y); else n.add(y); return n })
  const selectAll = () => setYrs(new Set(YEARS))
  const isAll = YEARS.every(y => yrs.has(y))
  const [allYearly, setAllYearly] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sectionFilter, setSectionFilter] = useState(null)
  const [selectedPin, setSelectedPin] = useState(null)
  const [highlightedCard, setHighlightedCard] = useState(null)
  const highlightTimerRef = useRef(null)
  const svgRef = useRef(null)

  useEffect(() => {
    Promise.all([fetch('/executive-meta.json'), fetch('/executive-yearly.json')])
      .then(([m, y]) => { if (!m.ok || !y.ok) throw new Error('فشل تحميل البيانات'); return Promise.all([m.json(), y.json()]) })
      .then(([, yearly]) => setAllYearly(yearly))
      .catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const yearlyData = useMemo(() => {
    if (!allYearly) return null
    const sel = [...yrs]
    if (sel.length === 1) return allYearly[sel[0]] ?? null
    const c = { supply: {}, demand: {} }; let n = 0
    for (const yr of sel) { const yd = allYearly[yr]; if (!yd) continue; n++; for (const [k, v] of Object.entries(yd.supply ?? {})) c.supply[k] = (c.supply[k] ?? 0) + v; for (const [k, v] of Object.entries(yd.demand ?? {})) c.demand[k] = (c.demand[k] ?? 0) + v }
    if (n > 1) { for (const k of Object.keys(c.supply)) c.supply[k] = Math.round(c.supply[k] / n); for (const k of Object.keys(c.demand)) c.demand[k] = Math.round(c.demand[k] / n) }
    return c
  }, [allYearly, yrs])

  const yearLabel = useMemo(() => { const arr = [...yrs].sort(); return isAll ? 'كل السنوات' : arr.length === 1 ? String(arr[0]) : arr.join(' · ') }, [yrs, isAll])
  const activeSecLabel = useMemo(() => sectionFilter ? SECTIONS.find(s => s.id === sectionFilter)?.label ?? null : null, [sectionFilter])

  const kpis = useMemo(() => {
    if (!yearlyData) return null
    const pool = sectionFilter ? TOUCHPOINTS.filter(tp => tp.section === sectionFilter) : TOUCHPOINTS
    const stats = pool.map(tp => { const s = yearlyData.supply?.[tp.supKey] ?? 0; const d = tp.demKey ? (yearlyData.demand?.[tp.demKey] ?? 0) : 0; return { supply: s, demand: d, gap: s - d, label: tp.label } })
    const defCount = stats.filter(t => t.gap < 0).length
    const surCount = stats.filter(t => t.gap > 0).length
    const worst = stats.reduce((w, t) => t.gap < w.gap ? t : w, { gap: 0 })
    const totS = stats.reduce((s, t) => s + t.supply, 0)
    const totD = stats.reduce((s, t) => s + t.demand, 0)
    const covPct = totD > 0 ? Math.round((totS / totD) * 100) : 0
    return { defCount, surCount, worst, covPct, total: pool.length }
  }, [yearlyData, sectionFilter])

  /* ═══ Scroll to card ═══ */
  const scrollToCard = useCallback((pinId) => {
    requestAnimationFrame(() => {
      const svg = svgRef.current
      if (!svg) return
      const cardEl = svg.querySelector(`[data-card-id="${pinId}"]`)
      if (!cardEl) return
      const cardBBox = cardEl.getBBox()
      const svgRect = svg.getBoundingClientRect()
      const vb = svg.viewBox.baseVal
      const scaleY = svgRect.height / vb.height
      const cardCenterY = svgRect.top + window.scrollY + (cardBBox.y + cardBBox.height / 2 - vb.y) * scaleY
      window.scrollTo({ top: cardCenterY - window.innerHeight / 2, behavior: 'smooth' })
    })
  }, [])

  /* ═══ Smart pin selection ═══ */
  const handleSelectPin = useCallback(id => {
    const tp = TOUCHPOINTS.find(t => t.id === id)
    if (!tp) return
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    if (sectionFilter === tp.section) {
      setHighlightedCard(id)
      highlightTimerRef.current = setTimeout(() => setHighlightedCard(null), 1400)
      setTimeout(() => scrollToCard(id), 100)
    } else {
      setSectionFilter(tp.section)
      setTimeout(() => { setHighlightedCard(id); highlightTimerRef.current = setTimeout(() => setHighlightedCard(null), 1400); scrollToCard(id) }, 650)
    }
    setSelectedPin(prev => prev === id ? null : id)
  }, [sectionFilter, scrollToCard])

  const handleDeselect = useCallback(() => setSelectedPin(null), [])
  const handleSection = useCallback(id => { setSectionFilter(id); setSelectedPin(null); setHighlightedCard(null) }, [])
  useEffect(() => () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current) }, [])

  if (loading) return <div className="exec-loading"><div className="exec-spinner" /><div className="exec-loading-text">جاري تحميل البيانات التنفيذية...</div></div>
  if (error) return (
    <div className="exec-error cl-root">
      <Navbar scrolled={true} navigate={navigate} />
      <div style={{ paddingTop: 120, textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div><div style={{ fontSize: 16, fontWeight: 600, color: T.gold }}>{error}</div></div>
    </div>
  )

  return (
    <div className="exec-root cl-root" style={{ direction: 'rtl', background: '#fefefe', minHeight: '100vh', color: T.txt }}>
      <Navbar scrolled={scrolled} navigate={navigate} />
      <ExecPageHeader yearLabel={yearLabel} sectionLabel={activeSecLabel} />
      <div className="exec-content">
        <FilterBar yrs={yrs} toggleYr={toggleYr} selectAllYrs={selectAll} isAllYrs={isAll} activeSection={sectionFilter} onSection={handleSection} />
        {kpis && (
          <div className="exec-kpi-row">
            <KpiCard label="نقاط العجز" value={kpis.defCount} sub={`من ${kpis.total} نقطة`} color={T.deficit} indicator emptyMsg="لا يوجد عجز حالياً" />
            <KpiCard label="نقاط الفائض" value={kpis.surCount} sub={`من ${kpis.total} نقطة`} color={T.surplus} indicator emptyMsg="لا يوجد فائض حالياً" />
            <KpiCard label="أكبر عجز" value={kpis.worst?.gap < 0 ? fmtN(Math.abs(kpis.worst.gap)) : '—'} sub={kpis.worst?.gap < 0 ? kpis.worst.label : undefined} color={T.deficit} emptyMsg="جميع النقاط ضمن الطاقة" />
            <KpiCard label="نسبة التغطية" value={`${kpis.covPct}%`} sub="إجمالي طاقة / مستهدفات" color={T.gold} />
          </div>
        )}
      </div>
      <div className="exec-map-container">
        <MapCanvas selected={selectedPin} onSelect={handleSelectPin} onDeselect={handleDeselect}
          sectionFilter={sectionFilter} yearlyData={yearlyData} highlightedId={highlightedCard} svgRef={svgRef} />
      </div>
      <Footer navigate={navigate} />
    </div>
  )
}