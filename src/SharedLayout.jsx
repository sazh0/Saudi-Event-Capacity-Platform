import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { C, MODAL_CONTENT, footerStyles } from './theme'

/* ═══════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════ */
export function Navbar({ scrolled, navigate, isLanding }) {
  const [mOpen, setMOpen] = useState(false)

  const scrollToSection = (linkText) => {
    const sectionMap = {
      'عن المنصة': 'aboutSection',
      'الأسئلة الشائعة': 'faqSection',
      'تواصل معنا': 'contactSection',
    }
    const sectionId = sectionMap[linkText]
    if (!sectionId) return
    setMOpen(false)

    // If we're on the landing page, scroll directly
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else {
      // Navigate to landing with scroll target
      navigate('/', { state: { scrollTo: sectionId } })
    }
  }

  const base = { fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.2s' }

  return (
    <nav style={{
      position: 'fixed', top: 0, right: 0, left: 0, zIndex: 200,
      background: scrolled ? `${C.charcoalD}ee` : 'transparent',
      backdropFilter: scrolled ? 'blur(18px)' : 'none',
      transition: 'all 0.4s ease',
    }}>
      <div style={{
        maxWidth: 1300, margin: '0 auto', padding: '0 24px',
        height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Logo — Ministry of Tourism */}
        <div style={{ width: 220, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => isLanding ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigate('/')}
          >
            <img src="/Ministry-of-Tourism.svg" alt="وزارة السياحة" style={{ height: 52, width: 'auto', display: 'block' }} />
          </div>
        </div>

        {/* Center links */}
        <div className="cl-nav-desktop" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 28 }}>
          {['عن المنصة', 'الأسئلة الشائعة', 'تواصل معنا'].map(l => (
            <a
              key={l}
              href="#"
              className="cl-nav-link"
              onClick={e => { e.preventDefault(); scrollToSection(l) }}
            >{l}</a>
          ))}
        </div>

        {/* CTA */}
        <div className="cl-hide-mobile" style={{ width: 220, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {!isLanding && (
            <div
              className="cl-hide-mobile"
              style={{
                width: 220,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                className="cl-btn-primary"
                onClick={() => navigate('/')}
                aria-label="الصفحة الرئيسية"
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateX(-3px)'
                  e.currentTarget.style.color = C.bronzeXL
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateX(0)'
                  e.currentTarget.style.color = C.cream
                }}
                style={{
                  ...base,
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'none',
                  border: 'none',
                  color: C.cream,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="cl-mobile-btn"
          onClick={() => setMOpen(o => !o)}
          aria-label={mOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={mOpen}
          style={{
            ...base, background: 'transparent', border: 'none', padding: 10, borderRadius: 12,
            display: 'none', flexDirection: 'column', justifyContent: 'center', gap: 6,
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {[0, 1, 2].map(i => {
            const isTop = i === 0, isBot = i === 2
            const openStyle = isTop
              ? { transform: 'translateY(8px) rotate(45deg)' }
              : isBot
                ? { transform: 'translateY(-8px) rotate(-45deg)' }
                : { opacity: 0, transform: 'scaleX(0.8)' }
            return (
              <span key={i} style={{
                width: 22, height: 2, background: C.cream, display: 'block',
                borderRadius: 999, transformOrigin: 'center',
                transition: 'transform 220ms ease, opacity 180ms ease',
                ...(mOpen ? openStyle : { opacity: 1, transform: 'none' }),
              }} />
            )
          })}
        </button>
      </div>

      {/* Mobile drawer */}
      {mOpen && (
        <div style={{ background: `${C.charcoalD}ee`, backdropFilter: 'blur(18px)', padding: '18px 24px 24px' }}>
          {['عن المنصة', 'الأسئلة الشائعة', 'تواصل معنا'].map(l => (
            <a
              key={l}
              href="#"
              className="cl-nav-link"
              style={{ display: 'block', marginBottom: 16, fontSize: 15 }}
              onClick={e => { e.preventDefault(); scrollToSection(l) }}
            >{l}</a>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              onClick={() => navigate(isLanding ? "/landing" : "/")}
              aria-label={isLanding ? "استكشف المنصة" : "الصفحة الرئيسية"}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.bronzeXL
                e.currentTarget.style.color = C.bronzeXL
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.color = C.cream
              }}
              style={{
                flex: 1, padding: '10px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                color: C.cream, transition: 'all 0.2s',
              }}
            >
              {isLanding ? 'استكشف المنصة' : 'الصفحة الرئيسية'}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════
   GLASS MODAL
═══════════════════════════════════════════════════════ */
export function GlassModal({ title, onClose }) {
  const content = MODAL_CONTENT[title]
  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const renderBody = (text) =>
    text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 8 }} />
      const parts = line.split(/\*\*(.+?)\*\*/g)
      return (
        <p key={i} style={{ margin: 0, fontSize: 13, color: C.grayXL, lineHeight: 2, direction: 'rtl' }}>
          {parts.map((p, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ color: C.bronzeXL, fontWeight: 700 }}>{p}</strong>
              : p
          )}
        </p>
      )
    })

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: 'cl-fadeIn 0.22s ease',
        background: `${C.charcoalD}ee`,
        backdropFilter: 'blur(20px)'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 560, width: '100%', maxHeight: '80vh',
          borderRadius: 20,
          border: `1px solid rgba(124,58,237,0.15)`,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'cl-fadeInUp 0.28s ease',
          position: 'relative',
          background: C.charcoalD,
          backdropFilter: 'blur(20px)'
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid rgba(124,58,237,0.1)`,
          direction: 'rtl',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{content.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.cream }}>{title}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              color: C.grayXL, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,0.08)'}
            aria-label="إغلاق"
          >✕</button>
        </div>
        <div style={{ padding: '20px 24px 24px', overflowY: 'auto', direction: 'rtl' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {renderBody(content.body)}
          </div>
        </div>
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 180, height: 180,
          background: `radial-gradient(circle, ${C.bronze}18 0%, transparent 70%)`,
          pointerEvents: 'none', borderRadius: '50%',
          transform: 'translate(40%, 40%)',
        }} />
      </div>
    </div>,
    document.body
  )
}

/* ═══════════════════════════════════════════════════════
   FOOTER — simplified, no copyright line
═══════════════════════════════════════════════════════ */
export function Footer({ navigate }) {
  const [activeModal, setActiveModal] = useState(null)


  const CONTACT = {
    name: 'سارة بنت عبدالعزيز',
    phone: '+966 55 665 6100',
    email: 'saraabdulazizzh@gmail.com',
    linkedin: 'https://www.linkedin.com/in/sarabdulaziz/',
    github: "https://github.com/sazh0"
  }

  const iconStyle = {
    width: 32, height: 32, borderRadius: 8,
    background: 'rgba(124,58,237,0.08)',
    border: '1px solid rgba(124,58,237,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.2s', color: C.grayL,
    textDecoration: 'none',
  }

  return (
    <>
      {activeModal && <GlassModal title={activeModal} onClose={() => setActiveModal(null)} />}
      <footer id="contactSection" style={{ background: C.charcoalD, borderTop: `1px solid ${C.bronze}14`, padding: '40px 24px 25px' }}>
        <style>{footerStyles}</style>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div className="footer-grid">

            {/* Column 1: Contact */}
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: C.cream, marginBottom: 14 }}>تواصل معنا</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.cream, marginBottom: 8 }}>{CONTACT.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} style={{ fontSize: 11.5, color: C.gray, textDecoration: 'none', direction: 'ltr', textAlign: 'right', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.bronzeXL}
                  onMouseLeave={e => e.currentTarget.style.color = C.gray}
                >{CONTACT.phone}</a>
                <a href={`mailto:${CONTACT.email}`} style={{ fontSize: 11.5, color: C.gray, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.bronzeXL}
                  onMouseLeave={e => e.currentTarget.style.color = C.gray}
                >{CONTACT.email}</a>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Email icon */}
                <a href={`mailto:${CONTACT.email}`} style={iconStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)'; e.currentTarget.style.color = C.bronzeXL }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.color = C.grayL }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </a>
                {/* Phone icon */}
                <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} style={iconStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)'; e.currentTarget.style.color = C.bronzeXL }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.color = C.grayL }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </a>
                {/* LinkedIn icon */}
                <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer" style={iconStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)'; e.currentTarget.style.color = C.bronzeXL }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.color = C.grayL }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>

                {/* GitHub icon */}
                <a href={CONTACT.github} target="_blank" rel="noopener noreferrer" style={iconStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)'; e.currentTarget.style.color = C.bronzeXL }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.color = C.grayL }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>

              </div>
            </div>

          </div>
          <div style={{ borderTop: `1px solid rgba(255,255,255,0.055)`, paddingTop: 22, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ fontSize: 11, color: C.gray, lineHeight: 1.8, textAlign: 'center' }}>
              <span style={{ color: C.bronze, fontWeight: 700 }}>إخلاء مسؤولية: </span>
              البيانات والمؤشرات المعروضة هي بيانات تحليلية وتوقعات تقديرية لأغراض المحاكاة والعرض التقني، ولا تُمثّل بيانات رسمية أو فعلية. تم تطوير هذا المشروع لأغراض استعراض المهارات التقنية وتحليل البيانات.            </p>
          </div>
        </div>
      </footer>
    </>
  )
}