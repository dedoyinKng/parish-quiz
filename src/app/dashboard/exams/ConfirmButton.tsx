"use client";

export default function ConfirmButton({
  action,
  label,
  confirmText,
  danger,
}: {
  action: () => Promise<void>;
  label: string;
  confirmText: string;
  danger?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="btn-ghost"
        style={danger ? { color: "#dc2626" } : undefined}
      >
        {label}
      </button>
    </form>
  );
}
