/**
 * Debug Panel Component
 * Shows detailed agent architecture, timing, model info, and data flow visualization
 */
import { useState } from 'react';
import type {
  AgentArchitecture,
  ProgressEvent,
  ModelInfo,
  StepInfo
} from '../types/index';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  architecture: AgentArchitecture | null;
  steps: StepInfo[];
  modelInfo: ModelInfo | null;
  currentProgress: ProgressEvent | null;
  completedSteps: Record<number, { duration: number; status: string }>;
}

export default function DebugPanel({
  isOpen,
  onClose,
  architecture,
  steps,
  modelInfo,
  currentProgress,
  completedSteps
}: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'architecture' | 'timing' | 'flow'>('architecture');

  if (!isOpen) return null;

  const tabs = [
    { id: 'architecture', label: 'Architecture', icon: '🏗️' },
    { id: 'timing', label: 'Timing', icon: '⏱️' },
    { id: 'flow', label: 'Data Flow', icon: '🔄' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Debug Panel</h2>
              <p className="text-sm text-gray-500">Multi-Agent System Inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Model Info Bar */}
        {modelInfo && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Provider:</span>
              <span className="font-semibold text-gray-800">{modelInfo.provider}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Model:</span>
              <span className="font-semibold text-gray-800">{modelInfo.model}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Deployment:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                modelInfo.deployment === 'local'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {modelInfo.deployment === 'local' ? '🖥️ Local' : '☁️ Cloud'}
              </span>
            </div>
            {currentProgress?.timing && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-gray-500">Total Time:</span>
                <span className="font-mono font-semibold text-blue-600">
                  {currentProgress.timing.total_elapsed_seconds.toFixed(1)}s
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'architecture' && (
            <ArchitectureView
              architecture={architecture}
              currentProgress={currentProgress}
              completedSteps={completedSteps}
            />
          )}
          {activeTab === 'timing' && (
            <TimingView
              steps={steps}
              completedSteps={completedSteps}
              currentProgress={currentProgress}
            />
          )}
          {activeTab === 'flow' && (
            <FlowView
              architecture={architecture}
              currentProgress={currentProgress}
              completedSteps={completedSteps}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Architecture View Component
function ArchitectureView({
  architecture,
  currentProgress,
  completedSteps
}: {
  architecture: AgentArchitecture | null;
  currentProgress: ProgressEvent | null;
  completedSteps: Record<number, { duration: number; status: string }>;
}) {
  if (!architecture) {
    return (
      <div className="text-center text-gray-500 py-8">
        Waiting for architecture data...
      </div>
    );
  }

  const getAgentStatus = (agent: typeof architecture.agents[0]) => {
    const agentSteps = agent.steps;
    const completedCount = agentSteps.filter(s => completedSteps[s]).length;
    const currentStep = currentProgress?.step;
    const isActive = currentStep !== undefined && agentSteps.includes(currentStep);

    if (completedCount === agentSteps.length) return 'completed';
    if (isActive) return 'active';
    if (completedCount > 0) return 'partial';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">{architecture.pipeline_description}</h3>
        <p className="text-sm text-gray-500">Total LLM Calls: {architecture.total_llm_calls}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {architecture.agents.map((agent) => {
          const status = getAgentStatus(agent);
          const totalDuration = agent.steps.reduce(
            (sum, step) => sum + (completedSteps[step]?.duration || 0),
            0
          );

          return (
            <div
              key={agent.id}
              className={`rounded-lg border-2 p-4 transition-all ${
                status === 'active'
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : status === 'completed'
                  ? 'border-green-500 bg-green-50'
                  : status === 'partial'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {/* Agent Header */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.id}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 text-sm truncate">
                    {agent.short_name}
                  </h4>
                  <p className="text-xs text-gray-500">{agent.llm_calls} LLM calls</p>
                </div>
                {status === 'completed' && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {status === 'active' && (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {agent.description}
              </p>

              {/* Inputs/Outputs */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400">In:</span>
                  <span className="ml-1 text-gray-600">{agent.inputs.join(', ')}</span>
                </div>
                <div>
                  <span className="text-gray-400">Out:</span>
                  <span className="ml-1 text-gray-600">{agent.outputs.join(', ')}</span>
                </div>
              </div>

              {/* Timing */}
              {totalDuration > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Time: </span>
                  <span className="text-xs font-mono font-semibold text-blue-600">
                    {totalDuration.toFixed(1)}s
                  </span>
                </div>
              )}

              {/* Sub-agents */}
              {agent.sub_agents && agent.sub_agents.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Sub-agents:</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.sub_agents.slice(0, 4).map((sub, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600"
                      >
                        {sub.split(' ')[0]}
                      </span>
                    ))}
                    {agent.sub_agents.length > 4 && (
                      <span className="text-xs text-gray-400">
                        +{agent.sub_agents.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Timing View Component
function TimingView({
  steps,
  completedSteps,
  currentProgress
}: {
  steps: StepInfo[];
  completedSteps: Record<number, { duration: number; status: string }>;
  currentProgress: ProgressEvent | null;
}) {
  const totalTime = Object.values(completedSteps).reduce((sum, s) => sum + s.duration, 0);
  const maxDuration = Math.max(...Object.values(completedSteps).map(s => s.duration), 1);

  // Group steps by agent
  const agentGroups: Record<string, typeof steps> = {};
  steps.forEach(step => {
    if (!agentGroups[step.agent]) {
      agentGroups[step.agent] = [];
    }
    agentGroups[step.agent].push(step);
  });

  const agentColors: Record<string, string> = {
    'Agent 1': '#3B82F6',
    'Agent 2': '#8B5CF6',
    'Agent 3': '#10B981',
    'Agent 4': '#F59E0B',
    'Agent 5': '#EF4444',
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{totalTime.toFixed(1)}s</div>
          <div className="text-sm text-blue-600">Total Time</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {Object.keys(completedSteps).length}
          </div>
          <div className="text-sm text-green-600">Steps Completed</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">
            {totalTime > 0 ? (totalTime / Object.keys(completedSteps).length).toFixed(1) : '0'}s
          </div>
          <div className="text-sm text-purple-600">Avg per Step</div>
        </div>
      </div>

      {/* Timeline by Agent */}
      <div className="space-y-4">
        {Object.entries(agentGroups).map(([agentName, agentSteps]) => {
          const agentTime = agentSteps.reduce(
            (sum, step) => sum + (completedSteps[step.step]?.duration || 0),
            0
          );

          return (
            <div key={agentName} className="border rounded-lg overflow-hidden">
              {/* Agent Header */}
              <div
                className="px-4 py-2 flex items-center justify-between"
                style={{ backgroundColor: agentColors[agentName] + '20' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: agentColors[agentName] }}
                  />
                  <span className="font-semibold text-gray-800">{agentName}</span>
                  <span className="text-sm text-gray-500">({agentSteps.length} steps)</span>
                </div>
                <span className="font-mono font-semibold" style={{ color: agentColors[agentName] }}>
                  {agentTime.toFixed(2)}s
                </span>
              </div>

              {/* Steps */}
              <div className="divide-y divide-gray-100">
                {agentSteps.map((step) => {
                  const stepData = completedSteps[step.step];
                  const isActive = currentProgress?.step === step.step;
                  const duration = stepData?.duration || 0;
                  const barWidth = (duration / maxDuration) * 100;

                  return (
                    <div
                      key={step.step}
                      className={`px-4 py-2 flex items-center gap-4 ${
                        isActive ? 'bg-blue-50' : ''
                      }`}
                    >
                      {/* Step Number */}
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                        {step.step}
                      </div>

                      {/* Step Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{step.title}</span>
                          {isActive && (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          {stepData?.status === 'completed' && (
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{step.description}</p>
                      </div>

                      {/* Duration Bar */}
                      <div className="w-32">
                        {duration > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${barWidth}%`,
                                  backgroundColor: agentColors[agentName]
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono text-gray-600 w-12 text-right">
                              {duration.toFixed(2)}s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Flow View Component
function FlowView({
  architecture,
  currentProgress,
  completedSteps
}: {
  architecture: AgentArchitecture | null;
  currentProgress: ProgressEvent | null;
  completedSteps: Record<number, { duration: number; status: string }>;
}) {
  if (!architecture) {
    return (
      <div className="text-center text-gray-500 py-8">
        Waiting for architecture data...
      </div>
    );
  }

  const getNodeStatus = (agentId: number | string) => {
    if (typeof agentId === 'string') return 'default';
    const agent = architecture.agents.find(a => a.id === agentId);
    if (!agent) return 'default';

    const completedCount = agent.steps.filter(s => completedSteps[s]).length;
    const currentStep = currentProgress?.step;
    const isActive = currentStep !== undefined && agent.steps.includes(currentStep);

    if (completedCount === agent.steps.length) return 'completed';
    if (isActive) return 'active';
    return 'pending';
  };

  const agentColors: Record<number, string> = {
    1: '#3B82F6',
    2: '#8B5CF6',
    3: '#10B981',
    4: '#F59E0B',
    5: '#EF4444',
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800">Data Flow Diagram</h3>
        <p className="text-sm text-gray-500">How data moves through the agent pipeline</p>
      </div>

      {/* Horizontal Flow */}
      <div className="flex items-center justify-center gap-2 py-8 overflow-x-auto">
        {/* Input Node */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-gray-300 flex flex-col items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs text-gray-600 mt-1">PDF</span>
          </div>
        </div>

        {/* Flow Connections */}
        {architecture.flow.map((conn, idx) => {
          const isActive = typeof conn.to === 'number' && getNodeStatus(conn.to) === 'active';
          const isCompleted = typeof conn.to === 'number' && getNodeStatus(conn.to) === 'completed';

          return (
            <div key={idx} className="flex items-center">
              {/* Arrow */}
              <div className="flex items-center">
                <div
                  className={`w-16 h-0.5 ${
                    isCompleted ? 'bg-green-400' : isActive ? 'bg-blue-400' : 'bg-gray-300'
                  }`}
                />
                <div
                  className={`w-0 h-0 border-t-4 border-b-4 border-l-8 border-t-transparent border-b-transparent ${
                    isCompleted ? 'border-l-green-400' : isActive ? 'border-l-blue-400' : 'border-l-gray-300'
                  }`}
                />
              </div>

              {/* Data Label */}
              <div className="absolute -mt-8 text-xs text-gray-400 whitespace-nowrap">
                {conn.data}
              </div>

              {/* Node */}
              {typeof conn.to === 'number' ? (
                <div className="flex flex-col items-center mx-2">
                  <div
                    className={`w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                      getNodeStatus(conn.to) === 'active'
                        ? 'scale-110 shadow-lg'
                        : ''
                    }`}
                    style={{
                      backgroundColor: agentColors[conn.to] + '20',
                      borderColor: agentColors[conn.to]
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: agentColors[conn.to] }}
                    >
                      {conn.to}
                    </div>
                    <span className="text-xs text-gray-600 mt-1">
                      {architecture.agents.find(a => a.id === conn.to)?.short_name}
                    </span>
                  </div>
                  {getNodeStatus(conn.to) === 'active' && (
                    <div className="mt-2 text-xs text-blue-600 font-medium animate-pulse">
                      Processing...
                    </div>
                  )}
                  {getNodeStatus(conn.to) === 'completed' && (
                    <div className="mt-2">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ) : conn.to === 'output' ? (
                <div className="flex flex-col items-center mx-2">
                  <div className="w-20 h-20 rounded-lg bg-green-100 border-2 border-green-500 flex flex-col items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-green-600 mt-1">Report</span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="text-gray-500">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-gray-500">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-500">Completed</span>
        </div>
      </div>

      {/* Detailed Agent Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {architecture.agents.map((agent) => (
          <div
            key={agent.id}
            className="p-4 rounded-lg border"
            style={{ borderColor: agent.color }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: agent.color }}
              >
                {agent.id}
              </div>
              <span className="font-semibold text-gray-800">{agent.name}</span>
            </div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-400">Inputs: </span>
                <span className="text-gray-600">{agent.inputs.join(' → ')}</span>
              </div>
              <div>
                <span className="text-gray-400">Outputs: </span>
                <span className="text-gray-600">{agent.outputs.join(' → ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
