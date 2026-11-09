"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export default function PasswordInput({ className, style, ...rest }: Props) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "block", width: "100%" }}>
      <input
        {...rest}
        type={show ? "text" : "password"}
        className={className}
        style={{ ...style, width: "100%", paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: 0,
          padding: 4,
          cursor: "pointer",
          color: "#64748b",
          display: "flex",
        }}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}
