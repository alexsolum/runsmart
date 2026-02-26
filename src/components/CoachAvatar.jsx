export default function CoachAvatar({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Marius AI Bakken"
    >
      <defs>
        <clipPath id="coach-avatar-clip">
          <circle cx="24" cy="24" r="24" />
        </clipPath>
      </defs>

      {/* Background circle */}
      <circle cx="24" cy="24" r="24" fill="#2563EB" />

      {/* Norwegian flag accent stripes */}
      <rect x="0" y="19" width="48" height="5" fill="#DC2626" opacity="0.75" clipPath="url(#coach-avatar-clip)" />
      <rect x="0" y="21.5" width="48" height="2" fill="white" opacity="0.9" clipPath="url(#coach-avatar-clip)" />

      {/* Runner — head */}
      <circle cx="27" cy="9" r="4.5" fill="white" clipPath="url(#coach-avatar-clip)" />

      {/* Runner — torso (leaning forward) */}
      <line x1="27" y1="13.5" x2="22" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" clipPath="url(#coach-avatar-clip)" />

      {/* Runner — back leg */}
      <line x1="22" y1="27" x2="17" y2="38" stroke="white" strokeWidth="2" strokeLinecap="round" clipPath="url(#coach-avatar-clip)" />

      {/* Runner — front leg (lifted) */}
      <line x1="22" y1="27" x2="29" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round" clipPath="url(#coach-avatar-clip)" />

      {/* Runner — left arm (pumping back) */}
      <line x1="25" y1="17" x2="17" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" clipPath="url(#coach-avatar-clip)" />

      {/* Runner — right arm (driving forward) */}
      <line x1="25" y1="17" x2="33" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" clipPath="url(#coach-avatar-clip)" />
    </svg>
  );
}
