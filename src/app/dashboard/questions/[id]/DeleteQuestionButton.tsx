"use client";

export default function DeleteQuestionButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this question? This cannot be undone.")) e.preventDefault();
      }}
      style={{ marginBottom: "2rem" }}
    >
      <button type="submit" className="btn-ghost" style={{ color: "#dc2626" }}>
        Delete this question
      </button>
    </form>
  );
}