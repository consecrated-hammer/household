const iconBase = "h-5 w-5";
const materialBase = "material-symbols-outlined text-[20px] leading-none";

const MaterialIcon = (name, className = materialBase) => (
  <span className={className} aria-hidden="true">
    {name}
  </span>
);

export const icons = {
  household: (
    <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
      <path
        fill="currentColor"
        d="M21 7H3V5h18v2zm0 2H3v10h18V9zM7 15h6v2H7v-2zm9-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
      />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 13h7v7H4v-7zm9-9h7v7h-7V4zM4 4h7v7H4V4zm9 9h7v7h-7v-7z"
      />
    </svg>
  ),
  income: MaterialIcon("attach_money"),
  expenses: MaterialIcon("credit_card"),
  allocations: (
    <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
      <path
        fill="currentColor"
        d="M11 2a10 10 0 1 0 10 10h-9V2zm2 0v9h9A10 10 0 0 0 13 2z"
      />
    </svg>
  ),
  settings: MaterialIcon("settings"),
  calculator: (
    <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v4h10V4H7zm0 6v8h10v-8H7zm2 2h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z"
      />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 2h8l4 4v16H6V2zm8 1.5V8h4.5L14 3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2zm0-8h5v2H8V8z"
      />
    </svg>
  ),
  theme: (
    <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 4a8 8 0 1 0 8 8c0-.6-.1-1.1-.2-1.7a6.5 6.5 0 0 1-7.8-7.8A8 8 0 0 0 12 4z"
      />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-4h2v3h-2V3zm0 18h2v-3h-2v3zm9-9h-3v2h3v-2zM6 12H3v2h3v-2zm12.4-6.4l-2.1 2.1 1.4 1.4 2.1-2.1-1.4-1.4zM6.3 17.7l-2.1 2.1 1.4 1.4 2.1-2.1-1.4-1.4zM19.8 19.1l-2.1-2.1-1.4 1.4 2.1 2.1 1.4-1.4zM7.7 7.7L5.6 5.6 4.2 7l2.1 2.1 1.4-1.4z"
      />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.1 14.7A8 8 0 0 1 9.3 3.9a8.5 8.5 0 1 0 10.8 10.8z"
      />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 4h8v16h-8v-2h6V6h-6V4zm-1.4 4.6L12 12l-3.4 3.4-1.4-1.4L9.4 13H4v-2h5.4l-2.2-2.2 1.4-1.4z"
      />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4 9 6z" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M6 9l6 6 6-6 1.4 1.4L12 17.8 4.6 10.4 6 9z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M11 5h2v14h-2zM5 11h14v2H5z" />
    </svg>
  ),
  collapse: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="m15.4 7.4-1.4-1.4-6 6 6 6 1.4-1.4L10.8 12z"
      />
    </svg>
  ),
  expand: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="m8.6 7.4 1.4-1.4 6 6-6 6-1.4-1.4L13.2 12z"
      />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.2V21h3.8l11-11-3.8-3.8-11 11zM20.7 7.1a1 1 0 0 0 0-1.4L18.3 3.3a1 1 0 0 0-1.4 0l-1.6 1.6 3.8 3.8 1.6-1.6z"
      />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 7a1.2 1.2 0 1 1 0-2.4A1.2 1.2 0 0 1 12 9zm1.2 8H10.8v-6h2.4v6z"
      />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5h16l-6.5 7.5V20l-3-1.5v-6L4 5z"
      />
    </svg>
  ),
  columns: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M4 5h5v14H4V5zm6 0h4v14h-4V5zm5 0h5v14h-5V5z" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
  ),
  sort: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
      <path fill="currentColor" d="M7 14l5 5 5-5H7zm0-4h10L12 5l-5 5z" />
    </svg>
  ),
  sortUp: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
      <path fill="currentColor" d="M7 14l5-5 5 5H7z" />
    </svg>
  ),
  sortDown: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
      <path fill="currentColor" d="M7 10l5 5 5-5H7z" />
    </svg>
  ),
  drag: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M9 4h2v2H9V4zm4 0h2v2h-2V4zM9 9h2v2H9V9zm4 0h2v2h-2V9zM9 14h2v2H9v-2zm4 0h2v2h-2v-2zM9 19h2v2H9v-2zm4 0h2v2h-2v-2z" />
    </svg>
  )
};
