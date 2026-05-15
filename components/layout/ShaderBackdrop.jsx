'use client'

export default function ShaderBackdrop() {
  return (
    <div className="shader-backdrop" aria-hidden="true">
      <div className="shader-gradient shader-gradient-a" />
      <div className="shader-gradient shader-gradient-b" />
      <div className="shader-vignette" />
      <div className="shader-noise" />
    </div>
  )
}
