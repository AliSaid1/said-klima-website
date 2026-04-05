interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'order' | 'booking';
}

const statusColors: Record<string, string> = {
  // Bestellungen
  offen: 'bg-yellow-100 text-yellow-800',
  warten_auf_zahlung: 'bg-amber-100 text-amber-800',
  bezahlt: 'bg-blue-100 text-blue-800',
  versandt: 'bg-purple-100 text-purple-800',
  abgeschlossen: 'bg-green-100 text-green-800',
  storniert: 'bg-red-100 text-red-800',
  fehlgeschlagen: 'bg-red-100 text-red-800',
  erstattet: 'bg-slate-100 text-slate-800',
  // Buchungen
  ausstehend: 'bg-yellow-100 text-yellow-800',
  bestaetigt: 'bg-blue-100 text-blue-800',
  abgesagt: 'bg-red-100 text-red-800',
  nicht_erschienen: 'bg-slate-100 text-slate-800',
  // Produkte
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-slate-100 text-slate-800',
  hidden: 'bg-yellow-100 text-yellow-800',
  // CMS
  published: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
};

const statusLabels: Record<string, string> = {
  offen: 'Offen',
  warten_auf_zahlung: 'Warten auf Zahlung',
  bezahlt: 'Bezahlt',
  versandt: 'Versandt',
  abgeschlossen: 'Abgeschlossen',
  storniert: 'Storniert',
  fehlgeschlagen: 'Fehlgeschlagen',
  erstattet: 'Erstattet',
  ausstehend: 'Ausstehend',
  bestaetigt: 'Bestätigt',
  abgesagt: 'Abgesagt',
  nicht_erschienen: 'Nicht erschienen',
  active: 'Aktiv',
  inactive: 'Inaktiv',
  hidden: 'Ausgeblendet',
  published: 'Veröffentlicht',
  draft: 'Entwurf',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = statusColors[status] || 'bg-slate-100 text-slate-800';
  const label = statusLabels[status] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>
      {label}
    </span>
  );
}

