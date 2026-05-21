/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — shared across pages (Purple theme)
═══════════════════════════════════════════════════════ */
export const C = {
  charcoalD: '#0d0b1a',
  charcoalM: '#12101f',
  bronze: '#7c3aed',
  bronzeL: '#8b5cf6',
  bronzeXL: '#a78bfa',
  green: '#2563eb',
  greenL: '#3b82f6',
  greenXL: '#60a5fa',
  gray: '#6b7280',
  grayL: '#9ca3af',
  grayXL: '#d1d5db',
  cream: '#f0f0f8',
  creamD: '#e0dff0',
  white: '#FFFFFF',
}

/* ═══════════════════════════════════════════════════════
   INJECT SHARED NAV / GLOBAL STYLES
═══════════════════════════════════════════════════════ */
const NAV_STYLE_ID = 'cl-shared-styles'
export function injectNavStyles() {
  if (document.getElementById(NAV_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = NAV_STYLE_ID
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
    .cl-nav-link {
      color: ${C.grayXL};
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      padding: 5px 1px;
      position: relative;
      transition: color 0.2s;
      white-space: nowrap;
    }
    .cl-nav-link::after {
      content: '';
      position: absolute;
      bottom: 0; right: 0;
      width: 0; height: 1.5px;
      background: ${C.bronze};
      transition: width 0.25s ease;
    }
    .cl-nav-link:hover { color: ${C.bronzeXL}; }
    .cl-nav-link:hover::after { width: 100%; }
    .cl-btn-primary {
      position: relative; overflow: hidden;
    }
    .cl-btn-primary::after {
      content: '';
      position: absolute; inset: 0;
      background: rgba(255,255,255,0.07);
      opacity: 0;
      transition: opacity 0.2s;
    }
    .cl-btn-primary:hover::after { opacity: 1; }
    .cl-shimmer-text {
      background: linear-gradient(100deg, ${C.bronzeXL} 0%, ${C.bronzeL} 35%, #c4b5fd 50%, ${C.bronzeL} 65%, ${C.bronzeXL} 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: cl-shimmerText 4s linear infinite;
    }
    @media (max-width: 768px) {
      .cl-hide-mobile  { display: none !important; }
      .cl-nav-desktop  { display: none !important; }
      .cl-mobile-btn   { display: flex !important; }
    }
    @media (min-width: 769px) {
      .cl-mobile-btn { display: none !important; }
    }
  `
  document.head.appendChild(s)
}

/* ═══════════════════════════════════════════════════════
   FOOTER STYLES
═══════════════════════════════════════════════════════ */
export const footerStyles = `
  .footer-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 36px;
    margin-bottom: 33px;
    direction: rtl;
  }
  @media (max-width: 640px) {
    .footer-grid {
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 25px;
    }
  }
`

/* ═══════════════════════════════════════════════════════
   MODAL CONTENT
═══════════════════════════════════════════════════════ */
export const MODAL_CONTENT = {
  'نطاق الخدمة': {
    icon: '🏟️',
    body: `تُحلل المنصة سعة مرافق الفعاليات الكبرى مقابل أعداد المستهدفين:

• **الملاعب الرياضية** — فورمولا 1، كأس العالم 2034، الرياضات الإلكترونية.
• **المسارح** — ساوندستورم والعروض الترفيهية.
• **مراكز المؤتمرات** — إكسبو 2030، مبادرة مستقبل الاستثمار.
• **مناطق الترفيه والساحات** — موسم الرياض، موسم جدة، موسم الدرعية.`,
  },
  'شروط الاستخدام': {
    icon: '📋',
    body: `**١. قبول الشروط**
باستخدامك لهذه المنصة، فإنك تُقرّ بقراءة هذه الشروط والموافقة عليها.

**٢. نطاق الترخيص**
تُمنح صلاحية الوصول بشكل شخصي وغير قابل للتحويل.

**٣. الملكية الفكرية**
جميع محتويات المنصة محمية بموجب حقوق الملكية الفكرية.

**٤. حدود المسؤولية**
تُقدَّم البيانات كأداة مساندة للقرار ولأغراض تحليلية.`,
  },
  'سياسة الخصوصية': {
    icon: '🔒',
    body: `**البيانات التي نجمعها**
تقتصر على بيانات تسجيل الدخول وسجلات الجلسات لأغراض الأمان.

**كيف نستخدم البيانات**
• مراقبة أداء النظام وتحسين تجربة المستخدم.
• إنتاج تقارير إحصائية مجهولة الهوية.
• لا تُباع البيانات أو تُشارك مع أطراف ثالثة.

**الأمان**
تعتمد المنصة تشفير TLS 1.3 لنقل البيانات وAES-256 للتخزين.`,
  },
}