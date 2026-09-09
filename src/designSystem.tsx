import React, { useEffect, useRef } from 'react';
import { X, Loader2, Check, AlertCircle, ChevronDown } from 'lucide-react';

/**
 * REUSABLE DESIGN SYSTEM
 * Contains centralized design tokens, typography, and accessible UI primitives
 * that guarantee sound UI/UX principles and responsive adaptability across all screen sizes.
 */

export const DS = {
  colors: {
    primary: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      500: '#6366F1',
      600: '#4F46E5',
      700: '#4338CA',
    },
    slate: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
    status: {
      success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
      warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
      danger: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
      info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
      neutral: { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200', dot: 'bg-zinc-400' },
    },
  },
  typography: {
    display: 'font-extrabold tracking-tight text-zinc-900',
    heading: 'font-bold tracking-tight text-zinc-800',
    subheading: 'font-semibold text-zinc-700',
    body: 'font-normal text-zinc-600 leading-relaxed',
    caption: 'font-medium text-zinc-400 text-xs',
    eyebrow: 'font-bold uppercase tracking-wider text-[11px] text-zinc-400',
  },
  touchTarget: 'min-h-[44px] min-w-[44px]',
  focusRing: 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
} as const;

// 1. BUTTON COMPONENT
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold transition-all rounded-sm cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ' +
    DS.focusRing;

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 sm:py-1 min-h-[40px] sm:min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-[40px] gap-2',
    lg: 'text-base px-6 py-3 min-h-[48px] gap-2.5',
  }[size];

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-sm hover:shadow-blue-500/20 active:bg-blue-800',
    secondary:
      'bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs hover:shadow-sm active:bg-zinc-950',
    outline:
      'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 hover:border-zinc-300 shadow-2xs',
    ghost:
      'bg-transparent hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow-rose-500/20 active:bg-rose-800',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon && iconPosition === 'left' ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span className="truncate">{children}</span>
      {!isLoading && icon && iconPosition === 'right' ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
    </button>
  );
};

// 2. ICON BUTTON COMPONENT (Touch-friendly 44px min-target)
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: 'ghost' | 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  variant = 'ghost',
  size = 'md',
  active = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8 sm:w-8 sm:h-8 p-1.5',
    md: 'w-11 h-11 sm:w-9 sm:h-9 p-2',
    lg: 'w-12 h-12 sm:w-11 sm:h-11 p-2.5',
  }[size];

  const variantStyles = {
    ghost: active
      ? 'bg-blue-50 text-blue-600'
      : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100',
    outline: active
      ? 'bg-blue-50 text-blue-600 border border-blue-200'
      : 'border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50',
    filled: active
      ? 'bg-blue-600 text-white'
      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center rounded-sm transition-all cursor-pointer select-none active:scale-95 ${sizeStyles} ${variantStyles} ${DS.focusRing} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// 3. BADGE / PILL COMPONENT
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  const variantStyles = {
    primary: 'bg-blue-50 text-blue-700 border border-blue-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
    neutral: 'bg-zinc-100 text-zinc-700 border border-zinc-200/60',
    outline: 'bg-white text-zinc-600 border border-zinc-200',
  }[variant];

  const dotColors = {
    primary: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    neutral: 'bg-zinc-400',
    outline: 'bg-zinc-400',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-sm whitespace-nowrap select-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors}`} />}
      {children}
    </span>
  );
};

// Priority badge helper
export const PriorityBadge: React.FC<{ priority: 'low' | 'medium' | 'high' | 'urgent'; className?: string }> = ({
  priority,
  className = '',
}) => {
  switch (priority) {
    case 'urgent':
      return <Badge variant="danger" dot className={className}>Urgent</Badge>;
    case 'high':
      return <Badge variant="danger" className={className}>High</Badge>;
    case 'medium':
      return <Badge variant="warning" className={className}>Medium</Badge>;
    case 'low':
    default:
      return <Badge variant="neutral" className={className}>Low</Badge>;
  }
};

// 4. AVATAR COMPONENT
export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  online?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  title,
  online,
  className = '',
}) => {
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-lg',
  }[size];

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div
      className={`relative inline-flex shrink-0 select-none ${className}`}
      title={title || name}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeMap} rounded-full object-cover ring-2 ring-white shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeMap} rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center ring-2 ring-white shadow-2xs`}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            online ? 'bg-emerald-500' : 'bg-zinc-300'
          }`}
        />
      )}
    </div>
  );
};

// 5. INPUT COMPONENT (With Sound UI/UX touch targets and labels)
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-zinc-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3.5 text-zinc-400 pointer-events-none flex items-center">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-white border rounded-sm py-2.5 sm:py-2 text-sm text-zinc-800 placeholder:text-zinc-400 transition-all ${
            icon ? 'pl-10 pr-3.5' : 'px-3.5'
          } ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
              : 'border-zinc-200 hover:border-zinc-300 focus:border-blue-500 focus:ring-blue-100'
          } ${DS.focusRing} ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-600 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-zinc-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};

// 6. MODAL DIALOG COMPONENT (Accessible & Responsive Sheet on Mobile, Dialog on Desktop)
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-900/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-t-3xl sm:rounded-sm shadow-sm border border-zinc-200 w-full ${maxWidthClass} max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200`}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between p-5 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
            <div>
              {title && <h3 className="text-lg font-bold text-zinc-800">{title}</h3>}
              {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
            </div>
            <IconButton
              aria-label="Close dialog"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-5 h-5" />
            </IconButton>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

// 7. EMPTY STATE COMPONENT
export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-sm border-2 border-dashed border-zinc-200 bg-zinc-50/50 max-w-md mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-sm bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-2xs">
        {icon}
      </div>
      <h4 className="text-base font-bold text-zinc-800 mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-zinc-500 max-w-xs mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
