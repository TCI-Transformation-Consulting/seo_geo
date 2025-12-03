import React from 'react';

interface StickyInputsProps {
  title?: string;
  right?: React.ReactNode; // actions (Run buttons, etc.)
  children: React.ReactNode; // form inputs
  className?: string;
}

export const StickyInputs: React.FC<StickyInputsProps> = ({ title, right, children, className = '' }) => {
  return (
    <div className={`sticky top-0 z-20 bg-neuro-900/85 backdrop-blur border border-neuro-800 rounded-xl p-4 mb-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {title ? (
            <div className="text-xs font-bold text-slate-400 mb-2">{title}</div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {children}
          </div>
        </div>
        {right ? (
          <div className="shrink-0 flex items-center gap-2">{right}</div>
        ) : null}
      </div>
    </div>
  );
};
