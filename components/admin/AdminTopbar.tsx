'use client';

import { memo } from 'react';
import { Menu } from 'lucide-react';

interface AdminTopbarProps {
  onMenuClick: () => void;
  title?: string;
  userEmail?: string;
}

function AdminTopbar({ onMenuClick, title, userEmail }: AdminTopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-600 hover:text-slate-900 p-1"
        >
          <Menu className="w-6 h-6" />
        </button>
        {title && (
          <h1 className="text-lg font-outfit font-bold text-slate-900 hidden sm:block">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {userEmail && (
          <span className="text-sm text-slate-500 hidden sm:block">{userEmail}</span>
        )}
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">
            {userEmail ? userEmail[0].toUpperCase() : 'A'}
          </span>
        </div>
      </div>
    </header>
  );
}

export default memo(AdminTopbar);
