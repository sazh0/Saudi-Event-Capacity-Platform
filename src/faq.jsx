import React, { useState, useRef, useCallback, useEffect } from "react";
import "./faq.css";

/* ─────────────────────────────────────────
   FAQ data — 5 concise questions
───────────────────────────────────────── */
const DEFAULT_FAQ_AR = [
  {
    f_id: 1,
    f_question: "ما الهدف من المرصد الوطني لجاهزية الفعاليات الكبرى؟",
    f_answer:
      "يقيس المرصد جاهزية المرافق وقدرتها على استيعاب الأعداد المستهدفة خلال الفعاليات الكبرى، من خلال قياس أعداد الزوار المتوقعين وسعة المرافق للكشف عن القدرة الاستيعابية وفجوات العجز والفائض لدعم التخطيط ورفع جاهزية البنية التحتية للفعاليات.",
  },
  {
    f_id: 2,
    f_question: "كيف يتم احتساب العجز والفائض لسعة المرافق؟",
    f_answer:
      "يتم تحليل الفرق بين أعداد المستهدفين وسعة المرافق المتاحة، عندما تتجاوز أعداد الزوار سعة المرافق المتاحة، يظهر عجز استيعابي، بينما يشير الفائض إلى توفر سعة مرافق أعلى من حجم الزوار المتوقع.",
  },
  {
    f_id: 3,
    f_question: "ما الفعاليات والمشاريع التي يشملها التحليل؟",
    f_answer:
      "يشمل التحليل مجموعة من الفعاليات والمشاريع الاستراتيجية الكبرى مثل إكسبو 2030، كأس العالم 2034، كأس العالم للرياضات الإلكترونية، سباقات الفورمولا، موسم الرياض، بالإضافة إلى مشاريع البنية التحتية والتوسعات المرتبطة بالفعاليات الكبرى.",
  },
  {
    f_id: 4,
    f_question: "كيف تساعد أداة (ماذا لو؟) في دعم التخطيط؟",
    f_answer:
      "تتيح أداة (ماذا لو؟) تعديل سيناريوهات سعة المرافق أو أعداد المستهدفين المحليين والدوليين، مع تحديث المؤشرات والرسوم البيانية بشكل فوري لتحليل تأثير التغييرات على سعة المرافق والفجوات الاستيعابية.",
  },
  {
    f_id: 5,
    f_question: "ما الفترة الزمنية التي تغطيها المنصة؟",
    f_answer:
      "تغطي المنصة الفترة من 2030 إلى 2034، وهي مرحلة استراتيجية تشهد استضافة المملكة لعدد من أكبر الفعاليات العالمية، بما يشمل إكسبو 2030 وكأس العالم 2034."
  },
];

/* ─────────────────────────────────────────
   Main FAQ component — simplified
───────────────────────────────────────── */
const FAQ = ({ faq = DEFAULT_FAQ_AR, language = "ar" }) => {
  const [activeItem, setActiveItem] = useState(null);
  const [mounted, setMounted] = useState(false);
  const answerRefs = useRef({});
  const itemRefs = useRef({});

  const isRTL = language === "ar";
  const directionClass = isRTL ? "rtl-text" : "ltr-text";

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const toggleItem = useCallback((id) => {
    setActiveItem((prev) => (prev === id ? null : id));
  }, []);

  const isActive = (id) => activeItem === id;

  const handleKeyDown = useCallback(
    (e, id, index) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleItem(id);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = faq[index + 1];
        if (next) itemRefs.current[next.f_id]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = faq[index - 1];
        if (prev) itemRefs.current[prev.f_id]?.focus();
      } else if (e.key === "Escape") {
        setActiveItem(null);
      }
    },
    [faq, toggleItem]
  );

  return (
    <div className={`faq-container ${directionClass}`} role="region" aria-label="الأسئلة الشائعة">
      {/* FAQ list */}
      <div className="faq-list" role="list">
        {faq.map((item, index) => {
          const active = isActive(item.f_id);
          const answerStyle = active
            ? { maxHeight: (answerRefs.current[item.f_id]?.scrollHeight || 1000) + "px" }
            : { maxHeight: "0px" };

          return (
            <div
              key={item.f_id}
              role="listitem"
              className={`faq-item ${active ? "open" : ""} ${mounted ? "faq-item-visible" : ""}`}
              style={{ animationDelay: mounted ? `${index * 0.07}s` : "0s" }}
            >
              {/* Question row */}
              <div
                ref={(el) => (itemRefs.current[item.f_id] = el)}
                className="faq-question-container"
                onClick={() => toggleItem(item.f_id)}
                onKeyDown={(e) => handleKeyDown(e, item.f_id, index)}
                tabIndex={0}
                role="button"
                aria-expanded={active}
                aria-controls={`faq-answer-${item.f_id}`}
              >
                <span className="faq-num-badge" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="faq-question">
                  {item.f_question}
                </div>

                <div className="faq-toggle" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="chevron-icon"
                    style={{ transform: `rotate(${active ? 180 : 0}deg)` }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Answer panel */}
              <div
                id={`faq-answer-${item.f_id}`}
                className={`faq-answer ${active ? "expanded" : ""}`}
                style={answerStyle}
                ref={(el) => (answerRefs.current[item.f_id] = el)}
                role="region"
                aria-labelledby={`faq-q-${item.f_id}`}
              >
                <div className="faq-answer-content">
                  {item.f_answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FAQ;
