import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { className?: string };

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className = "", ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        {...rest}
        type={show ? "text" : "password"}
        className={`w-full pr-11 px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute inset-y-0 right-2 my-auto size-8 grid place-items-center rounded-full text-ink-soft hover:bg-blush-soft"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
