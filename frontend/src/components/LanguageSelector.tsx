/**
 * Language Selector Component
 * Dropdown for switching between English and Spanish
 */
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  variant?: 'light' | 'dark';
  compact?: boolean;
}

const languages = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'es', label: 'Espanol', flag: 'ES' },
];

export default function LanguageSelector({ variant = 'dark', compact = false }: LanguageSelectorProps) {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  const baseClasses = compact
    ? 'px-2 py-1 text-xs rounded'
    : 'px-3 py-1.5 text-sm rounded-lg';

  const variantClasses = variant === 'dark'
    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 focus:ring-blue-500'
    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500';

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      className={`${baseClasses} ${variantClasses} border cursor-pointer focus:outline-none focus:ring-2 transition-colors`}
      aria-label="Select language"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {compact ? lang.flag : `${lang.flag} ${lang.label}`}
        </option>
      ))}
    </select>
  );
}
