// Original flat "board" sketch: three lanes, one card caught mid-move. Pure SVG, no assets.
export function IsoStack({ className = '' }: { className?: string }) {
  const ink = '#18181b';
  const card = (x: number, y: number, w: number, fill: string, k: string) => (
    <g key={k}>
      <rect x={x + 4} y={y + 4} width={w} height="46" fill={ink} />
      <rect x={x} y={y} width={w} height="46" fill={fill} stroke={ink} strokeWidth="2.5" />
      <path d={`M${x + 10} ${y + 15}h${w * 0.55}M${x + 10} ${y + 29}h${w * 0.35}`} stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 400 330" aria-hidden="true" focusable="false">
      <style>{`.mv{animation:mvF 4.5s ease-in-out infinite alternate}@keyframes mvF{from{transform:translate(0,0) rotate(-4deg)}to{transform:translate(10px,-6px) rotate(-1deg)}}@media (prefers-reduced-motion:reduce){.mv{animation:none}}`}</style>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={14 + i * 128} y="20" width="116" height="280" fill="#fafaf9" stroke={ink} strokeWidth="2.5" strokeDasharray={i === 2 ? '0' : '7 5'} />
          <rect x={14 + i * 128} y="20" width="116" height="26" fill={['#fde68a', '#fdba74', '#a7f3d0'][i]} stroke={ink} strokeWidth="2.5" />
          <path d={`M${26 + i * 128} 33h${[34, 44, 30][i]}`} stroke={ink} strokeWidth="4" strokeLinecap="round" />
        </g>
      ))}
      {card(24, 62, 96, '#fff', 'a')}
      {card(24, 122, 96, '#fff', 'b')}
      {card(152, 62, 96, '#fff', 'c')}
      {card(280, 62, 96, '#fff', 'd')}
      {card(280, 122, 96, '#fff', 'e')}
      <path d="M118 238c40 22 90 22 126-14" stroke="#ea580c" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="2 9" />
      <path d="M236 214l12 10-16 4" stroke="#ea580c" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g className="mv" style={{ transformOrigin: '200px 150px' }}>{card(152, 122, 96, '#fb923c', 'm')}</g>
      <path d="M344 150l8 8 16-18" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
