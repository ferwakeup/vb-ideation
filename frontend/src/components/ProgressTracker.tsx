/**
 * Progress Tracker Component
 * Displays real-time progress through the 5-agent scoring pipeline
 * using a circular SVG progress indicator
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProgressEvent } from '../types/index';

interface ProgressTrackerProps {
  progress: ProgressEvent | null;
}

export default function ProgressTracker({ progress }: ProgressTrackerProps) {
  const { t } = useTranslation('scorer');
  const [displayProgress, setDisplayProgress] = useState<ProgressEvent | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [extractionSkipped, setExtractionSkipped] = useState(false);
  const [skippedMessage, setSkippedMessage] = useState<string | null>(null);

  // Smooth transition when progress updates
  useEffect(() => {
    if (progress) {
      setDisplayProgress(progress);

      // Check if extraction was skipped
      if (progress.step === 1 && progress.status === 'skipped') {
        setExtractionSkipped(true);
        setSkippedMessage((progress as ProgressEvent & { message?: string }).message || t('progress.extractionSkipped'));
      }

      if (progress.status === 'completed') {
        setIsCompleting(true);
        const timer = setTimeout(() => setIsCompleting(false), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [progress, t]);

  // Calculate progress percentage
  const totalSteps = displayProgress?.total_steps || 17;
  const currentStep = displayProgress?.step || 0;
  const percentage = (currentStep / totalSteps) * 100;

  // SVG circle parameters
  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Get agent number from agent string (e.g., "Agent 3" -> 3)
  const agentNumber = displayProgress?.agent?.match(/\d+/)?.[0] || '1';

  // Get color based on agent
  const getAgentColor = (agent: string): string => {
    const num = parseInt(agent.match(/\d+/)?.[0] || '1');
    const colors: Record<number, string> = {
      1: '#3B82F6', // blue
      2: '#8B5CF6', // purple
      3: '#10B981', // green
      4: '#F59E0B', // amber
      5: '#EF4444', // red
    };
    return colors[num] || '#3B82F6';
  };

  const agentColor = getAgentColor(displayProgress?.agent || 'Agent 1');

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Skipped extraction banner */}
      {extractionSkipped && skippedMessage && (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{skippedMessage}</span>
        </div>
      )}

      {/* Circular Progress */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={agentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-500 ease-out ${
              isCompleting ? 'opacity-80' : ''
            }`}
            style={{
              filter: isCompleting ? 'drop-shadow(0 0 8px currentColor)' : 'none'
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Agent number */}
          <div
            className="text-5xl font-bold transition-colors duration-300"
            style={{ color: agentColor }}
          >
            {agentNumber}
          </div>
          {/* Agent name */}
          <div className="text-sm text-gray-500 font-medium mt-1">
            {displayProgress?.agent || t('progress.starting')}
          </div>
        </div>
      </div>

      {/* Step title */}
      <div className="mt-6 text-center">
        <h3 className="text-lg font-semibold text-gray-800">
          {displayProgress?.title || t('progress.initializing')}
        </h3>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          {displayProgress?.description || t('progress.preparing')}
        </p>
      </div>

      {/* Step counter */}
      <div className="mt-4 text-sm text-gray-400">
        {t('progress.stepOf', { current: currentStep, total: totalSteps })}
      </div>

      {/* Progress bar (alternative linear view) */}
      <div className="w-full max-w-md mt-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: agentColor
            }}
          />
        </div>
      </div>

      {/* Agent stages indicator */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {[1, 2, 3, 4, 5].map((num) => {
          const isActive = parseInt(agentNumber) === num;
          const isCompleted = parseInt(agentNumber) > num;
          const isSkipped = num === 1 && extractionSkipped;
          const agentColors: Record<number, string> = {
            1: '#3B82F6',
            2: '#8B5CF6',
            3: '#10B981',
            4: '#F59E0B',
            5: '#EF4444',
          };

          return (
            <div
              key={num}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? 'scale-110 shadow-lg'
                  : isCompleted || isSkipped
                  ? 'opacity-60'
                  : 'opacity-30'
              }`}
              style={{
                backgroundColor: isActive || isCompleted || isSkipped ? agentColors[num] : '#E5E7EB',
                color: isActive || isCompleted || isSkipped ? 'white' : '#9CA3AF'
              }}
            >
              {isSkipped ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              ) : isCompleted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                num
              )}
            </div>
          );
        })}
      </div>

      {/* Agent labels */}
      <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-400">
        <span className="w-8 text-center">{t('progress.agents.extract')}</span>
        <span className="w-8 text-center">{t('progress.agents.ideas')}</span>
        <span className="w-8 text-center">{t('progress.agents.eval')}</span>
        <span className="w-8 text-center">{t('progress.agents.synth')}</span>
        <span className="w-8 text-center">{t('progress.agents.final')}</span>
      </div>
    </div>
  );
}
