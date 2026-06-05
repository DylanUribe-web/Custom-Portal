'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'idle' | 'loading' | 'sent' | 'error'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStep('loading')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        shouldCreateUser: true,  // false en producción para evitar registros no autorizados
      },
    })

    if (error) {
      setStep('error')
      setErrorMsg(
        error.message.includes('not authorized')
          ? 'This email address does not have access to the portal. Contact your coordinator.'
          : 'An error occurred. Please try again.'
      )
    } else {
      setStep('sent')
    }
  }

  return (
    <main className="login-root">
      {/* Background layers */}
      <div className="login-bg" />
      <div className="login-grid" />
      <div className="login-glow" />

      <div className="login-wrapper">
        {/* Logo / Marca */}
        <header className="login-header">
          <div className="cer-badge">CER</div>
          <span className="cer-label">Patient Portal</span>
        </header>

        {/* Card */}
        <div className="login-card">
          {step === 'sent' ? (
            <SentState email={email} onBack={() => setStep('idle')} />
          ) : (
            <>
              <div className="login-card-header">
                <h1>Welcome</h1>
                <p>Enter your email address to access your medical records and follow-up information.</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="field-wrapper">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={step === 'loading'}
                    required
                  />
                </div>

                {step === 'error' && (
                  <p className="error-msg">{errorMsg}</p>
                )}

                <button type="submit" className="login-btn" disabled={step === 'loading'}>
                  {step === 'loading' ? (
                    <span className="btn-loading">
                      <span className="spinner" />
                      Sending...
                    </span>
                  ) : (
                    'Send Access Link'
                  )}
                </button>
              </form>

              <p className="login-hint">
                We will send you a secure link. You don't need a password.
              </p>
            </>
          )}
        </div>

        <footer className="login-footer">
          © {new Date().getFullYear()} CER Group Corporation · Tijuana, B.C.
        </footer>
      </div>

      <style>{loginStyles}</style>
    </main>
  )
}

function SentState({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="sent-state">
      <div className="sent-icon">✉</div>
      <h2>Check Your Email</h2>
      <p>
        We've sent an access link to <strong>{email}</strong>.
        The link will expire in 10 minutes.
      </p>
      <p className="sent-hint">Didn't receive it? Check your spam folder.</p>
      <button onClick={onBack} className="back-btn">
        Use a Different Email
      </button>
    </div>
  )
}

const loginStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@300;400;600;700&family=DM+Sans:wght@400;500&display=swap');

  .login-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: #010e2a;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
  }

  /* Fondo con gradiente radial */
  .login-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 50%, rgba(0,47,125,0.55) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 80% 30%, rgba(0,196,204,0.08) 0%, transparent 50%),
      linear-gradient(160deg, #010e2a 0%, #020d20 100%);
  }

  /* Grid sutil */
  .login-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,196,204,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,196,204,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  /* Glow accent */
  .login-glow {
    position: absolute;
    top: -20%;
    left: -10%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(0,196,204,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  .login-wrapper {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 440px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
  }

  /* Header con logo */
  .login-header {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .cer-badge {
    background: linear-gradient(135deg, #002f7d, #00c4cc);
    color: white;
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-weight: 700;
    font-size: 18px;
    letter-spacing: 0.08em;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cer-label {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 20px;
    font-weight: 300;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.02em;
  }

  /* Card con glassmorphism */
  .login-card {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 36px 32px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow:
      0 0 0 1px rgba(0,196,204,0.06),
      0 24px 48px rgba(0,0,0,0.4),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }

  .login-card-header {
    margin-bottom: 28px;
  }

  .login-card-header h1 {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 26px;
    font-weight: 600;
    color: #ffffff;
    margin: 0 0 10px;
    letter-spacing: -0.02em;
  }

  .login-card-header p {
    font-size: 14px;
    color: rgba(255,255,255,0.48);
    line-height: 1.6;
    margin: 0;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field-wrapper label {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .field-wrapper input {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 13px 16px;
    color: white;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    font-size: 15px;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  .field-wrapper input::placeholder {
    color: rgba(255,255,255,0.2);
  }

  .field-wrapper input:focus {
    border-color: rgba(0,196,204,0.5);
    background: rgba(0,196,204,0.05);
  }

  .field-wrapper input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-msg {
    font-size: 13px;
    color: #ff6b6b;
    background: rgba(255,107,107,0.08);
    border: 1px solid rgba(255,107,107,0.2);
    border-radius: 8px;
    padding: 10px 14px;
    margin: 0;
  }

  .login-btn {
    background: linear-gradient(135deg, #002f7d, #0043b0);
    border: 1px solid rgba(0,196,204,0.2);
    border-radius: 10px;
    color: white;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    font-size: 15px;
    font-weight: 500;
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .login-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(0,196,204,0.15), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .login-btn:hover:not(:disabled)::after {
    opacity: 1;
  }

  .login-btn:hover:not(:disabled) {
    border-color: rgba(0,196,204,0.4);
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(0,47,125,0.4);
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #00c4cc;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .login-hint {
    font-size: 12px;
    color: rgba(255,255,255,0.3);
    text-align: center;
    margin: 16px 0 0;
  }

  /* Estado enviado */
  .sent-state {
    text-align: center;
    padding: 8px 0;
  }

  .sent-icon {
    font-size: 40px;
    margin-bottom: 16px;
    display: block;
  }

  .sent-state h2 {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 22px;
    font-weight: 600;
    color: white;
    margin: 0 0 12px;
  }

  .sent-state p {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    line-height: 1.6;
    margin: 0 0 8px;
  }

  .sent-state strong {
    color: #00c4cc;
    font-weight: 500;
  }

  .sent-hint {
    font-size: 12px !important;
    color: rgba(255,255,255,0.3) !important;
    margin-bottom: 24px !important;
  }

  .back-btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    color: rgba(255,255,255,0.5);
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    font-size: 13px;
    padding: 10px 20px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .back-btn:hover {
    border-color: rgba(0,196,204,0.3);
    color: rgba(255,255,255,0.8);
  }

  .login-footer {
    font-size: 11px;
    color: rgba(255,255,255,0.18);
    text-align: center;
  }

  @media (max-width: 480px) {
    .login-card {
      padding: 28px 22px;
    }
  }
`