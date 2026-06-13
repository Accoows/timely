
interface AlertProps {
  type: 'error' | 'success';
  message: string;
  className?: string;
}

export default function Alert({ type, message, className = '' }: AlertProps) {
  if (type === 'error') {
    return (
      <div className={`p-4 bg-rose-50 border-2 border-rose-900 text-rose-950 text-sm font-semibold rounded-xl flex items-start gap-2.5 animate-shake ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-rose-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-emerald-50 border-2 border-emerald-900 text-emerald-950 text-sm font-semibold rounded-xl flex items-start gap-2.5 ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-emerald-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
