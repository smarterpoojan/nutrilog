export default function Spinner({ size = 20, color = 'var(--mint)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--border2)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}
