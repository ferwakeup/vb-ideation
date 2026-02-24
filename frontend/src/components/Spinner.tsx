/**
 * Spinner Component
 * Reusable loading spinner with customizable size
 */

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-white/30 border-t-white rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
