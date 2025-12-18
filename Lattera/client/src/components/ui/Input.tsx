import { InputHTMLAttributes, ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export default function Input({
  label,
  error,
  icon,
  type = 'text',
  className = '',
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]">
            {icon}
          </div>
        )}
        <input
          type={isPassword && showPassword ? 'text' : type}
          className={`w-full h-12 px-4 ${icon ? 'pl-12' : ''} ${
            isPassword ? 'pr-12' : ''
          } rounded-xl border-2 border-[#E5E7EB] focus:border-[#2290FF] focus:outline-none transition-colors bg-white text-[#1A1A1A] placeholder:text-[#6B7280] ${
            error ? 'border-[#EF4444] focus:border-[#EF4444]' : ''
          } ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-[#EF4444] animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}
