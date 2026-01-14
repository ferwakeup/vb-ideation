/**
 * Radar chart visualization of dimension scores
 */
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import type { DimensionScore } from '../types/index';

interface Props {
  scores: DimensionScore[];
}

export default function ScoreChart({ scores }: Props) {
  // Transform data for the chart
  const chartData = scores.map(s => ({
    dimension: shortenDimensionName(s.dimension),
    score: s.score,
    fullName: s.dimension
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        Dimension Scores Visualization
      </h3>
      <ResponsiveContainer width="100%" height={450}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="#d1d5db" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#4b5563', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.6}
          />
          <Tooltip
            content={({ payload }) => {
              if (payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-800">{data.fullName}</p>
                    <p className="text-blue-600">Score: {data.score}/10</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Shorten long dimension names for the chart
 */
function shortenDimensionName(name: string): string {
  const words = name.split(' ');
  if (words.length <= 3) return name;

  // Take first 3 words for readability
  return words.slice(0, 3).join(' ') + '...';
}
