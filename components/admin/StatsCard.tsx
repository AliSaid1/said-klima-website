'use client';

/**
 * Client component module for compact admin dashboard metric cards.
 * It standardizes icon, metric, subtitle, and trend presentation for summary
 * statistics.
 */

import { ReactNode } from 'react';

interface StatsCardProps {
  /** Short metric label displayed above the value. */
  label: string;
  /** Primary metric value, already formatted when currency or units are required. */
  value: string | number;
  /** Optional explanatory text rendered below the value. */
  subtitle?: string;
  /** Icon element shown in the card's highlighted icon container. */
  icon: ReactNode;
  /** Optional trend marker with signed display text and positive/negative styling. */
  trend?: { value: string; positive: boolean };
}

/**
 * Renders an admin statistics card as a client component.
 *
 * Displays a label, prominent value, supplied icon, optional subtitle, and an
 * optional trend pill whose color reflects positive or negative movement.
 *
 * @param props - Component props.
 * @param props.label - Metric label.
 * @param props.value - Main metric value.
 * @param props.subtitle - Optional supporting text.
 * @param props.icon - Icon node rendered in the card header.
 * @param props.trend - Optional trend value and direction.
 */
export default function StatsCard({ label, value, subtitle, icon, trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              trend.positive
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {trend.value}
          </span>
        )}
        {subtitle && (
          <p className="text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
