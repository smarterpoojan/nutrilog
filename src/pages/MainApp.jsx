import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Toast, { toast } from '../components/Toast'
import LogModal from '../components/LogModal'
import Dashboard from './Dashboard'
import LogPage from './LogPage'
import Analytics from './Analytics'
import Goals from './Goals'

const NAV = [
  { id:'dashboard', label:'Dashboard', icon:'⊞' },
  { id:'log',       label:'Log Meal',  icon:'＋' },
  { id:'analytics', label:'Analytics', icon:'◎' },
  { id:'goals',     label:'Goals',     icon:'◈' },
]

export default function MainApp({ session }) {
  const [page, setPage] = useState('dashboard')
  const [modalOpen, setModalOpen] = useState(true) // open on load
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey(k => k + 1)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast('Signed out', 'info')
  }

  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0]
    || session?.user?.email?.split('@')[0] || 'Friend'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* NAV */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(10,26,10,0.92)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border)', height:58,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 1.5rem', gap:'1rem',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexShrink:0 }}>
          <span style={{ fontSize:'1.4rem' }}>🌿</span>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.15rem', fontWeight:700, letterSpacing:'-0.04em', color:'var(--cream)' }}>
            Nutri<span style={{ color:'var(--mint)' }}>Log</span>
          </span>
        </div>

        <div style={{ display:'flex', gap:'0.15rem', background:'var(--bg2)', padding:'3px', borderRadius:'10px' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              background: page===n.id ? 'var(--bg3)' : 'transparent',
              border:'none', borderRadius:'7px',
              padding:'0.4rem 0.9rem',
              fontFamily:"'Inter',sans-serif", fontSize:'0.82rem', fontWeight:500,
              color: page===n.id ? 'var(--cream)' : 'var(--muted)',
              transition:'all 0.18s',
              display:'flex', alignItems:'center', gap:'0.3rem',
            }}>
              <span style={{ fontSize:'0.9rem' }}>{n.icon}</span>
              <span style={{ display: 'none', ...(typeof window !== 'undefined' && window.innerWidth > 600 ? {display:'inline'} : {}) }}>{n.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexShrink:0 }}>
          <button onClick={() => setModalOpen(true)} style={{
            background:'var(--mint)', color:'var(--bg)', border:'none',
            borderRadius:'8px', padding:'0.45rem 1rem',
            fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.82rem', fontWeight:700,
            transition:'all 0.2s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#9AE897'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--mint)'}>
            + Log
          </button>
          <button onClick={handleSignOut} title="Sign out" style={{
            background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'8px',
            color:'var(--muted)', padding:'0.45rem 0.7rem', fontSize:'0.82rem',
            transition:'all 0.2s',
          }}
            onMouseEnter={e=>{ e.currentTarget.style.color='var(--coral)'; e.currentTarget.style.borderColor='var(--coral)' }}
            onMouseLeave={e=>{ e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderColor='var(--border)' }}>
            ↪
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ flex:1, maxWidth:1200, width:'100%', margin:'0 auto', padding:'1.75rem 1.5rem' }}>
        {page === 'dashboard' && <Dashboard key={refreshKey} session={session} greeting={greeting} userName={userName} onLog={() => setModalOpen(true)} />}
        {page === 'log'       && <LogPage   key={refreshKey} session={session} onLogged={refresh} />}
        {page === 'analytics' && <Analytics key={refreshKey} session={session} />}
        {page === 'goals'     && <Goals     key={refreshKey} session={session} />}
      </main>

      {/* Quick Log Modal */}
      <LogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        session={session}
        onLogged={() => { refresh(); setModalOpen(false) }}
      />

      <Toast />
    </div>
  )
}
