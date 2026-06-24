import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScanLine, Zap, Globe, Shield, ArrowRight, Sparkles, Layers, BarChart2 } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] } }),
}

const FEATURES = [
  {
    icon: <ScanLine size={28} />,
    title: 'Instant OCR Scan',
    desc: 'Point your camera at any business card — AI extracts every detail in seconds.',
    color: 'var(--teal)',
    bg: 'var(--teal-glow)',
  },
  {
    icon: <Zap size={28} />,
    title: 'AI-Powered Extraction',
    desc: 'Gemini 3.1 Flash Lite reads names, emails, phones, and companies with precision.',
    color: 'var(--purple)',
    bg: 'var(--purple-dim)',
  },
  {
    icon: <Globe size={28} />,
    title: 'CRM Bridge',
    desc: 'Export contacts to your CRM via webhook, CSV, or SFTP — one click.',
    color: 'var(--blue)',
    bg: 'var(--blue-dim)',
  },
]

const STEPS = [
  { num: '01', title: 'Scan', desc: 'Open the scanner and capture a business card photo', icon: <ScanLine size={24} /> },
  { num: '02', title: 'Extract', desc: 'AI reads every field — name, email, phone, company', icon: <Sparkles size={24} /> },
  { num: '03', title: 'Export', desc: 'Review, edit if needed, and push to your CRM instantly', icon: <Layers size={24} /> },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      {/* Animated background */}
      <div className="landing-bg">
        <div className="landing-bg-orb landing-bg-orb-1" />
        <div className="landing-bg-orb landing-bg-orb-2" />
        <div className="landing-bg-orb landing-bg-orb-3" />
        <div className="landing-bg-grid" />
      </div>

      {/* Nav */}
      <motion.nav
        className="landing-nav"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon"><Zap size={20} /></div>
            <span className="landing-logo-text">ScanFlow</span>
          </div>
          <div className="landing-nav-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>
              Get Started <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="landing-hero">
        <motion.div
          className="landing-hero-content"
          initial="hidden"
          animate="show"
        >
          <motion.div className="landing-badge" variants={fadeUp} custom={0}>
            <Sparkles size={14} /> AI-Powered OCR
          </motion.div>

          <motion.h1 className="landing-h1" variants={fadeUp} custom={1}>
            Scan. Extract.
            <br />
            <span className="landing-h1-accent">Connect.</span>
          </motion.h1>

          <motion.p className="landing-subtitle" variants={fadeUp} custom={2}>
            Turn business cards into CRM contacts in seconds.
            AI-powered OCR with instant extraction, smart validation, and one-click export.
          </motion.p>

          <motion.div className="landing-cta-row" variants={fadeUp} custom={3}>
            <motion.button
              className="btn btn-primary btn-lg landing-cta-primary"
              onClick={() => navigate('/signup')}
              whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(0, 212, 168, 0.3)' }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started Free <ArrowRight size={18} />
            </motion.button>
            <motion.button
              className="btn btn-ghost btn-lg"
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign In
            </motion.button>
          </motion.div>

          <motion.div className="landing-stats-row" variants={fadeUp} custom={4}>
            {[
              { value: '< 3s', label: 'Extraction time' },
              { value: '99%', label: 'Accuracy' },
              { value: 'Free', label: 'To start' },
            ].map(({ value, label }) => (
              <div key={label} className="landing-stat">
                <div className="landing-stat-value">{value}</div>
                <div className="landing-stat-label">{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Hero visual — floating card mockup */}
        <motion.div
          className="landing-hero-visual"
          initial={{ opacity: 0, x: 60, rotateY: -15 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="landing-card-mockup">
            <div className="landing-card-header">
              <div className="landing-card-dot" />
              <div className="landing-card-dot" />
              <div className="landing-card-dot" />
            </div>
            <div className="landing-card-body">
              <div className="landing-card-scan-line" />
              <div className="landing-card-field"><span className="lcf-label">Name</span><span className="lcf-value">Sarah Chen</span></div>
              <div className="landing-card-field"><span className="lcf-label">Title</span><span className="lcf-value">VP of Engineering</span></div>
              <div className="landing-card-field"><span className="lcf-label">Company</span><span className="lcf-value">TechFlow Inc.</span></div>
              <div className="landing-card-field"><span className="lcf-label">Email</span><span className="lcf-value lcf-teal">sarah@techflow.io</span></div>
              <div className="landing-card-field"><span className="lcf-label">Phone</span><span className="lcf-value">+1 (415) 555-0123</span></div>
              <div className="landing-card-conf">
                <BarChart2 size={14} /> 
                <span>98% confidence</span>
                <div className="landing-card-conf-bar"><div className="landing-card-conf-fill" /></div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="landing-section">
        <motion.div
          className="landing-section-header"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.h2 className="landing-h2" variants={fadeUp} custom={0}>
            Everything you need to digitize contacts
          </motion.h2>
          <motion.p className="landing-section-sub" variants={fadeUp} custom={1}>
            From scan to CRM — automated, validated, and secure.
          </motion.p>
        </motion.div>

        <motion.div
          className="landing-features-grid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} className="landing-feature-card" variants={fadeUp} custom={i}>
              <div className="landing-feature-icon" style={{ background: f.bg, color: f.color }}>
                {f.icon}
              </div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="landing-section">
        <motion.div
          className="landing-section-header"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.h2 className="landing-h2" variants={fadeUp} custom={0}>
            How it works
          </motion.h2>
          <motion.p className="landing-section-sub" variants={fadeUp} custom={1}>
            Three simple steps from card to CRM.
          </motion.p>
        </motion.div>

        <motion.div
          className="landing-steps"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {STEPS.map((step, i) => (
            <motion.div key={step.num} className="landing-step" variants={fadeUp} custom={i}>
              <div className="landing-step-num">{step.num}</div>
              <div className="landing-step-icon">{step.icon}</div>
              <h3 className="landing-step-title">{step.title}</h3>
              <p className="landing-step-desc">{step.desc}</p>
              {i < STEPS.length - 1 && <div className="landing-step-connector" />}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Security banner */}
      <section className="landing-section">
        <motion.div
          className="landing-security-banner"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Shield size={32} className="landing-security-icon" />
          <div>
            <h3 className="landing-security-title">Enterprise-grade security</h3>
            <p className="landing-security-desc">
              JWT authentication, bcrypt password hashing, rate-limited APIs, 
              and your data never leaves your CRM pipeline.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="landing-section landing-final-cta">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          style={{ textAlign: 'center' }}
        >
          <motion.h2 className="landing-h2" variants={fadeUp} custom={0}>
            Ready to scan your first card?
          </motion.h2>
          <motion.p className="landing-section-sub" variants={fadeUp} custom={1}>
            Free to start. No credit card required.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <motion.button
              className="btn btn-primary btn-lg landing-cta-primary"
              onClick={() => navigate('/signup')}
              whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(0, 212, 168, 0.3)' }}
              whileTap={{ scale: 0.97 }}
            >
              Create Free Account <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon"><Zap size={16} /></div>
            <span className="landing-logo-text" style={{ fontSize: '0.875rem' }}>ScanFlow</span>
          </div>
          <p className="landing-footer-copy">© 2024 ScanFlow. Powered by AI.</p>
        </div>
      </footer>
    </div>
  )
}
