import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 shadow-sm cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-neutral-900 hover:bg-neutral-800 text-white border border-transparent',
    secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent',
    outline: 'bg-transparent border border-neutral-200 hover:border-neutral-900 text-neutral-800',
    ghost: 'bg-transparent hover:bg-neutral-50 text-neutral-700 border border-transparent shadow-none',
  };

  const widthStyle = fullWidth ? 'w-full' : '';
  const paddingStyle = variant === 'ghost' ? 'px-3 py-2 text-sm' : 'px-6 py-3 text-sm md:text-base';

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${paddingStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="loading loading-spinner loading-sm mr-2"></span>
      ) : null}
      {children}
    </button>
  );
}
