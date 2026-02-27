/**
 * Debug Console Component
 * Displays debug messages for admin users when debug mode is active
 */
import { useState } from 'react';
import { useDebug, type DebugMessage } from '../contexts/DebugContext';

export default function DebugConsole() {
  const { isDebugMode, messages, clearMessages } = useDebug();
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<DebugMessage['category'] | 'all'>('all');

  if (!isDebugMode) return null;

  const filteredMessages = filter === 'all'
    ? messages
    : messages.filter(m => m.category === filter);

  const getLevelStyles = (level: DebugMessage['level']) => {
    switch (level) {
      case 'success':
        return 'bg-green-900/50 border-green-700 text-green-300';
      case 'warning':
        return 'bg-yellow-900/50 border-yellow-700 text-yellow-300';
      case 'error':
        return 'bg-red-900/50 border-red-700 text-red-300';
      default:
        return 'bg-gray-800/50 border-gray-700 text-gray-300';
    }
  };

  const getLevelIcon = (level: DebugMessage['level']) => {
    switch (level) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getCategoryColor = (category: DebugMessage['category']) => {
    switch (category) {
      case 'extraction':
        return 'bg-blue-600';
      case 'compression':
        return 'bg-purple-600';
      case 'database':
        return 'bg-green-600';
      case 'llm':
        return 'bg-orange-600';
      case 'sse':
        return 'bg-cyan-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-200">Debug Console</span>
          <span className="px-1.5 py-0.5 text-xs bg-gray-700 rounded text-gray-400">
            {filteredMessages.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            title="Clear messages"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filters */}
          <div className="flex gap-1 px-2 py-1.5 bg-gray-850 border-b border-gray-700 overflow-x-auto">
            {(['all', 'extraction', 'compression', 'database', 'llm', 'sse'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors ${
                  filter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No debug messages yet
              </div>
            ) : (
              [...filteredMessages].reverse().map((msg) => (
                <div
                  key={msg.id}
                  className={`px-2 py-1.5 rounded border text-xs ${getLevelStyles(msg.level)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0">{getLevelIcon(msg.level)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`px-1 py-0.5 rounded text-[10px] font-medium text-white ${getCategoryColor(msg.category)}`}>
                          {msg.category.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {msg.source === 'backend' ? '🖥️' : '🌐'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="break-words">{msg.message}</div>
                      {msg.details && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
                            Details
                          </summary>
                          <pre className="mt-1 p-1 bg-black/30 rounded text-[10px] overflow-x-auto">
                            {JSON.stringify(msg.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
