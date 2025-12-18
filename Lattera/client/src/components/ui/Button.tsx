import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'h-12 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2';

  const variantClasses = {
    primary:
      'bg-[#2290FF] text-white hover:bg-[#1a7ae6] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20',
    secondary:
      'bg-white text-[#1A1A1A] border-2 border-[#E5E7EB] hover:bg-[#F3F4F6] active:scale-95',
    ghost: 'text-[#2290FF] hover:bg-[#F0F9FF] active:scale-95',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Загрузка...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
