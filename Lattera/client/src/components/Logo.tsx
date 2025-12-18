import { MessageCircle } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizes = {
    sm: { text: 'text-xl', icon: 20 },
    md: { text: 'text-2xl', icon: 28 },
    lg: { text: 'text-4xl', icon: 36 },
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <MessageCircle
          size={sizes[size].icon}
          className="text-[#2290FF]"
          strokeWidth={2.5}
        />
        <div className="absolute top-1 right-0 w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
      </div>
      <span
        className={`${sizes[size].text} font-bold bg-gradient-to-r from-[#2290FF] to-[#0066CC] bg-clip-text text-transparent`}
      >
        Lettera
      </span>
    </div>
  );
}
