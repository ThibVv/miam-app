import type { SVGProps } from "react";

function Icon({ children, size = 22, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CalendarIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
);
export const BookIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h11" />
  </Icon>
);
export const DiceIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1" />
    <circle cx="15" cy="15" r="1" />
    <circle cx="15" cy="9" r="1" />
    <circle cx="9" cy="15" r="1" />
  </Icon>
);
export const CartIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="17" cy="19" r="1.5" />
  </Icon>
);
export const PotIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
    <path d="M2 10h2M20 10h2M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2" />
  </Icon>
);
export const ChevronRight = (p: { size?: number }) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
export const ChevronLeft = (p: { size?: number }) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);
export const SwapIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
  </Icon>
);
export const PlusIcon = (p: { size?: number }) => (
  <Icon {...p} strokeWidth={2.2}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const LinkIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </Icon>
);
export const TrashIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
);
export const SearchIcon = (p: { size?: number }) => (
  <Icon {...p} strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Icon>
);
