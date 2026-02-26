/**
 * Password Strength Indicator Component
 * Shows a colored bar indicating password strength
 */
import { useTranslation } from 'react-i18next';

interface PasswordStrengthProps {
  password: string;
}

type StrengthLevel = 'weak' | 'fair' | 'strong';

interface StrengthResult {
  level: StrengthLevel;
  score: number;
}

function calculateStrength(password: string): StrengthResult {
  if (!password) {
    return { level: 'weak', score: 0 };
  }

  let score = 0;

  // Length checks
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1; // lowercase
  if (/[A-Z]/.test(password)) score += 1; // uppercase
  if (/[0-9]/.test(password)) score += 1; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special characters

  // Determine level based on score
  let level: StrengthLevel;

  if (score <= 2) {
    level = 'weak';
  } else if (score <= 4) {
    level = 'fair';
  } else {
    level = 'strong';
  }

  return { level, score: Math.min(score, 7) };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useTranslation('auth');
  const { level, score } = calculateStrength(password);

  if (!password) {
    return null;
  }

  const colorClasses = {
    weak: 'bg-red-500',
    fair: 'bg-orange-500',
    strong: 'bg-green-500',
  };

  const textClasses = {
    weak: 'text-red-400',
    fair: 'text-orange-400',
    strong: 'text-green-400',
  };

  const labels = {
    weak: t('passwordStrength.weak'),
    fair: t('passwordStrength.fair'),
    strong: t('passwordStrength.strong'),
  };

  // Calculate width percentage (max score is 7)
  const widthPercent = (score / 7) * 100;

  return (
    <div className="mt-2">
      {/* Progress bar */}
      <div className="h-1.5 w-full bg-gray-600 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[level]} transition-all duration-300 ease-out`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      {/* Label */}
      <p className={`text-xs mt-1 ${textClasses[level]}`}>
        {labels[level]}
      </p>
    </div>
  );
}
