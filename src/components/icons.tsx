import type { ReactNode } from 'react'

function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconHome = () => (
  <Icon>
    <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />
  </Icon>
)

export const IconDumbbell = () => (
  <Icon>
    <path d="M8 12h8M6 7v10M18 7v10M3 9.5v5M21 9.5v5" />
  </Icon>
)

export const IconRun = () => (
  <Icon>
    <circle cx="15" cy="4.5" r="1.8" />
    <path d="M6 12l3-3.5 5 .5-2.5 5 4 2.5-1 4.5M11.5 14l-1.5 3-5 1M14 9l2.5 3H20" />
  </Icon>
)

export const IconMeal = () => (
  <Icon>
    <path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M18 21v-7M18 14c-2 0-3-2-3-5.5S16.5 3 18 3z" />
  </Icon>
)

export const IconChart = () => (
  <Icon>
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </Icon>
)

export const IconSettings = () => (
  <Icon>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
)

export const IconBack = () => (
  <Icon>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
)

export const IconNext = () => (
  <Icon>
    <path d="M9 5l7 7-7 7" />
  </Icon>
)

export const IconClose = () => (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const IconPlus = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IconMinus = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
)

export const IconCheck = () => (
  <Icon>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Icon>
)

export const IconSearch = () => (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Icon>
)

export const IconBarcode = () => (
  <Icon>
    <path d="M4 6v12M7 6v12M11 6v12M14 6v12M17 6v12M20 6v12" />
  </Icon>
)

export const IconTimer = () => (
  <Icon>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9v4l2.5 2M10 2.5h4" />
  </Icon>
)

export const IconPlay = () => (
  <Icon>
    <path d="M8 5.5v13l10.5-6.5z" />
  </Icon>
)

export const IconUp = () => (
  <Icon>
    <path d="M6 15l6-6 6 6" />
  </Icon>
)

export const IconDown = () => (
  <Icon>
    <path d="M6 9l6 6 6-6" />
  </Icon>
)
