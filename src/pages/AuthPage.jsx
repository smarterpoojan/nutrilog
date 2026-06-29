import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Spinner from '../components/Spinner'

const s = {
  wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
    background:'radial-gradient(ellipse at 30% 20%, rgba(125,216,122,0.06) 0%, transparent 60%), var(--bg)' },
  card: { width:'100%', maxWidth:'420px', background:'var(--card)', border:'1px solid var(--border2)',
    borderRadius:'20px', padding:'2.5rem', boxShadow:'0 24px 80px rgba(0,0,0,0.5)' },
  logo: { display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem', marginBottom:'2rem' },
  logoText: { fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.6rem', fontWeight:700, color:'var(--cream)', letterSpacing:'-0.04em' },
  logoAccent: { color:'var(--mint)' },
  tagline: { textAlign:'center', fontSize:'0.82rem', color:'var(--muted)', marginTop:'-1.5rem', marginBottom:'2rem' },
  tabs: { display:'flex', background:'var(--bg2)', borderRadius:'10px', padding:'3px', marginBottom:'2rem' },
  tab: { flex:1, padding:'0.55rem', border:'none', background:'transparent', borderRadius:'8px',
    fontWeight:500, fontSize:'0.88rem', color:'var(--muted)', transition:'all 0.2s' },
  tabActive: { background:'var(--bg3)', color:'var(--cream)', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' },
  label: { display:'block', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase',
    color:'var(--muted)', marginBottom:'0.4rem' },
  input: { width:'100%', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:'8px',
    color:'var(--text)', fontSize:'0.9rem', padding:'0.7rem 0.9rem', outline:'none', transition:'border-color 0.2s',
    marginBottom:'1rem' },
  btn: { width:'100%', background:'var(--mint)', color:'var(--bg)', border:'none', borderRadius:'10px',
    padding:'0.85rem', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.95rem', fontWeight:700,
    marginTop:'0.5rem', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' },
  err: { background:'rgba(240,123,95,0.12)', border:'1px solid rgba(240,123,95,0.3)', borderRadius:'8px',
    padding:'0.65rem 0.9rem', fontSize:'0.83rem', color:'var(--coral)', marginBottom:'1rem' },
  divider: { textAlign:'center', fontSize:'0.78rem', color:'var(--muted)', margin:'1.25rem 0',
    display:'flex', alignItems:'center', gap:'0.75rem' },
  divLine: { flex:1, height:'1px', background:'var(--border)' },
  googleBtn: { width:'100%', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:'10px',
    padding:'0.75rem', fontSize:'0.88rem', fontWeight:500, color:'var(--cream)',
    display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem', transition:'all 0.2s' },
}

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        setSuccess('Account bana gaya! Check your email to verify.')
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  const onKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div style={s.wrap}>
      <div style={s.card} className="fade-in">
        <div style={s.logo}>
          <span style={{fontSize:'1.8rem'}}>🌿</span>
          <span style={s.logoText}>Nutri<span style={s.logoAccent}>Log</span></span>
        </div>
        <div style={s.tagline}>Track what you eat. Feel better every day.</div>

        <div style={s.tabs}>
          <button style={{...s.tab, ...(mode==='login'?s.tabActive:{})}} onClick={()=>{setMode('login');setError('')}}>Sign In</button>
          <button style={{...s.tab, ...(mode==='signup'?s.tabActive:{})}} onClick={()=>{setMode('signup');setError('')}}>Sign Up</button>
        </div>

        {error   && <div style={s.err}>⚠ {error}</div>}
        {success && <div style={{...s.err, background:'rgba(125,216,122,0.1)', borderColor:'rgba(125,216,122,0.3)', color:'var(--mint)'}}>{success}</div>}

        {mode === 'signup' && (
          <div>
            <label style={s.label}>Full Name</label>
            <input style={s.input} type="text" placeholder="Poojan Oza" value={name}
              onChange={e=>setName(e.target.value)} onKeyDown={onKey}
              onFocus={e=>e.target.style.borderColor='var(--mint)'}
              onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
          </div>
        )}

        <label style={s.label}>Email</label>
        <input style={s.input} type="email" placeholder="poojan@example.com" value={email}
          onChange={e=>setEmail(e.target.value)} onKeyDown={onKey}
          onFocus={e=>e.target.style.borderColor='var(--mint)'}
          onBlur={e=>e.target.style.borderColor='var(--border2)'}/>

        <label style={s.label}>Password</label>
        <input style={s.input} type="password" placeholder="••••••••" value={password}
          onChange={e=>setPassword(e.target.value)} onKeyDown={onKey}
          onFocus={e=>e.target.style.borderColor='var(--mint)'}
          onBlur={e=>e.target.style.borderColor='var(--border2)'}/>

        <button style={s.btn} onClick={handleSubmit}
          onMouseEnter={e=>e.target.style.background='#9AE897'}
          onMouseLeave={e=>e.target.style.background='var(--mint)'}
          disabled={loading}>
          {loading ? <Spinner size={16} color="var(--bg)"/> : mode==='login' ? 'Sign In →' : 'Create Account →'}
        </button>

        <div style={s.divider}><div style={s.divLine}/>or<div style={s.divLine}/></div>

        <button style={s.googleBtn} onClick={handleGoogle}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border2)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
