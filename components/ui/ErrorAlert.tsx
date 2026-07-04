'use client';

/**
 * Client component module for reusable alert messaging.
 * Provides severity-based page or section feedback with optional dismissal.
 */

import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

/** Supported visual and semantic alert severities. */
type Severity = 'error' | 'warning' | 'info' | 'success';

interface ErrorAlertProps {
  /** Message body; when empty, the component renders nothing. */
  message: string | null | undefined;
  /** Alert severity controlling icon and color palette. */
  severity?: Severity;
  /** Optional bold title shown above the message body. */
  title?: string;
  /** Optional dismiss callback that displays a close button when provided. */
  onClose?: () => void;
  /** Additional Tailwind classes appended to the alert container. */
  className?: string;
}

const CONFIG: Record<Severity, {
  bg: string; border: string; text: string; titleColor: string;
  Icon: React.ElementType;
}> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    titleColor: 'text-red-800',
    Icon: XCircle,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    titleColor: 'text-amber-800',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    titleColor: 'text-blue-800',
    Icon: Info,
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    titleColor: 'text-emerald-800',
    Icon: CheckCircle,
  },
};

/**
 * Box-style alert component for page-level or section-level feedback.
 *
 * Use for: checkout errors, payment failures, form submission errors,
 * server errors on admin pages.
 *
 * @example
 * <ErrorAlert message={serverError} severity="error" onClose={() => setError(null)} />
 *
 * @param props - Component props.
 * @param props.message - Message body to display.
 * @param props.severity - Severity controlling icon and colors.
 * @param props.title - Optional title text.
 * @param props.onClose - Optional dismiss handler.
 * @param props.className - Optional additional CSS classes.
 */
export default function ErrorAlert({
  message,
  severity = 'error',
  title,
  onClose,
  className = '',
}: ErrorAlertProps) {
  if (!message) return null;

  const { bg, border, text, titleColor, Icon } = CONFIG[severity];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border ${bg} ${border} ${text} text-sm ${className}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        {title && <p className={`font-semibold mb-0.5 ${titleColor}`}>{title}</p>}
        <p>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Fehler schließen"
          className={`shrink-0 p-0.5 rounded-lg hover:bg-black/10 transition-colors ${text}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
