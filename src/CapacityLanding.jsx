import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import FAQ from "./faq";
import { Navbar, Footer } from './SharedLayout'
import { C } from './theme'


/* ═══════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════ */
const STYLE_ID = 'capacity-landing-styles'
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    .cl-root *, .cl-root *::before, .cl-root *::after { box-sizing: border-box; }
    .cl-root {
      font-family: "TheYearofHandicrafts", "Segoe UI", sans-serif;
      background: ${C.charcoalD};
      color: ${C.cream};
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    .cl-root *:focus-visible {
      outline: 2px solid ${C.bronze};
      outline-offset: 3px;
      border-radius: 4px;
    }

    @keyframes cl-fadeInUp {
      from { opacity:0; transform:translateY(22px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes cl-fadeIn {
      from { opacity:0; }
      to   { opacity:1; }
    }
    @keyframes cl-dotBlink {
      0%,100% { opacity:1; }
      50%      { opacity:0.25; }
    }
    @keyframes cl-shimmerText {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }

    .cl-reveal {
      opacity:0;
      transform:translateY(28px);
      transition: opacity 0.7s ease, transform 0.7s ease;
    }
    .cl-reveal.cl-visible {
      opacity:1;
      transform:translateY(0);
    }

    .cl-reveal-child {
      opacity:0;
      transform:translateY(18px);
      transition: opacity 0.55s ease, transform 0.55s ease;
    }
    .cl-visible .cl-reveal-child:nth-child(1) { transition-delay:0s; }
    .cl-visible .cl-reveal-child:nth-child(2) { transition-delay:0.1s; }
    .cl-visible .cl-reveal-child:nth-child(3) { transition-delay:0.2s; }
    .cl-visible .cl-reveal-child:nth-child(4) { transition-delay:0.3s; }
    .cl-visible .cl-reveal-child { opacity:1; transform:translateY(0); }

    .cl-nav-link {
      color:${C.grayXL};
      text-decoration:none;
      font-size:14px;
      font-weight:500;
      padding:5px 1px;
      position:relative;
      transition:color 0.2s;
      white-space: nowrap;
    }
    .cl-nav-link::after {
      content:'';
      position:absolute;
      bottom:0; right:0;
      width:0; height:1.5px;
      background:${C.bronze};
      transition:width 0.25s ease;
    }
    .cl-nav-link:hover { color:${C.bronzeXL}; }
    .cl-nav-link:hover::after { width:100%; }

    .cl-card {
      transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
    }
    .cl-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 24px 56px rgba(0,0,0,0.38), 0 0 0 1px ${C.bronze}28;
    }

    .cl-btn-primary {
      position:relative; overflow:hidden;
    }
    .cl-btn-primary::after {
      content:'';
      position:absolute; inset:0;
      background:rgba(255,255,255,0.07);
      opacity:0;
      transition:opacity 0.2s;
    }
    .cl-btn-primary:hover::after { opacity:1; }

    .cl-shimmer-text {
      background: linear-gradient(100deg, ${C.bronzeXL} 0%, ${C.bronzeL} 35%, #c4b5fd 50%, ${C.bronzeL} 65%, ${C.bronzeXL} 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: cl-shimmerText 4s linear infinite;
    }

    @keyframes cl-floatOrb {
      0%,100% { transform: translateY(0) scale(1); opacity:0.18; }
      50%      { transform: translateY(-28px) scale(1.12); opacity:0.28; }
    }

    @media (max-width:768px) {
      .cl-hide-mobile { display:none !important; }
      .cl-nav-desktop { display:none !important; }
      .cl-mobile-btn  { display:flex !important; }
    }
    @media (min-width:769px) {
      .cl-mobile-btn { display:none !important; }
    }
  `
  document.head.appendChild(s)
}


/* ═══════════════════════════════════════════════════════
   REVEAL HOOK
═══════════════════════════════════════════════════════ */
function useReveal(rootSelector = '.cl-root') {
  useEffect(() => {
    const root = document.querySelector(rootSelector)
    if (!root) return
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('cl-visible'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.08 })
    root.querySelectorAll('.cl-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [rootSelector])
}

/* ═══════════════════════════════════════════════════════
   ANIMATED COUNTER
═══════════════════════════════════════════════════════ */
function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { setStarted(true); obs.disconnect() }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    let s = null
    const step = ts => {
      if (!s) s = ts
      const p = Math.min((ts - s) / 1800, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(ease * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [started, target])

  return <span ref={ref}>{val.toLocaleString('ar-SA')}{suffix}</span>
}

/* ═══════════════════════════════════════════════════════
   HERO CANVAS — purple particles
═══════════════════════════════════════════════════════ */
function HeroCanvas({ intensity }) {
  const ref = useRef(null)
  const anim = useRef(null)
  const state = useRef({ particles: [], nodes: [] })


  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = 0, H = 0

    const resize = () => {
      W = canvas.parentElement.offsetWidth
      H = canvas.parentElement.offsetHeight
      canvas.width = W
      canvas.height = H
      buildNodes()
    }

    const buildNodes = () => {
      const n = Math.floor((W * H) / 16000)
      state.current.nodes = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.4,
      }))
    }

    const newParticle = () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: Math.random() * 260 + 100,
      size: Math.random() * 1.7 + 0.4,
      kind: Math.random() < 0.18 ? 'purple' : Math.random() < 0.32 ? 'blue' : 'gray',
    })

    const initParticles = () => {
      state.current.particles = Array.from({ length: Math.min(90, Math.floor(W / 11)) }, newParticle)
    }

    const col = (kind, a) => {
      if (kind === 'purple') return `rgba(139,92,246,${a})`
      if (kind === 'blue') return `rgba(59,130,246,${a})`
      return `rgba(110,112,114,${a})`
    }

    resize()
    initParticles()
    window.addEventListener('resize', () => { resize(); initParticles() })

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      const gs = 46
      ctx.fillStyle = 'rgba(124,58,237,0.035)'
      for (let x = 0; x < W + gs; x += gs) {
        const offset = (Math.floor(x / gs) % 2) * (gs / 2)
        for (let y = offset; y < H + gs; y += gs) {
          ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill()
        }
      }

      const iv = intensity
      state.current.nodes.forEach((n, i) => {
        state.current.nodes.slice(i + 1).forEach(m => {
          const d = Math.hypot(n.x - m.x, n.y - m.y)
          if (d < 130) {
            ctx.strokeStyle = `rgba(124,58,237,${(1 - d / 130) * 0.055 * iv})`
            ctx.lineWidth = 0.5
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke()
          }
        })
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(124,58,237,0.16)'; ctx.fill()
      })

      state.current.particles.forEach((p, idx) => {
        p.x += p.vx * iv; p.y += p.vy * iv; p.life++
        const a = Math.sin((p.life / p.maxLife) * Math.PI) * 0.8

        if (p.kind === 'purple') {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5)
          g.addColorStop(0, `rgba(139,92,246,${a * 0.5})`)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2); ctx.fill()
        }

        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = col(p.kind, a); ctx.fill()

        if (p.kind !== 'gray') {
          ctx.beginPath(); ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x - p.vx * 14, p.y - p.vy * 14)
          ctx.strokeStyle = col(p.kind, a * 0.3)
          ctx.lineWidth = p.size * 0.6; ctx.stroke()
        }

        state.current.nodes.forEach(n => {
          const d = Math.hypot(p.x - n.x, p.y - n.y)
          if (d < 75) {
            ctx.strokeStyle = col(p.kind, (1 - d / 75) * a * 0.35)
            ctx.lineWidth = 0.35
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(n.x, n.y); ctx.stroke()
          }
        })

        if (p.life >= p.maxLife || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
          state.current.particles[idx] = newParticle()
        }
      })

      anim.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(anim.current); window.removeEventListener('resize', resize) }
  }, [intensity])

  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}

/* ═══════════════════════════════════════════════════════
   HERO VIDEO
═══════════════════════════════════════════════════════ */
function HeroVideo({ src }) {
  const videoRef = useRef(null)
  const [isMuted, setIsMuted] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const tryPlay = () => {
      video.muted = true
      video.play().catch(() => { })
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tryPlay()
        setTimeout(tryPlay, 300)
      })
    })
  }, [src])

  const toggleSound = (e) => {
    e.stopPropagation()
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted
      videoRef.current.muted = nextMuted
      setIsMuted(nextMuted)
    }
  }

  return (
    <>
      <video
        ref={videoRef}
        key={src}
        autoPlay
        muted={isMuted}
        loop
        playsInline
        preload="auto"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center', pointerEvents: 'none',
          filter: 'brightness(0.35) saturate(0.6) hue-rotate(10deg)',
        }}
      >
        {src.endsWith('.webm')
          ? <source src={src} type="video/webm" />
          : src.endsWith('.mp4')
            ? <source src={src} type="video/mp4" />
            : <source src={src} />
        }
      </video>

      <button
        onClick={toggleSound}
        style={{
          position: 'absolute',
          bottom: 28, left: 28, zIndex: 150,
          background: 'transparent',
          border: 'none',
          color: isMuted ? 'rgba(255,255,255,0.35)' : C.bronzeXL,
          cursor: 'pointer',
          padding: 8,
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.3s ease',
          pointerEvents: 'auto',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = C.bronzeXL
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = isMuted ? 'rgba(255,255,255,0.35)' : C.bronzeXL
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        aria-label={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
      >
        {isMuted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, opacity: 0.9 }}>
          {isMuted ? 'صوت' : 'كتم'}
        </span>
      </button>
    </>
  )
}

/* ═══════════════════════════════════════════════════════
   HERO — concise marketing copy
═══════════════════════════════════════════════════════ */
function Hero({ navigate, videoSrc }) {
  const [scrollY, setScrollY] = useState(0)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', fn, { passive: true })

    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const video = document.querySelector('video')
    if (!video) return

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        video.muted = true
        video.play().catch(() => { })
      }
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const intensity = hovered ? 1.7 : Math.max(0.55, 1 - scrollY / 500)

  const stats = [
    {
      val: 9,
      suf: '+',
      label: <>فعاليات<br />كبرى</>,
      c: C.bronzeXL
    },
    {
      val: 5,
      suf: ' سنوات',
      label: <>تحليلية<br />متوقعة</>,
      c: C.greenXL
    },
    { val: 100, suf: '%', label: <>تفاعلية<br />كاملة</>, c: C.bronzeL }
  ]

  const btn = {
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: 'none',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }

  return (
    <section
      id="aboutSection"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: `linear-gradient(160deg,${C.charcoalD} 0%,${C.charcoalM} 55%,#1a1030 100%)`,
      }}
    >
      {videoSrc && <HeroVideo src={videoSrc} />}

      {videoSrc && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
            background: 'rgba(10,8,20,0.45)',
          }}
        />
      )}

      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        <HeroCanvas intensity={intensity} />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          insetInline: 0,
          height: 220,
          background: `linear-gradient(to bottom,${C.charcoalD},transparent)`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          insetInline: 0,
          height: 240,
          background: `linear-gradient(to top,${C.charcoalD},transparent)`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '18%',
          right: '-4%',
          width: 1,
          height: '55%',
          background: `linear-gradient(to bottom,transparent,${C.bronze}45,transparent)`,
          transform: 'rotate(-11deg)',
          zIndex: 3,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: 780,
          padding: '0 24px',
          transform: `translateY(${-scrollY * 0.18}px)`,
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(42px,5.8vw,70px)',
            fontWeight: 900,
            lineHeight: 1.18,
            color: C.cream,
            marginBottom: 12,
            animation: 'cl-fadeInUp 0.85s ease 0.15s both',
          }}
        >
          <span className="cl-shimmer-text">المرصد الوطني</span>

          <br />

          <span
            style={{
              fontSize: '0.72em',
              fontWeight: 800,
              opacity: 0.95,
            }}
          >
            لجاهزية الفعاليات الكبرى
          </span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(16px,1.8vw,20px)',
            color: C.grayL,
            lineHeight: 2,
            maxWidth: 560,
            margin: '0 auto 40px',
            fontWeight: 400,
            animation: 'cl-fadeInUp 0.85s ease 0.38s both',
          }}
        >
          منصة وطنية لتحليل جاهزية المرافق وقدرتها على استيعاب الأعداد المستهدفة خلال للفعاليات الكبرى، خلال الفترة من ٢٠٣٠ حَتى ٢٠٣٤، والتي تشهد استضافة المملكة لأحداث عالمية كبرى مثل إكسبو ٢٠٣٠ وكأس العالم ٢٠٣٤.
        </p>

        {/* CTA */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'cl-fadeInUp 0.85s ease 0.48s both',
          }}
        >
          <button
            className="cl-btn-primary"
            onClick={() => navigate('/landing')}
            style={{
              ...btn,
              padding: '14px 36px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 800,
              background: `linear-gradient(135deg,${C.bronze},${C.bronzeL})`,
              color: 'white',
              boxShadow: `0 8px 28px ${C.bronze}52`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = `0 14px 36px ${C.bronze}68`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 8px 28px ${C.bronze}52`
            }}
          >
            استكشف المنصة
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 40,
            marginTop: 56,
            flexWrap: 'wrap',
            animation: 'cl-fadeInUp 0.85s ease 0.6s both',
          }}
        >
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 'clamp(36px, 5vw, 56px)',
                  fontWeight: 900,
                  color: s.c,
                  lineHeight: 1,
                }}
              >
                <Counter target={s.val} suffix={s.suf} />
              </div>

              <div
                style={{
                  fontSize: 14,
                  color: C.gray,
                  marginTop: 8,
                  fontWeight: 500,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}

/* ═══════════════════════════════════════════════════════
   OVERVIEW CARDS — 3 concise cards
═══════════════════════════════════════════════════════ */
function OverviewCards() {
  const cards = [
    {
      svg: (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M3 18 Q13 10 23 18" stroke={C.bronze} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M5 18v4M21 18v4M13 14v8" stroke={C.bronze} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M3 22h20" stroke={C.bronze} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="13" cy="11" r="2.5" fill={C.bronze} fillOpacity=".6" />
          <path d="M10 5l3-2 3 2" stroke={C.bronze} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      ),
      title: 'هل المرافق تكفي الزوار؟',
      accent: C.bronze,
      desc: 'هل ملاعب الرياض ومسارح جدة وساحات الدرعية تكفي مقارنة يومية بين سعة المرافق وأعداد المستهدفين المحليين والدوليين لكل فعالية، تكشف العجز قبل حدوثه.',
    },

    {
      svg: (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <line x1="5" y1="6" x2="21" y2="6" stroke={C.green} strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5" y1="13" x2="21" y2="13" stroke={C.green} strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5" y1="20" x2="21" y2="20" stroke={C.green} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="10" cy="6" r="2.5" fill={C.green} stroke={C.charcoalD} strokeWidth="1" />
          <circle cx="16" cy="13" r="2.5" fill={C.green} stroke={C.charcoalD} strokeWidth="1" />
          <circle cx="8" cy="20" r="2.5" fill={C.green} stroke={C.charcoalD} strokeWidth="1" />
        </svg>
      ),
      title: 'ماذا لو؟',
      accent: C.green,
      desc: 'كبر سعة الملاعب 30%، أو ارفع المستهدفين الدوليين 50%، وشاهد فوراً كيف يتغير العجز والفائض عبر مختلف المرافق.',
    },

    {
      svg: (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <rect x="3" y="5" width="20" height="17" rx="3" stroke={C.bronzeL} strokeWidth="1.3" fill="none" />
          <line x1="3" y1="10" x2="23" y2="10" stroke={C.bronzeL} strokeWidth="1.3" />
          <line x1="8" y1="3" x2="8" y2="7" stroke={C.bronzeL} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="18" y1="3" x2="18" y2="7" stroke={C.bronzeL} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="15" r="1.5" fill={C.bronzeL} fillOpacity=".8" />
          <circle cx="13" cy="15" r="1.5" fill={C.green} fillOpacity=".8" />
          <circle cx="17" cy="15" r="1.5" fill={C.bronze} fillOpacity=".8" />
          <circle cx="9" cy="19" r="1.5" fill={C.green} fillOpacity=".5" />
          <circle cx="13" cy="19" r="1.5" fill={C.bronzeL} fillOpacity=".5" />
        </svg>
      ),
      title: 'جاهزية كل فعالية',
      accent: C.bronzeL,
      desc: 'فورمولا 1، إكسبو 2030، كأس العالم 2034، ومواسم الرياض وجدة. تحليل تفصيلي لكل فعالية يشمل أعداد المستهدفين المتوقعة، سعة المرافق، ومستويات العجز والفائض.'
    },
  ]

  return (
    <section style={{ background: `linear-gradient(180deg,${C.charcoalD},${C.charcoalM})`, padding: '82px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="cl-reveal" style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(22px,3.8vw,34px)', fontWeight: 900, color: C.cream, lineHeight: 1.2 }}>لماذا هذه المنصة؟</h2>
          <div style={{ width: 44, height: 2.5, background: `linear-gradient(90deg,${C.bronze},transparent)`, margin: '16px auto 0', borderRadius: 2 }} />
        </div>

        <div className="cl-reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          {cards.map((c, i) => (
            <div key={i} className="cl-card cl-reveal-child" style={{
              background: 'rgba(255,255,255,0.028)',
              border: `1px solid rgba(124,58,237,0.1)`,
              borderTop: `2.5px solid ${c.accent}55`,
              borderRadius: 14, padding: '28px 22px'
            }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: `${c.accent}10`, border: `1px solid ${c.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                {c.svg}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.cream, marginBottom: 10 }}>{c.title}</div>
              <div style={{ fontSize: 13.5, color: C.grayL, lineHeight: 1.9 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════
   FAQ SECTION
═══════════════════════════════════════════════════════ */
function FAQSection() {
  return (
    <section className="faq-section" id="faqSection" style={{ background: C.charcoalM, padding: '82px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(22px,3.8vw,34px)', fontWeight: 900, color: C.cream, lineHeight: 1.2, textAlign: 'center' }}>الأسئلة الشائعة</h2>
        <div style={{ width: 44, height: 2.5, background: `linear-gradient(90deg,${C.bronze},transparent)`, margin: '16px auto 0', borderRadius: 2, marginBottom: 25 }} />
        <div className="faq-wrapper">
          <FAQ language="ar" />
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════ */
export default function CapacityLanding() {
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    injectStyles()
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const target = location.state?.scrollTo
    if (!target) return
    const timer = setTimeout(() => {
      const el = document.getElementById(target)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => clearTimeout(timer)
  }, [location.state])
  useReveal()

  return (
    <div className="cl-root">
      <Navbar scrolled={scrolled} navigate={navigate} isLanding={true} />
      <Hero navigate={navigate} videoSrc="/herovideo.MP4" />
      <OverviewCards />
      <FAQSection />
      <Footer navigate={navigate} />
    </div>
  )
}