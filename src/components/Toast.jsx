import { useState, useEffect } from 'react'

let toastFn = null
export const toast = (msg, type = 'success') => toastFn?.(msg, type)

export default function Toast() {
  const [items, setItems] = useState([])
  useEffect(() => {
    toastFn = (msg, type) => {
      const id = Date.now()
      setItems(prev => [...prev, { id, msg, type }])
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3000)
    }
    return () => { toastFn = null }
  }, [])
  const colors = { success:'var(--mint)', error:'var(--coral)', info:'var(--blue)' }
  const icons  = { success:'✓', error:'✕', info:'ℹ' }
  return (
    <div style={{position:'fixed',bottom:'2rem',left:'50%',transform:'translateX(-50%)',zIndex:9999,display:'flex',flexDirection:'column',gap:'0.5rem',alignItems:'center',pointerEvents:'none'}}>
      {items.map(t => (
        <div key={t.id} className="slide-up" style={{background:'var(--card2)',border:`1px solid ${colors[t.type]}40`,borderLeft:`3px solid ${colors[t.type]}`,color:'var(--cream)',padding:'0.75rem 1.25rem',borderRadius:'10px',fontSize:'0.88rem',fontWeight:500,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',display:'flex',alignItems:'center',gap:'0.6rem',whiteSpace:'nowrap'}}>
          <span style={{color:colors[t.type],fontWeight:700}}>{icons[t.type]}</span>{t.msg}
        </div>
      ))}
    </div>
  )
}
