import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="confirm-action-modal"
        className="bg-white rounded-sm border border-zinc-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-sm flex items-center justify-center shrink-0 ${
                isDestructive
                  ? 'bg-rose-50 text-rose-600 border border-rose-100'
                  : 'bg-blue-50 text-blue-600 border border-blue-100'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-zinc-900 leading-snug">{title}</h3>
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{message}</p>
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-zinc-400 hover:text-zinc-600 p-1 rounded-sm hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-sm text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                await onConfirm();
              }}
              className={`px-5 py-2.5 rounded-sm text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 text-white ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {isLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
