import React from 'react';

interface NotchGaugeProps {
  value: number; // 0 to 100
  label: string;
  sublabel?: string;
  size?: number;
}

export const NotchGauge: React.FC<NotchGaugeProps> = ({ value, label, sublabel, size = 96 }) => {
  const totalNotches = 22;
  const activeCount = Math.round((value / 100) * totalNotches);
  const radius = size * 0.38;
  const center = size / 2;

  // Arc angles from 140 deg to 400 deg (260 degree arc)
  const startAngle = 140;
  const endAngle = 400;
  const angleStep = (endAngle - startAngle) / (totalNotches - 1);

  const notches = Array.from({ length: totalNotches }).map((_, i) => {
    const angleDeg = startAngle + i * angleStep;
    const angleRad = (angleDeg * Math.PI) / 180;
    const innerR = radius - 6;
    const outerR = radius + 2;

    const x1 = center + innerR * Math.cos(angleRad);
    const y1 = center + innerR * Math.sin(angleRad);
    const x2 = center + outerR * Math.cos(angleRad);
    const y2 = center + outerR * Math.sin(angleRad);

    const isActive = i < activeCount;
    return { x1, y1, x2, y2, isActive, key: i };
  });

  return (
    <div className="notch-gauge-container">
      <div className="gauge-svg-wrapper" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {notches.map((n) => (
            <line
              key={n.key}
              x1={n.x1}
              y1={n.y1}
              x2={n.x2}
              y2={n.y2}
              stroke={n.isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.12)'}
              strokeWidth={n.isActive ? 2.4 : 1.6}
              strokeLinecap="round"
              style={{
                filter: n.isActive ? 'drop-shadow(0 0 2px rgba(255,255,255,0.6))' : 'none',
                transition: 'stroke 0.3s ease, filter 0.3s ease'
              }}
            />
          ))}
        </svg>
        <div className="gauge-center-text">
          <span className="gauge-val">{value}%</span>
          <span className="gauge-lbl">{label}</span>
        </div>
      </div>
      {sublabel && <span className="gauge-sublabel">{sublabel}</span>}
    </div>
  );
};
