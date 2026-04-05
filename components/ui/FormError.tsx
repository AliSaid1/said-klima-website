'use client';

interface FormErrorProps {
  /** The error message string — usually from react-hook-form `errors.field?.message` */
  message?: string;
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

