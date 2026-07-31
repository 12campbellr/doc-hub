export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="9" fill="#0f1f30" stroke="#17b8ac" strokeWidth="1.5" />
      <path
        d="M13 10.5h9.5L27 15v14.5a1 1 0 0 1-1 1H13a1 1 0 0 1-1-1v-18a1 1 0 0 1 1-1Z"
        fill="#f8fafc"
        opacity="0.95"
      />
      <path d="M22.5 10.5 27 15h-3.5a1 1 0 0 1-1-1v-3.5Z" fill="#cbd5e1" />
      <rect x="14.5" y="18" width="9" height="1.4" rx="0.7" fill="#17b8ac" />
      <rect x="14.5" y="21.5" width="9" height="1.4" rx="0.7" fill="#94a3b8" />
      <rect x="14.5" y="25" width="6" height="1.4" rx="0.7" fill="#94a3b8" />
    </svg>
  );
}
