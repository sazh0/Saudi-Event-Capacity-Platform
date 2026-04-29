/**
 * ExecutiveDashboard.jsx — Minister-Level Executive Overview
 * 4 Touchpoint Sections · Per-touchpoint donut charts · Multi-year · City filter · Navigate
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Navbar, Footer } from './SharedLayout'
import { PieChart, Pie, Cell } from 'recharts'
import {
  FiAlertTriangle, FiCheckCircle, FiUsers, FiArrowUpRight,
} from 'react-icons/fi'
import { MdBarChart } from 'react-icons/md'
import {
  FaPlane, FaMosque, FaCity, FaBolt, FaPassport, FaExchangeAlt,
  FaSyncAlt, FaRunning, FaHotel, FaWater, FaSatelliteDish, FaHospital,
} from 'react-icons/fa'
import { TOUCHPOINTS, SECTIONS, getSubsections } from './touchpoints.js'
import './ExecutiveDashboard.css'

/* ════════════════════════════════════════════════════════════════
   DESIGN TOKENS
════════════════════════════════════════════════════════════════ */
const T = {
  bg: '#fefefe', bgM: '#f4f2ee', bgL: '#ece8e1',
  border: 'rgba(65,64,66,0.10)',
  bronze: '#967126', bronzeL: '#b08432', bronzeXL: '#c9a048',
  green: '#007a53', greenL: '#009a65',
  sideHdr: '#2c2b2d', sideBg: '#414042',
  sup: '#007a53', supL: 'rgba(0,122,83,0.22)', supBg: 'rgba(0,122,83,0.08)',
  dem: '#967126', demL: 'rgba(150,113,38,0.24)', demBg: 'rgba(150,113,38,0.08)',
  deficit: '#b85c4e', deficitL: 'rgba(184,92,78,0.28)', deficitBg: 'rgba(184,92,78,0.08)',
  surplus: '#007a53', surplusL: 'rgba(0,122,83,0.22)', surplusBg: 'rgba(0,122,83,0.08)',
  txt: '#414042', txtSub: '#75787b', txtDim: 'rgba(65,64,66,0.45)',
  warn: '#967126', warnBg: 'rgba(150,113,38,0.08)', warnBdr: 'rgba(150,113,38,0.3)',
  blue: '#1e5fa8', blueBg: 'rgba(30,95,168,0.08)', blueL: 'rgba(30,95,168,0.22)',
  purple: '#6b4fa0',
  teal: '#008a87',
}

const YEARS = [2026, 2027, 2028, 2029, 2030]

const fmtN = n => {
  if (n == null || isNaN(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(a / 1_000_000).toFixed(1)}م`
  if (a >= 1_000) return `${Math.round(a / 1_000)}ألف`
  return Math.round(a).toLocaleString('en-US').replace(/,/g, '،')
}
const pct = (dem, sup) => sup > 0 ? Math.min(Math.round((dem / sup) * 100), 999) : 0
const isD = (sup, dem) => dem > sup
const sColor = u => u > 100 ? T.deficit : u > 85 ? T.warn : T.sup

/* ════════════════════════════════════════════════════════════════
   ICON MAP — resolves touchpoints.js string keys
════════════════════════════════════════════════════════════════ */
const ICON_MAP = {
  plane: FaPlane, mosque: FaMosque, city: FaCity, bolt: FaBolt,
  passport: FaPassport, bridge: FaExchangeAlt, rotate: FaSyncAlt,
  running: FaRunning, hotel: FaHotel, water: FaWater,
  satellite: FaSatelliteDish, hospital: FaHospital,
}
const TpIcon = ({ name, size = 16, color }) => {
  const Comp = ICON_MAP[name]
  return Comp ? <Comp size={size} color={color} /> : null
}

/* ════════════════════════════════════════════════════════════════
   TOUCHPOINT → DATA KEY MAP
   type: 'full' (supply+demand), 'demand' (demand only), 'coming' (no data)
════════════════════════════════════════════════════════════════ */
const TP_DATA = {
  // ── Airports (full) ──────────────────────────────────────────
  'apt-jed': { sKey: 'jeddahAirport', dKey: 'jeddahAirport', unit: 'مسافر/يوم', type: 'full' },
  'apt-med': { sKey: 'madinahAirport', dKey: 'madinahAirport', unit: 'مسافر/يوم', type: 'full' },
  'apt-tif': { sKey: 'taifAirport', dKey: 'taifAirport', unit: 'مسافر/يوم', type: 'full' },
  'apt-ynb': { sKey: 'yanbuAirport', dKey: 'yanbuAirport', unit: 'مسافر/يوم', type: 'full' },
  // ── Land borders (salwa has supply; rest demand-only) ─────────
  'brd-salwa': { sKey: 'salwa', dKey: 'salwa', unit: 'مسافر/يوم', type: 'full' },
  'brd-kfhd': { dKey: 'kingFahdCauseway', unit: 'مسافر/يوم', type: 'demand' },
  'brd-bathh': { dKey: 'alBatha', unit: 'مسافر/يوم', type: 'demand' },
  'brd-hadtha': { dKey: 'alHaditha', unit: 'مسافر/يوم', type: 'demand' },
  'brd-khdra': { dKey: 'alKhadra', unit: 'مسافر/يوم', type: 'demand' },
  'brd-khafji': { dKey: 'alKhafji', unit: 'مسافر/يوم', type: 'demand' },
  'brd-dorra': { dKey: 'alDurrah', unit: 'مسافر/يوم', type: 'demand' },
  'brd-rubk': { dKey: 'emptyQuarter', unit: 'مسافر/يوم', type: 'demand' },
  'brd-ruq': { dKey: 'alRuqi', unit: 'مسافر/يوم', type: 'demand' },
  'brd-wadia': { dKey: 'alWadiah', unit: 'مسافر/يوم', type: 'demand' },
  'brd-ararar': { dKey: 'jadidatArar', unit: 'مسافر/يوم', type: 'demand' },
  'brd-hamar': { dKey: 'halatAmmar', unit: 'مسافر/يوم', type: 'demand' },
  // ── Nusuk (full) ──────────────────────────────────────────────
  'mak-prayer': { sKey: 'makkahPrayer', dKey: 'makkahPrayer', unit: 'مصلٍّ/يوم', type: 'full' },
  'mak-mataf': { sKey: 'mataf', dKey: 'mataf', unit: 'طائف/يوم', type: 'full' },
  'mak-masaa': { sKey: 'masaa', dKey: 'masaa', unit: 'ساعٍ/يوم', type: 'full' },
  'med-prayer': { sKey: 'madinahPrayer', dKey: 'madinahPrayer', unit: 'مصلٍّ/يوم', type: 'full' },
  // ── Accommodation (full) ──────────────────────────────────────
  'mak-housing': { sKey: 'makkahAccommodation', dKey: 'makkahAccommodation', unit: 'سرير/يوم', type: 'full' },
  'med-housing': { sKey: 'madinahAccommodation', dKey: 'madinahAccommodation', unit: 'سرير/يوم', type: 'full' },
  // ── Water (full) ─────────────────────────────────────────────
  'mak-water': { sKey: 'makkahWater', dKey: 'makkahWater', unit: 'م³/يوم', type: 'full' },
  'med-water': { sKey: 'madinahWater', dKey: 'madinahWater', unit: 'م³/يوم', type: 'full' },
  // ── Power (full) ─────────────────────────────────────────────
  'mak-power': { sKey: 'makkahEnergy', dKey: 'makkahEnergy', unit: 'كيلوواط/يوم', type: 'full' },
  'med-power': { sKey: 'madinahEnergy', dKey: 'madinahEnergy', unit: 'كيلوواط/يوم', type: 'full' },
  // ── Telecom (full) ───────────────────────────────────────────
  'mak-telecom': { sKey: 'makkahTelecom', dKey: 'makkahTelecom', unit: 'مشترك/يوم', type: 'full' },
  'med-telecom': { sKey: 'madinahTelecom', dKey: 'madinahTelecom', unit: 'مشترك/يوم', type: 'full' },
  // ── Health (no data yet) ─────────────────────────────────────
  'mak-health': { unit: 'حالة/يوم', type: 'coming' },
  'med-health': { unit: 'حالة/يوم', type: 'coming' },
}

/* ════════════════════════════════════════════════════════════════
   SAMPLE DATA
════════════════════════════════════════════════════════════════ */
const buildSample = () => {
  const g = (base, rate, yr) => Math.round(base * Math.pow(1 + rate, yr - 2026))
  const data = {}
  for (const yr of YEARS) {
    data[yr] = {
      supply: {
        jeddahAirport: g(82_000, 0.04, yr), makkahAccommodation: g(540_000, 0.05, yr),
        madinahAccommodation: g(185_000, 0.045, yr), masaa: 3_577_520, mataf: 1_930_000,
        makkahPrayer: g(2_200_000, 0.02, yr), madinahPrayer: g(1_600_000, 0.02, yr),
        madinahAirport: g(26_000, 0.04, yr), taifAirport: g(9_500, 0.05, yr),
        yanbuAirport: g(6_200, 0.04, yr), makkahWater: g(3_800_000, 0.03, yr),
        madinahWater: g(2_200_000, 0.03, yr), makkahEnergy: g(3_200_000, 0.03, yr),
        madinahEnergy: g(1_900_000, 0.03, yr), makkahTelecom: g(3_800_000, 0.04, yr),
        madinahTelecom: g(2_200_000, 0.04, yr), salwa: g(16_000, 0.06, yr),
      },
      demand: {
        makkahAccommodation: g(462_000, 0.065, yr), madinahAccommodation: g(158_000, 0.06, yr),
        makkahPrayer: g(1_820_000, 0.065, yr), madinahPrayer: g(1_310_000, 0.06, yr),
        masaa: g(1_250_000, 0.07, yr), mataf: g(920_000, 0.07, yr),
        jeddahAirport: g(66_500, 0.065, yr), madinahAirport: g(21_000, 0.06, yr),
        taifAirport: g(5_800, 0.075, yr), yanbuAirport: g(3_600, 0.065, yr),
        makkahWater: g(2_950_000, 0.065, yr), madinahWater: g(1_760_000, 0.06, yr),
        makkahEnergy: g(2_580_000, 0.065, yr), madinahEnergy: g(1_490_000, 0.06, yr),
        makkahTelecom: g(2_950_000, 0.065, yr), madinahTelecom: g(1_760_000, 0.06, yr),
        kingFahdCauseway: g(41_000, 0.05, yr), salwa: g(8_200, 0.06, yr),
        alBatha: g(40_500, 0.05, yr), alHaditha: g(3_100, 0.04, yr),
        alKhadra: g(40_800, 0.05, yr), alKhafji: g(15_500, 0.04, yr),
        alDurrah: g(1_350, 0.03, yr), emptyQuarter: g(950, 0.02, yr),
        alRuqi: g(7_200, 0.04, yr), alWadiah: g(1_600, 0.04, yr),
        jadidatArar: g(28, 0.04, yr), halatAmmar: g(480, 0.04, yr),
      },
    }
  }
  return { yearly: data }
}
const SAMPLE_DATA = buildSample()

/* ════════════════════════════════════════════════════════════════
   PORTAL TOOLTIP
════════════════════════════════════════════════════════════════ */
const TT = ({ children, minW = 160 }) => {
  const [pos, setPos] = useState({ x: -9999, y: -9999 })
  const ref = useRef(null)
  useEffect(() => {
    const GAP = 14, EDGE = 8
    const onMove = e => {
      const node = ref.current
      const w = node ? node.offsetWidth : 280, h = node ? node.offsetHeight : 0
      const vw = window.innerWidth, vh = window.innerHeight
      let x = e.clientX + GAP, y = e.clientY + GAP
      if (h > 0 && y + h + EDGE > vh) y = e.clientY - h - GAP
      if (x + w + EDGE > vw) x = e.clientX - w - GAP
      if (x < EDGE) x = EDGE; if (y < EDGE) y = EDGE
      setPos({ x, y })
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    return () => document.removeEventListener('mousemove', onMove)
  }, [])
  return createPortal(
    <div ref={ref} style={{
      position: 'fixed', left: pos.x, top: pos.y, background: '#fff',
      border: '1px solid rgba(65,64,66,0.14)', borderRadius: 12, color: T.txt,
      fontSize: 12, boxShadow: '0 8px 32px rgba(65,64,66,0.18)',
      padding: '12px 15px', minWidth: minW, maxWidth: 'min(calc(100vw - 24px), 320px)',
      zIndex: 99999, pointerEvents: 'none',
      fontFamily: "'BahijTheSansArabic','Segoe UI',sans-serif",
    }}>{children}</div>, document.body
  )
}

const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bgM, gap: 16 }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${T.supL}`, borderTopColor: T.sup, animation: 'spin 0.9s linear infinite' }} />
    <p style={{ color: T.txtSub, fontSize: 13 }}>جارٍ تحميل البيانات التنفيذية…</p>
  </div>
)

/* ════════════════════════════════════════════════════════════════
   SMALL SHARED COMPONENTS
════════════════════════════════════════════════════════════════ */
const StatusPill = ({ sup, dem, compact }) => {
  const deficit = isD(sup, dem), u = pct(dem, sup)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: compact ? '2px 7px' : '4px 11px', borderRadius: 20,
      fontSize: compact ? 9 : 10, fontWeight: 800, whiteSpace: 'nowrap',
      background: deficit ? T.deficitBg : T.surplusBg,
      color: deficit ? T.deficit : T.surplus,
      border: `1px solid ${deficit ? T.deficitL : T.surplusL}`,
    }}>
      {deficit ? <FiAlertTriangle size={8} /> : <FiCheckCircle size={8} />}
      {u}%{!compact && (deficit ? ' عجز' : ' تغطية')}
    </span>
  )
}

const SectionHead = ({ icon, title, sub, accent }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    <div style={{ width: 3, height: 24, borderRadius: 3, background: accent, flexShrink: 0 }} />
    <div style={{
      width: 34, height: 34, borderRadius: 10, background: `${accent}14`,
      border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: accent, flexShrink: 0,
    }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13.5, fontWeight: 900, color: T.txt, lineHeight: 1.2 }}>{title}</div>
      {sub && <div style={{ fontSize: 10.5, color: T.txtSub, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
)

const KpiCard = ({ label, value, sub, color, icon, delay = 0 }) => (
  <div
    className="card exec-kpi-card fade-up"
    style={{ borderTop: `3px solid ${color}`, animationDelay: `${delay}ms` }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 20px 50px rgba(65,64,66,0.13),0 0 0 1px ${color}22` }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: T.txtSub, lineHeight: 1.5, flex: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
    </div>
    <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: T.txtDim, marginTop: 7, lineHeight: 1.6 }}>{sub}</div>}
  </div>
)

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <TT minW={200}>
      <div style={{ fontWeight: 800, fontSize: 13, color: T.txt, marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: p.color, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block', flexShrink: 0 }} />{p.name}
          </span>
          <strong style={{ fontSize: 11.5, color: p.color }}>{fmtN(p.value)}{p.unit || ''}</strong>
        </div>
      ))}
    </TT>
  )
}

const FilterPill = ({ label, active, onClick, color }) => (
  <button onClick={onClick} style={{
    padding: '5px 16px', borderRadius: 22, fontSize: 11, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${active ? (color || T.bronze) + '70' : 'rgba(65,64,66,0.14)'}`,
    background: active ? (color || T.bronze) + '14' : 'transparent',
    color: active ? (color || T.bronze) : T.txtSub,
    transition: 'all .18s',
  }}>{label}</button>
)

/* ════════════════════════════════════════════════════════════════
   TOUCHPOINT CARD — full (donut + supply/demand)
════════════════════════════════════════════════════════════════ */
const TpFullCard = ({ tp, sup, dem, secAccent, onNavigate }) => {
  const data = TP_DATA[tp.id]
  if (!data) return null
  const u = pct(dem, sup), deficit = isD(sup, dem)
  const ac = deficit ? T.deficit : u > 85 ? T.warn : sColor(u)
  const safeU = Math.min(u, 100)

  return (
    <div
      className="card exec-tp-card"
      style={{ borderTop: `2px solid ${ac}`, position: 'relative' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 14px 36px rgba(65,64,66,0.13),0 0 0 1px ${ac}22` }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      {/* Navigate button */}
      <button
        onClick={onNavigate}
        title="عرض اللوحة التفصيلية"
        style={{
          position: 'absolute', top: 8, left: 8, zIndex: 2,
          width: 26, height: 26, borderRadius: 7, border: `1px solid ${secAccent}35`,
          background: `${secAccent}12`, color: secAccent, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${secAccent}28`; e.currentTarget.style.borderColor = `${secAccent}60` }}
        onMouseLeave={e => { e.currentTarget.style.background = `${secAccent}12`; e.currentTarget.style.borderColor = `${secAccent}35` }}
      >
        <FiArrowUpRight size={12} />
      </button>

      {/* Donut — exactly centered using matching container + cx/cy */}
      <div style={{ position: 'relative', width: 130, height: 130, margin: '6px auto 0', flexShrink: 0 }}>
        <PieChart width={130} height={130}>
          <Pie
            data={[{ v: safeU }, { v: 100 - safeU }]} dataKey="v"
            cx={65} cy={65} innerRadius={42} outerRadius={58}
            stroke="none" startAngle={90} endAngle={-270}
            cornerRadius={9} paddingAngle={safeU > 0 && safeU < 100 ? 3 : 0}
          >
            <Cell fill={ac} />
            <Cell fill="rgba(65,64,66,0.07)" />
          </Pie>
        </PieChart>
        {/* Overlay exactly matches the 130×130 container */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ marginLeft: 6, marginTop: 4 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: ac, lineHeight: 1 }}>{u}%</div>
            <div style={{ fontSize: 8, color: T.txtDim, marginTop: 2 }}>استخدام</div>
          </div>
        </div>
      </div>

      {/* Name + unit */}
      <div style={{ textAlign: 'center', padding: '8px 10px 0' }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: T.txt, lineHeight: 1.35, marginBottom: 5 }}>{tp.title}</div>
        <div style={{ fontSize: 9, color: T.txtDim, marginBottom: 8 }}>{data.unit}</div>
      </div>

      {/* Supply / Demand stats */}
      <div style={{ display: 'flex', borderTop: `1px solid ${T.border}` }}>
        <div style={{ flex: 1, padding: '8px 10px', textAlign: 'center', borderLeft: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 8, color: T.txtDim, marginBottom: 2 }}>الطاقة</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: T.sup, lineHeight: 1 }}>{fmtN(sup)}</div>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: T.txtDim, marginBottom: 2 }}>الطلب</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: T.dem, lineHeight: 1 }}>{fmtN(dem)}</div>
        </div>
      </div>

      {/* Status pill */}
      <div style={{ padding: '8px 10px 11px', display: 'flex', justifyContent: 'center' }}>
        <StatusPill sup={sup} dem={dem} compact />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   TOUCHPOINT CARD — demand only (borders without capacity cap)
════════════════════════════════════════════════════════════════ */
const TpDemandCard = ({ tp, dem, secAccent, onNavigate }) => {
  const data = TP_DATA[tp.id]
  if (!data) return null
  const maxFlow = 50_000 // reference line for visual bar
  const barW = dem > 0 ? Math.min(Math.round((dem / maxFlow) * 100), 100) : 0

  return (
    <div
      className="card exec-tp-card exec-tp-demand"
      style={{ borderTop: `2px solid ${secAccent}`, position: 'relative' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 14px 36px rgba(65,64,66,0.12),0 0 0 1px ${secAccent}22` }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      {/* Navigate button */}
      <button
        onClick={onNavigate}
        title="عرض اللوحة التفصيلية"
        style={{
          position: 'absolute', top: 8, left: 8, zIndex: 2,
          width: 26, height: 26, borderRadius: 7, border: `1px solid ${secAccent}35`,
          background: `${secAccent}12`, color: secAccent, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${secAccent}28`; e.currentTarget.style.borderColor = `${secAccent}60` }}
        onMouseLeave={e => { e.currentTarget.style.background = `${secAccent}12`; e.currentTarget.style.borderColor = `${secAccent}35` }}
      >
        <FiArrowUpRight size={12} />
      </button>

      {/* Icon */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 22, paddingBottom: 6 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: `${secAccent}10`, border: `1px solid ${secAccent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TpIcon name={tp.icon} size={20} color={secAccent} />
        </div>
      </div>

      {/* Name + unit */}
      <div style={{ textAlign: 'center', padding: '4px 10px 8px' }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: T.txt, lineHeight: 1.35, marginBottom: 5 }}>{tp.title}</div>
        {/* Demand number */}
        <div style={{ background: T.demBg, border: `1px solid ${T.demL}`, borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
          <div style={{ fontSize: 8, color: T.dem, fontWeight: 700, marginBottom: 2 }}>معدل التدفق اليومي</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.dem, lineHeight: 1 }}>{fmtN(dem)}</div>
          <div style={{ fontSize: 8, color: T.txtDim, marginTop: 1 }}>{data.unit}</div>
        </div>
        {/* Mini flow bar */}
        <div style={{ height: 4, borderRadius: 4, background: 'rgba(65,64,66,0.08)', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${barW}%`, background: `linear-gradient(to left, ${secAccent}, ${secAccent}88)`, borderRadius: 4, transition: 'width .8s ease' }} />
        </div>
        <div style={{ fontSize: 8, color: T.txtDim }}>طلب مُسجَّل — لا يوجد سقف طاقة</div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   TOUCHPOINT CARD — coming soon (no data)
════════════════════════════════════════════════════════════════ */
const TpComingCard = ({ tp, secAccent, onNavigate }) => (
  <div
    className="card exec-tp-card exec-tp-coming"
    style={{ borderTop: `2px solid rgba(65,64,66,0.12)`, position: 'relative', opacity: 0.65 }}
  >
    <button
      onClick={onNavigate}
      title="عرض اللوحة التفصيلية"
      style={{
        position: 'absolute', top: 8, left: 8, zIndex: 2,
        width: 26, height: 26, borderRadius: 7, border: `1px solid rgba(65,64,66,0.15)`,
        background: 'rgba(65,64,66,0.06)', color: T.txtDim, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <FiArrowUpRight size={12} />
    </button>
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 22, paddingBottom: 6 }}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(65,64,66,0.06)', border: '1px solid rgba(65,64,66,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TpIcon name={tp.icon} size={20} color={T.txtDim} />
      </div>
    </div>
    <div style={{ textAlign: 'center', padding: '4px 10px 14px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: T.txtSub, marginBottom: 10, lineHeight: 1.35 }}>{tp.title}</div>
      <div style={{ padding: '8px 10px', background: 'rgba(65,64,66,0.04)', borderRadius: 8, border: '1px solid rgba(65,64,66,0.08)' }}>
        <div style={{ fontSize: 9, color: T.txtDim, lineHeight: 1.6 }}>البيانات قريباً</div>
      </div>
    </div>
  </div>
)

/* ════════════════════════════════════════════════════════════════
   SUBSECTION ROW — label + card grid (flex when ≤4, grid otherwise)
════════════════════════════════════════════════════════════════ */
function SubsecRow({ label, count, tps, secAccent, supply, demand, navigate, isSmall }) {
  return (
    <div className="exec-subsec-row">
      {/* Subsection label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: secAccent, display: 'inline-block', opacity: 0.7 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>{label}</span>
        <span style={{ fontSize: 10, color: T.txtDim, background: 'rgba(65,64,66,0.06)', borderRadius: 10, padding: '1px 8px' }}>{count} نقاط</span>
      </div>

      {/* Cards — flex row (fixed width) when small, auto-fill grid when large */}
      <div className={isSmall ? undefined : 'exec-tp-grid'} style={isSmall ? { display: 'flex', flexWrap: 'wrap', gap: 12 } : undefined}>
        {tps.map(tp => {
          const data = TP_DATA[tp.id]
          const sup = data?.sKey ? supply[data.sKey] : 0
          const dem = data?.dKey ? demand[data.dKey] : 0
          const onNavigate = () => navigate(tp.route)
          // In small mode wrap each card in a fixed-width div so they don't stretch
          const cardEl = (!data || data.type === 'coming')
            ? <TpComingCard key={tp.id} tp={tp} secAccent={secAccent} onNavigate={onNavigate} />
            : data.type === 'demand'
              ? <TpDemandCard key={tp.id} tp={tp} dem={dem} secAccent={secAccent} onNavigate={onNavigate} />
              : <TpFullCard key={tp.id} tp={tp} sup={sup} dem={dem} secAccent={secAccent} onNavigate={onNavigate} />
          return isSmall
            ? <div key={tp.id} style={{ width: 190, flexShrink: 0 }}>{cardEl}</div>
            : cardEl
        })}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   SECTION PANEL — collapsible, all open by default
════════════════════════════════════════════════════════════════ */
function SectionPanel({ section, tps, supply, demand, navigate }) {
  const [open, setOpen] = useState(true)
  const subsections = getSubsections(section.id)
  if (tps.length === 0) return null

  // If ALL visible subsections have ≤4 cards → lay them side by side
  const activeSubsections = subsections.filter(sub => tps.filter(t => t.subsection === sub).length > 0)
  const allSubsSmall = activeSubsections.length > 1 && activeSubsections.every(sub => tps.filter(t => t.subsection === sub).length <= 4)

  return (
    <div
      className="card exec-section-panel"
      style={{ borderRight: `3px solid ${section.accent}`, padding: 0, overflow: 'hidden' }}
    >
      {/* Header */}
      <button
        className="exec-section-header"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', background: `${section.accent}08`,
          borderBottom: open ? `1px solid ${section.accent}18` : 'none',
          cursor: 'pointer', border: 'none', textAlign: 'right', fontFamily: 'inherit',
          transition: 'background .18s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = `${section.accent}12`}
        onMouseLeave={e => e.currentTarget.style.background = `${section.accent}08`}
      >
        <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: `${section.accent}15`, border: `1.5px solid ${section.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TpIcon name={section.icon} size={18} color={section.accent} />
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: T.txt, lineHeight: 1.2 }}>{section.title}</div>
          <div style={{ fontSize: 10.5, color: T.txtSub, marginTop: 2 }}>{section.desc}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: `${section.accent}15`, color: section.accent, border: `1px solid ${section.accent}30` }}>{tps.length} نقطة</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform .25s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: T.txtDim }}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div style={allSubsSmall
          ? { padding: '20px 20px 8px', display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }
          : { padding: '20px 20px 8px' }
        }>
          {activeSubsections.map(sub => {
            const subTps = tps.filter(t => t.subsection === sub)
            return (
              <SubsecRow
                key={sub}
                label={sub}
                count={subTps.length}
                tps={subTps}
                secAccent={section.accent}
                supply={supply}
                demand={demand}
                navigate={navigate}
                isSmall={allSubsSmall}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD INNER
════════════════════════════════════════════════════════════════ */
function DashboardInner({ db }) {
  const navigate = useNavigate()

  /* ── Multi-year selector ──────────────────────────────────── */
  const [selectedYears, setSelectedYears] = useState([...YEARS])
  const allSelected = selectedYears.length === YEARS.length
  const toggleYear = y => {
    setSelectedYears(prev => {
      if (prev.includes(y)) { if (prev.length === 1) return prev; return [...YEARS].filter(yr => prev.includes(yr) && yr !== y) }
      return [...YEARS].filter(yr => prev.includes(yr) || yr === y)
    })
  }
  const toggleAll = () => setSelectedYears(allSelected ? [YEARS[0]] : [...YEARS])

  /* ── City filter ──────────────────────────────────────────── */
  const [cityFilter, setCityFilter] = useState('all')

  /* ── Aggregated data (average across selected years) ─────── */
  const yrData = useMemo(() => {
    const supply = {}, demand = {}
    const n = selectedYears.length
    for (const y of selectedYears) {
      const yd = db.yearly?.[y] || db.yearly?.[String(y)] || {}
      for (const [k, v] of Object.entries(yd.supply || {})) supply[k] = (supply[k] || 0) + v / n
      for (const [k, v] of Object.entries(yd.demand || {})) demand[k] = (demand[k] || 0) + v / n
    }
    for (const k of Object.keys(supply)) supply[k] = Math.round(supply[k])
    for (const k of Object.keys(demand)) demand[k] = Math.round(demand[k])
    return { supply, demand }
  }, [db, selectedYears])

  const s = yrData.supply, d = yrData.demand

  /* ── KPIs ─────────────────────────────────────────────────── */
  const SECT_KEYS = ['makkahAccommodation', 'madinahAccommodation', 'makkahPrayer', 'madinahPrayer', 'masaa', 'mataf', 'jeddahAirport', 'madinahAirport', 'makkahWater', 'madinahWater', 'makkahTelecom', 'madinahTelecom']
  const LABELS = { makkahAccommodation: 'إيواء مكة', madinahAccommodation: 'إيواء المدينة', makkahPrayer: 'صلاة الحرم المكي', madinahPrayer: 'صلاة الحرم النبوي', masaa: 'المسعى', mataf: 'المطاف', jeddahAirport: 'مطار جدة', madinahAirport: 'مطار المدينة', makkahWater: 'مياه مكة', madinahWater: 'مياه المدينة', makkahTelecom: 'اتصالات مكة', madinahTelecom: 'اتصالات المدينة' }
  const kpi = useMemo(() => {
    let deficitCount = 0, warningCount = 0, highestKey = '', highestU = 0, ts = 0, td = 0
    for (const k of SECT_KEYS) {
      if (s[k] > 0) {
        ts += s[k]; td += d[k] || 0
        const u = s[k] > 0 ? Math.round(((d[k] || 0) / s[k]) * 100) : 0
        if (d[k] > s[k]) deficitCount++
        else if (u > 85) warningCount++
        const uRaw = (d[k] || 0) / s[k]
        if (uRaw > highestU) { highestU = uRaw; highestKey = LABELS[k] }
      }
    }
    const coveragePct = ts > 0 ? Math.round(td / ts * 100) : 0
    // Religious services average: prayer + mataf + masaa (makkah + madinah)
    const relKeys = ['makkahPrayer', 'madinahPrayer', 'mataf', 'masaa']
    const relPcts = relKeys.filter(k => s[k] > 0).map(k => pct(d[k] || 0, s[k]))
    const religiousCoverage = relPcts.length > 0 ? Math.round(relPcts.reduce((a, b) => a + b, 0) / relPcts.length) : 0
    return { coveragePct, deficitCount, warningCount, highestKey, highestU: Math.round(highestU * 100), religiousCoverage }
  }, [yrData, s, d])

  /* ── Filtered touchpoints ─────────────────────────────────── */
  const filteredTps = useMemo(() => {
    if (cityFilter === 'makkah') return TOUCHPOINTS.filter(t => t.city === 'مكة')
    if (cityFilter === 'madinah') return TOUCHPOINTS.filter(t => t.city === 'المدينة')
    return TOUCHPOINTS
  }, [cityFilter])

  const yearLabel = allSelected ? '2026 — 2030' : selectedYears.length === 1 ? String(selectedYears[0]) : `${selectedYears[0]} — ${selectedYears[selectedYears.length - 1]}`

  return (
    <div style={{ minHeight: '100vh', background: T.bgM, direction: 'rtl', fontFamily: "'BahijTheSansArabic','Cairo',sans-serif" }}>
      <Navbar navigate={navigate} />

      {/* ══ PAGE HEADER ══════════════════════════════════════════ */}
      <div className="page-header-hero" style={{ background: T.bg }}>
        <div className="page-header-bg-image" style={{ backgroundImage: "url('/Executive_BG.png')" }} />
        <div className="page-header-inner">
          <div className="page-header-eyebrow">
            <div className="page-header-eyebrow-badge">
              <MdBarChart size={12} style={{ flexShrink: 0 }} />
              منظومة رصد الطاقة الاستيعابية الوطنية
            </div>
            <div className="page-header-eyebrow-sep" />
            <span className="page-header-eyebrow-label">لوحة الرصد التنفيذي الشاملة</span>
          </div>
          <div className="page-header-top">
            <div className="page-header-title-block">
              <div className="page-header-icon"><MdBarChart size={22} color={T.bronze} /></div>
              <h1 className="page-header-h1">لوحة الرصد التنفيذي الشاملة</h1>
              <p className="page-header-subtitle">نظرة استراتيجية موحدة — الديني · الإيواء · الخدمات · المطارات</p>
            </div>
          </div>
          <div className="page-header-chips">
            <div className="ph-chip">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke={T.bronzeXL} strokeWidth="1.2" /><path d="M4 1.5v2M8 1.5v2M1.5 5.5h9" stroke={T.bronzeXL} strokeWidth="1.2" strokeLinecap="round" /></svg>
              <span className="ph-chip-label">الفترة المُختارة</span>
              <span className="ph-chip-value" style={{ color: T.bronzeXL }}>{yearLabel}</span>
            </div>
            <div className="ph-chip">
              {kpi.deficitCount > 0 ? <FiAlertTriangle size={11} color={T.deficit} /> : <FiCheckCircle size={11} color={T.surplus} />}
              <span className="ph-chip-label">التغطية الكلية</span>
              <span className="ph-chip-value" style={{ color: sColor(kpi.coveragePct) }}>{kpi.coveragePct}%</span>
            </div>
            <div className="ph-chip">
              <MdBarChart size={11} color={T.bronzeXL} />
              <span className="ph-chip-label">نقاط الاتصال</span>
              <span className="ph-chip-value" style={{ color: T.bronzeXL }}>{TOUCHPOINTS.length} نقطة</span>
            </div>
            <div className="ph-chip">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.8" stroke={T.bronzeXL} strokeWidth="1.3" /><path d="M7 4v3.2l2 1.2" stroke={T.bronzeXL} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="ph-chip-label">السنوات المُحددة</span>
              <span className="ph-chip-value" style={{ color: T.bronzeXL }}>{selectedYears.length} من 5</span>
            </div>
          </div>
          {/* Multi-year toggle */}
          <div className="page-header-filters">
            <div className="ph-filter-group">
              <span className="ph-filter-label">السنوات</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={toggleAll} className={`ph-year-chip${allSelected ? ' active' : ''}`}
                  style={allSelected ? { background: `${T.green}18`, borderColor: `${T.green}60`, color: T.green } : {}}>الكل</button>
                {YEARS.map(y => (
                  <button key={y} onClick={() => toggleYear(y)} className={`ph-year-chip${selectedYears.includes(y) ? ' active' : ''}`}>{y}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 10, color: T.txtDim, marginTop: 6, paddingRight: 4 }}>
              اختر سنة واحدة أو أكثر — القيم تُحسب كمتوسط للسنوات المُحددة
            </div>
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════ */}
      <div className="exec-content">

        {/* ── 1. KPI HERO STRIP ──────────────────────────────── */}
        <div className="exec-kpi-grid">
          <KpiCard label="نسبة التغطية الكلية" value={`${kpi.coveragePct}%`} sub={`متوسط ${SECT_KEYS.length} قطاعًا رئيسيًا · ${yearLabel}`} color={sColor(kpi.coveragePct)} icon={<FiCheckCircle size={17} />} delay={0} />
          <KpiCard label="قطاعات في عجز" value={kpi.deficitCount > 0 ? kpi.deficitCount : '✓'} sub={kpi.deficitCount > 0 ? `${kpi.deficitCount} قطاع يتجاوز طاقته الاستيعابية` : 'جميع القطاعات ضمن الطاقة'} color={kpi.deficitCount > 0 ? T.deficit : T.sup} icon={<FiAlertTriangle size={17} />} delay={60} />
          <KpiCard label="قطاعات في تحذير" value={kpi.warningCount > 0 ? kpi.warningCount : '—'} sub={kpi.warningCount > 0 ? `${kpi.warningCount} قطاع في نطاق 85–100%` : 'لا قطاعات في منطقة التحذير'} color={kpi.warningCount > 0 ? T.warn : T.txtSub} icon={<FiAlertTriangle size={17} />} delay={120} />
          <KpiCard label="متوسط تغطية الخدمات الدينية" value={`${kpi.religiousCoverage}%`} sub="الصلاة · المطاف · المسعى — مكة والمدينة" color={sColor(kpi.religiousCoverage)} icon={<FaCity size={17} />} delay={180} />
          <KpiCard label="أعلى قطاع ضغطًا" value={`${kpi.highestU}%`} sub={kpi.highestKey} color={sColor(kpi.highestU)} icon={<FiUsers size={17} />} delay={240} />
        </div>

        {/* ── 2. CITY FILTER + TOUCHPOINT SECTIONS ───────────── */}
        <div>
          {/* City filter bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            background: T.bg, borderRadius: 14, padding: '10px 16px',
            border: `1px solid ${T.border}`, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.txtSub, flexShrink: 0 }}>عرض نقاط الاتصال:</span>
            <FilterPill label="الكل" active={cityFilter === 'all'} onClick={() => setCityFilter('all')} color={T.bronze} />
            <FilterPill label="مكة المكرمة" active={cityFilter === 'makkah'} onClick={() => setCityFilter('makkah')} color='#A78BFA' />
            <FilterPill label="المدينة المنورة" active={cityFilter === 'madinah'} onClick={() => setCityFilter('madinah')} color='#34D399' />
            <span style={{ marginRight: 'auto', fontSize: 10, color: T.txtDim }}>
              {filteredTps.length} نقطة اتصال · اضغط ↗ على أي بطاقة للانتقال إلى لوحتها
            </span>
          </div>

          {/* 4 section panels */}
          <div className="exec-sections-stack">
            {SECTIONS.map(sec => (
              <SectionPanel
                key={sec.id}
                section={sec}
                tps={filteredTps.filter(t => t.section === sec.id)}
                supply={s}
                demand={d}
                navigate={navigate}
              />
            ))}
          </div>
        </div>


      </div>

      <Footer navigate={navigate} />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════ */
export default function ExecutiveDashboard() {
  const [db, setDb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usingSample, setUsingSample] = useState(false)

  useEffect(() => {
    fetch('/executive.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setDb(data))
      .catch(() => { setDb(SAMPLE_DATA); setUsingSample(true) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <>
      {usingSample && createPortal(
        <div style={{
          position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)',
          background: T.warnBg, border: `1px solid ${T.warnBdr}`, borderRadius: 12,
          padding: '9px 22px', fontSize: 11, color: T.warn, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 6px 24px rgba(65,64,66,0.16)',
          fontFamily: "'BahijTheSansArabic','Segoe UI',sans-serif",
          direction: 'rtl', whiteSpace: 'nowrap',
        }}>
          <FiAlertTriangle size={13} />
          <span>بيانات تجريبية — شغّل <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>generate-executive.js</code> لتحميل البيانات الفعلية</span>
        </div>,
        document.body
      )}
      <DashboardInner db={db} />
    </>
  )
}