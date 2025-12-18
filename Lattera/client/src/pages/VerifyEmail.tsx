import { useState, useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';

interface VerifyEmailProps {
  email: string;
  onNavigate: (path: string) => void;
}

export default function VerifyEmail({ email, onNavigate }: VerifyEmailProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(59);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newCode.every((digit) => digit) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode: string) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (fullCode === '123456') {
      onNavigate('/onboarding/profile');
    } else {
      setError('Неверный код');
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();

      const inputs = document.querySelectorAll('.code-input');
      inputs.forEach((input) => {
        input.classList.add('animate-shake');
      });
      setTimeout(() => {
        inputs.forEach((input) => {
          input.classList.remove('animate-shake');
        });
      }, 500);
    }
    setLoading(false);
  };

  const handleResend = () => {
    setTimer(59);
    setCode(['', '', '', '', '', '']);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FBFF] via-white to-[#F0F9FF] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-center mb-6">
            <Logo size="md" />
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-[#2290FF] to-[#0066CC] rounded-2xl flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-700 delay-200">
            <Mail size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">
            Проверьте почту
          </h1>
          <p className="text-[#6B7280]">
            Мы отправили код на <span className="font-medium text-[#1A1A1A]">{email}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/5 p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="flex gap-3 justify-center mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                autoFocus={index === 0}
                className={`code-input w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all focus:outline-none ${
                  error
                    ? 'border-[#EF4444] focus:border-[#EF4444]'
                    : 'border-[#E5E7EB] focus:border-[#2290FF]'
                } ${digit ? 'bg-[#F0F9FF]' : 'bg-white'}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-[#EF4444] mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {error}
            </p>
          )}

          <Button
            onClick={() => code.every((d) => d) && handleVerify(code.join(''))}
            disabled={!code.every((d) => d)}
            loading={loading}
            className="w-full"
          >
            Подтвердить
          </Button>

          <div className="mt-6 text-center">
            {timer > 0 ? (
              <p className="text-[#6B7280]">
                Отправить повторно через{' '}
                <span className="font-mono font-medium text-[#1A1A1A]">
                  00:{timer.toString().padStart(2, '0')}
                </span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="text-[#2290FF] hover:underline font-medium"
              >
                Отправить код повторно
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-6">
          Не получили код? Проверьте папку "Спам"
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
