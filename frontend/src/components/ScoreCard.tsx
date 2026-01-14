/**
 * Component to display a single dimension score
 */
import type { DimensionScore } from '../types/index';

interface Props {
  score: DimensionScore;
}

export default function ScoreCard({ score }: Props) {
  // Determine color based on score
  const getScoreColor = (value: number): string => {
    if (value >= 7) return 'text-green-600 bg-green-50';
    if (value >= 4) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-800 text-lg flex-1">
          {score.dimension}
        </h3>
        <div className={`text-3xl font-bold ml-3 px-3 py-1 rounded ${getScoreColor(score.score)}`}>
          {score.score}
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-3 leading-relaxed">
        {score.reasoning}
      </p>

      <div className="flex items-center text-xs text-gray-500">
        <span className="font-medium">Confidence:</span>
        <span className="ml-1">{getConfidenceText(score.confidence)}</span>
        <span className="ml-1">({(score.confidence * 100).toFixed(0)}%)</span>
      </div>
    </div>
  );
}
