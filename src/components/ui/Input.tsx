import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  leftAdornment?: ReactNode
  rightAdornment?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helperText,
    error,
    leftAdornment,
    rightAdornment,
    id,
    className = '',
    ...props
  },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const hasError = Boolean(error)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-700"
        >
          {label}
          {props.required && (
            <span className="text-danger ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {leftAdornment && (
          <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
            {leftAdornment}
          </div>
        )}

        <input
          id={inputId}
          ref={ref}
          className={[
            'w-full rounded-lg border bg-white text-slate-800 text-sm',
            'placeholder:text-slate-400',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            hasError
              ? 'border-danger focus:ring-danger/30 focus:border-danger'
              : 'border-slate-200 hover:border-slate-300',
            leftAdornment ? 'pl-10' : 'pl-3.5',
            rightAdornment ? 'pr-10' : 'pr-3.5',
            'py-2.5',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={hasError}
          aria-describedby={
            hasError
              ? `${inputId}-error`
              : helperText
              ? `${inputId}-helper`
              : undefined
          }
          {...props}
        />

        {rightAdornment && (
          <div className="absolute right-3 flex items-center text-slate-400">
            {rightAdornment}
          </div>
        )}
      </div>

      {hasError ? (
        <p
          id={`${inputId}-error`}
          className="text-xs text-danger flex items-center gap-1"
          role="alert"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5 shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  )
})
