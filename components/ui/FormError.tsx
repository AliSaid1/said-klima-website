'use client';

/**
 * Client component module for field-level form validation messages.
 * Renders accessible inline errors beneath inputs in admin and customer forms.
 */

interface FormErrorProps {
  /** The error message string — usually from react-hook-form `errors.field?.message` */
  message?: string;
  /** Additional Tailwind classes appended to the error paragraph. */
  className?: string;
}

/**
 * Inline field-level validation error shown directly below a form input.
 *
 * Renders nothing when message is empty/undefined.
 *
 * @example
 * <input {...register('artikelnummer')} ... />
 * <FormError message={errors.artikelnummer?.message} />
 *
 * @param props - Component props.
 * @param props.message - Validation message to display.
 * @param props.className - Optional additional CSS classes.
 */
export default function FormError({ message, className = '' }: FormErrorProps) {
  if (!message) return null;

  return (
    <p role="alert" className={`text-red-600 text-xs mt-1.5 flex items-start gap-1 ${className}`}>
      <span className="mt-px shrink-0" aria-hidden>⚠</span>
      <span>{message}</span>
    </p>
  );
}
