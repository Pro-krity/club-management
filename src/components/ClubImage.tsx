import { Building2 } from 'lucide-react';
import { useState } from 'react';

interface ClubImageProps {
  src: string | null | undefined;
  alt: string;
  code: string;
  className?: string;
}

export function ClubImage({ src, alt, code, className = '' }: ClubImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 ${className}`}
      >
        <Building2 className="h-7 w-7 text-slate-400" />
        <span className="mt-1.5 font-mono text-xs font-medium tracking-wider text-slate-600">{code}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
