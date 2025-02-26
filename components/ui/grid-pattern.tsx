'use client';

export function GridPattern() {
  return (
    <svg
      className="absolute inset-0 h-full w-full stroke-gray-200 dark:stroke-gray-800 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="83fd4e5a-9d52-42fc-97b6-718e5d7ee527"
          width="10"
          height="10"
          x="50%"
          y="-1"
          patternUnits="userSpaceOnUse"
        >
          <path d="M.5 200V.5H200" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth="0" fill="url(#83fd4e5a-9d52-42fc-97b6-718e5d7ee527)" />
      <svg x="50%" y="-1" className="overflow-visible">
        <path
          d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
          strokeWidth="0"
        />
      </svg>
      <rect width="100%" height="100%" strokeWidth="0" fill="url(#83fd4e5a-9d52-42fc-97b6-718e5d7ee527)" />
    </svg>
  );
}