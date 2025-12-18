import { CheckCircle, XCircle, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm animate-in slide-in-from-top-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-[#10B981] text-white'
              : 'bg-[#EF4444] text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
