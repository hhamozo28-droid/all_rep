import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: 20,
  height: 20,
  ...props,
});

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 19h16" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconLayers = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

export const IconBook = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
    <path d="M4 19a2 2 0 0 1 2-2h13" />
  </svg>
);

export const IconFile = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" />
    <path d="M14 3v5h5" />
  </svg>
);

export const IconDisk = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 12a9 9 0 1 1-9-9" />
    <path d="M12 12 6 6" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChevron = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconHome = (p: P) => (
  <svg {...base(p)}>
    <path d="m3 10 9-7 9 7" />
    <path d="M5 9v11h14V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

export const IconGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
  </svg>
);

export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const IconLogout = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
    <path d="m17 8 4 4-4 4" />
    <path d="M21 12H10" />
  </svg>
);

export const IconX = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 4V8a1 1 0 0 1-1 1h-4" />
    <path d="M3 3v5h5" />
    <path d="M10 14a8 8 0 0 1 6.36-2.36M9 14a8 8 0 0 0-6.36 2.36L3 14" />
    <path d="m3 16 4.6-4.6" />
    <path d="M21 22l-3.6-3.6" />
  </svg>
);

export const IconLink = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5.38 5.38 0 0 0-7.62-7.62l-3 3a5.38 5.38 0 0 0-.46 7.66l4.34 4.36a5.38 5.38 0 0 0 7.62-7.62l-3 3a5.25 5.25 0 0 1-3.4 1.42Z" />
    <path d="m16 3 4 4" />
    <path d="M3 16l4-4" />
  </svg>
);

export const IconCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 5.5v3c0 1.3.7 2.3 1.7 2.9l1.7 1.1a4 4 0 0 0 4.4-.9l1.8-1.6 1.6-1.8a4.1 4.1 0 0 0-.9-4.5l-1.2-1.2a4 4 0 0 0-6.3 1.7l-.9 2.5c.4.6.6 1.4.4 2.2Z" />
    <path d="m5 12 8 8 14-14" />
  </svg>
);

export const IconUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v10" />
    <path d="m7 7 5-5 5 5" />
    <path d="M5 21h14" />
  </svg>
);

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h18" />
    <path d="M19 6v2H5V6" />
    <path d="M8 6V4h8v2" />
    <path d="m10 11 2 10h-6L10 11" />
  </svg>
);

export const IconSparkle = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 6.6l1.65-1.65a3 3 0 0 1 4.24 0L8 6.4m6.3 1.07a3 3 0 0 0 0-4.24l-1.65-1.65a1.85 1.85 0 0 0-2.6 0l-1.35 1.35" />
    <path d="M22 12.5h-2.3a1.8 1.8 0 0 1-1.7-1.3l-.5-1.8a1.8 1.8 0 0 0-1.7-1.3H12.5l-.8 2.1a1.8 1.8 0 0 1-1.3 1.7l-1.8.5a1.8 1.8 0 0 1-1.3 1.7L2.3 15" />
    <path d="m2 21 3.5-3.5M16.5 16.5 20 13m-8.5-6.5v3M10 13v3" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M10.3 2.6a2.03 2.03 0 0 1 3.4 0l8.2 8.4a1.3 1.3 0 0 1-.5 2.1l-3.6 1.5a1.5 1.5 0 0 1-.8 0l-1.8-1.9a1.5 1.5 0 0 0-1.3-.5h-1.2a1.5 1.5 0 0 0-1.3.5L7.2 19a1.3 1.3 0 0 1-1.7-.2L1.6 13.7a1.3 1.3 0 0 1 .3-2.2Z" />
    <path d="M10.3 2.6a2.03 2.03 0 0 1 3.4 0l8.2 8.4a1.3 1.3 0 0 1-.5 2.1L13.4 19l-3.6 1.5a1.5 1.5 0 0 1-.8 0l-1.8-1.9a1.5 1.5 0 0 0-1.3-.5h-1.2a1.5 1.5 0 0 0-1.3.5L7.2 19a1.3 1.3 0 0 1-1.7-.2L1.6 13.7a1.3 1.3 0 0 1 .3-2.2Z" />
  </svg>
);

export const IconMail = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    <path d="M22 7l-10 9L2 7" />
  </svg>
);

export const IconTag = (p: P) => (
  <svg {...base(p)}>
    <path d="M12.586 2a2 2 0 0 0-1.414.586L2 9.172V14h4.828l7.586-7.586A2 2 0 0 0 12.586 2Z" />
    <path d="M7.5 2.5a2.5 2.5 0 0 1 2.5-2.5h6.11a1.5 1.5 0 0 1 1.06.439l3 3a1.5 1.5 0 0 1 .439 1.06V10a2.5 2.5 0 0 1-2.5 2.5H10" />
    <path d="M7 22v-7.3A2.5 2.5 0 0 1 9.5 12h7" />
  </svg>
);

export const IconCloudDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5a6 6 0 0 1 5.5 4h-1.67a5 5 0 0 0-4.83 3.4l-.33 1.1H8a5.5 5.5 0 0 0 0 11h3" />
    <path d="M12 17v-5" />
    <path d="M9.7 15l2.15 2.15L13.7 15" />
  </svg>
);

export const IconSpinner = (p: P) => (
  <svg {...base(p)} className={`animate-spin ${p.className ?? ""}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

/** Small chevron used to guide attention toward the specialty detail page. */
export const IconChevronRight = (p: P) => (
  <svg {...base(p)} strokeWidth={2.5}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

/** Small filled dot shape used as an extra decorative cue on the login page. */
export const IconDot = (p: P) => (
  <svg {...base(p)} fill="currentColor">
    <circle cx="12" cy="12" r="3" />
  </svg>
);
