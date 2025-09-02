export default function PlayButton({
  className,
  loading,
}: {
  className?: string;
  loading?: boolean;
}) {
  return (
    <svg
      // width="104"
      // height="104"
      className={className}
      fill="none"
      viewBox="0 0 104 104"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Play Button</title>
      <circle cx="52" cy="52" fill="white" fillOpacity="0.15" r="52" />
      <circle cx="52.0031" cy="52" fill="white" r="46.8" />
      {loading ? (
        <>
          <path
            d="M52 38V43.6"
            stroke="#333333"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
          <path
            d="M57.8828 46.1201L61.9428 42.0601"
            stroke="#333333"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
          <path
            d="M60.3984 52H65.9984"
            stroke="#333333"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
          <path
            d="M57.8828 57.88L61.9428 61.94"
            stroke="#333333"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
          <path
            d="M52 60.4V66"
            stroke="#333333"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
          <path
            d="M42.0547 61.94L46.1147 57.88"
            stroke="#333333"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
          <path
            d="M38 52H43.6"
            stroke="#333333"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
          <path
            d="M42.0547 42.0601L46.1147 46.1201"
            stroke="#333333"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
        </>
      ) : (
        <path
          d="M68.1052 49.5247C69.9711 50.6475 69.9711 53.3525 68.1052 54.4753L45.8305 67.879C43.905 69.0377 41.4521 67.6509 41.4521 65.4037L41.4521 38.5963C41.4521 36.3491 43.905 34.9623 45.8305 36.121L68.1052 49.5247Z"
          fill="#333333"
        />
      )}
    </svg>
  );
}
