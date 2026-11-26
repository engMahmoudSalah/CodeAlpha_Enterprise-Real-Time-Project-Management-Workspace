// Original isometric "stacked layers" illustration. Pure SVG, no assets.
export function IsoStack({ className = '' }: { className?: string }) {
  const layer = (y: number, top: string, left: string, right: string, i: number) => (
    <g key={i} transform={`translate(0 ${y})`}><g className="iso-layer" style={{ animationDelay: `${i * 0.4}s` }}>
      <polygon points="200,40 340,110 200,180 60,110" fill={top} />
      <polygon points="60,110 200,180 200,206 60,136" fill={left} />
      <polygon points="340,110 200,180 200,206 340,136" fill={right} />
    </g></g>
  );
  return (
    <svg className={className} viewBox="0 0 400 360" aria-hidden="true" focusable="false">
      <style>{`.iso-layer{animation:isoF 5s ease-in-out infinite alternate}@keyframes isoF{from{transform:translateY(0)}to{transform:translateY(-6px)}}@media (prefers-reduced-motion:reduce){.iso-layer{animation:none}}`}</style>
      <ellipse cx="200" cy="318" rx="140" ry="22" fill="#0f172a" opacity=".08" />
      {layer(150, '#dbeafe', '#93c5fd', '#60a5fa', 0)}
      {layer(90, '#bfdbfe', '#60a5fa', '#3b82f6', 1)}
      {layer(30, '#93c5fd', '#2563eb', '#1d4ed8', 2)}
      <g transform="translate(0 -30)"><g className="iso-layer" style={{ animationDelay: '1.2s' }}><polygon points="200,40 340,110 200,180 60,110" fill="#1d4ed8" /><polygon points="60,110 200,180 200,206 60,136" fill="#1e3a8a" /><polygon points="340,110 200,180 200,206 340,136" fill="#172554" />
        <path d="M150 112l34 17 66-34" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g></g>
    </svg>
  );
}
