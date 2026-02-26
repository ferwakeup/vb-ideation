/**
 * Language Selector Component
 * Dropdown for switching between English and Spanish with world icon and flags
 */
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  variant?: 'light' | 'dark';
  compact?: boolean;
}

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function LanguageSelector({ variant = 'dark', compact = false }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  const buttonClasses = variant === 'dark'
    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50';

  const dropdownClasses = variant === 'dark'
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-300 shadow-lg';

  const optionClasses = variant === 'dark'
    ? 'hover:bg-gray-700 text-gray-300'
    : 'hover:bg-gray-100 text-gray-700';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} ${buttonClasses} border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        {/* World Icon */}
        <svg
          className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${variant === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        {/* Current Flag */}
        <span className={compact ? 'text-base' : 'text-lg'}>{currentLang.flag}</span>

        {/* Dropdown Arrow */}
        <svg
          className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} ${variant === 'dark' ? 'text-gray-400' : 'text-gray-500'} transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 ${compact ? 'w-32' : 'w-40'} ${dropdownClasses} border rounded-lg overflow-hidden z-50`}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-3 ${compact ? 'px-3 py-2' : 'px-4 py-2.5'} ${optionClasses} transition-colors ${
                lang.code === currentLang.code ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              <span className={compact ? 'text-base' : 'text-lg'}>{lang.flag}</span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>{lang.label}</span>
              {lang.code === currentLang.code && (
                <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
