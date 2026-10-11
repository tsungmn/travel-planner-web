const PRIMARY = "var(--mantine-color-teal-6)";
const MUTED = "var(--mantine-color-dimmed)";

type IllustrationProps = {
  className?: string;
};

export function BrokenPathIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 끊어진 점선 경로 */}
      <path
        d="M20 90 Q 55 90, 60 60 Q 65 30, 80 30"
        stroke={MUTED}
        strokeOpacity={0.35}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      <path
        d="M120 30 Q 135 30, 140 60 Q 145 90, 180 90"
        stroke={MUTED}
        strokeOpacity={0.35}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      {/* 출발 핀 */}
      <g transform="translate(20, 90)">
        <circle r="6" fill={PRIMARY} fillOpacity={0.15} />
        <circle r="3" fill={PRIMARY} />
      </g>
      {/* 도착 핀 */}
      <g transform="translate(180, 90)">
        <circle r="6" fill={PRIMARY} fillOpacity={0.15} />
        <circle r="3" fill={PRIMARY} />
      </g>
      {/* 끊어진 자리의 지그재그 */}
      <g transform="translate(90, 36)">
        <path
          d="M0 0 L5 -6 L10 0 L15 -6 L20 0"
          stroke={PRIMARY}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* 이어지지 않는 점들 */}
      <circle cx="92" cy="28" r="1.5" fill={MUTED} fillOpacity={0.3} />
      <circle cx="105" cy="34" r="1.5" fill={MUTED} fillOpacity={0.3} />
      <circle cx="100" cy="22" r="1.5" fill={MUTED} fillOpacity={0.2} />
    </svg>
  );
}

export function AlertIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="60"
        cy="60"
        r="46"
        stroke={MUTED}
        strokeOpacity={0.2}
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <path
        d="M60 28 L96 88 L24 88 Z"
        stroke={PRIMARY}
        strokeOpacity={0.5}
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill={PRIMARY}
        fillOpacity={0.06}
      />
      <line
        x1="60"
        y1="46"
        x2="60"
        y2="70"
        stroke={PRIMARY}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="60" cy="80" r="2" fill={PRIMARY} />
    </svg>
  );
}
