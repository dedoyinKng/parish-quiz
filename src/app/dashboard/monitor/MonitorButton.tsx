"use client";

export default function MonitorButton({
  label,
  confirmText,
  className = "mon-btn",
}: {
  label: string;
  confirmText?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
