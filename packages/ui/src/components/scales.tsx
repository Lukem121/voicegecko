import { cn } from '../lib/utils';

export default function Scales({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern
          className={cn(className)}
          id="a"
          patternTransform="rotate(55)scale(1)"
          patternUnits="userSpaceOnUse"
        >
          <rect fill="#262428" height="100%" width="100%" />
          <path
            d="M-10-10A10 10 0 0 0-20 0a10 10 0 0 0 10 10A10 10 0 0 1 0 0a10 10 0 0 0-10-10zm20 0A10 10 0 0 0 0 0a10 10 0 0 1 10 10A10 10 0 0 1 20 0a10 10 0 0 0-10-10zm20 0A10 10 0 0 0 20 0a10 10 0 0 1 10 10A10 10 0 0 1 40 0a10 10 0 0 0-10-10zm-40 20a10 10 0 0 0-10 10 10 10 0 0 0 10 10A10 10 0 0 1 0 20a10 10 0 0 0-10-10zm20 0A10 10 0 0 0 0 20a10 10 0 0 1 10 10 10 10 0 0 1 10-10 10 10 0 0 0-10-10zm20 0a10 10 0 0 0-10 10 10 10 0 0 1 10 10 10 10 0 0 1 10-10 10 10 0 0 0-10-10z"
            fill="none"
            stroke="#6d9c49"
            stroke-width=".5"
          />
        </pattern>
      </defs>
      <rect
        fill="url(#a)"
        height="800%"
        transform="translate(0 -8)"
        width="800%"
      />
    </svg>
  );
}

{
  /* <div
className="absolute inset-0 overflow-hidden rounded-full opacity-10"
style={{
  backgroundImage: `url("data:image/svg+xml,<svg id='patternId' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='a' patternUnits='userSpaceOnUse' width='20' height='20' patternTransform='rotate(55)'><rect x='0' y='0' width='100%' height='100%' fill='%23272529ff'/><path d='M-10-10A10 10 0 00-20 0a10 10 0 0010 10A10 10 0 010 0a10 10 0 00-10-10zM10-10A10 10 0 000 0a10 10 0 0110 10A10 10 0 0120 0a10 10 0 00-10-10zM30-10A10 10 0 0020 0a10 10 0 0110 10A10 10 0 0140 0a10 10 0 00-10-10zM-10 10a10 10 0 00-10 10 10 10 0 0010 10A10 10 0 010 20a10 10 0 00-10-10zM10 10A10 10 0 000 20a10 10 0 0110 10 10 10 0 0110-10 10 10 0 00-10-10zM30 10a10 10 0 00-10 10 10 10 0 0110 10 10 10 0 0110-10 10 10 0 00-10-10z'  stroke-width='0.5' stroke='%236e9c4aff' fill='none'/></pattern></defs><rect width='800%' height='800%' transform='translate(0,-2)' fill='url(%23a)'/></svg>")`,
}}
/> */
}
