export function BirdLogo({
  size = 26,
  fill = "#211D16",
  eyeFill = "#F5EFE3",
  showEye = true,
  className,
}: {
  size?: number;
  fill?: string;
  eyeFill?: string;
  showEye?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 17c0-5 3.6-9 8.5-9 2.2 0 3.6.9 4.5 2.2l3.5-1-2 3.3c.1.5.1 1 .1 1.5 0 4.7-3.8 8-8.6 8H4l3-3.2C5.1 17.9 4 17 4 17Z"
        fill={fill}
      />
      {showEye && <circle cx="15.6" cy="10.6" r=".9" fill={eyeFill} />}
    </svg>
  );
}
