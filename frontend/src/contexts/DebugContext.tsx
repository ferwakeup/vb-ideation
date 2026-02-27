/**
 * Debug Context
 * Manages debug mode state and debug messages for admin users
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface DebugMessage {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  source: 'frontend' | 'backend';
  category: 'extraction' | 'compression' | 'database' | 'llm' | 'sse' | 'general';
  message: string;
  details?: Record<string, unknown>;
}

interface DebugContextType {
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  messages: DebugMessage[];
  addMessage: (message: Omit<DebugMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  isAdmin: boolean;
}

const DebugContext = createContext<DebugContextType | null>(null);

const DEBUG_MODE_KEY = 'vb_debug_mode';

export function DebugProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [isDebugMode, setIsDebugMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DEBUG_MODE_KEY) === 'true';
    }
    return false;
  });

  const [messages, setMessages] = useState<DebugMessage[]>([]);

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => {
      const newValue = !prev;
      localStorage.setItem(DEBUG_MODE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const addMessage = useCallback((message: Omit<DebugMessage, 'id' | 'timestamp'>) => {
    const newMessage: DebugMessage = {
      ...message,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage].slice(-100)); // Keep last 100 messages

    // Also log to console for backend debugging
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[message.level];

    console.log(
      `${emoji} [DEBUG/${message.source.toUpperCase()}/${message.category.toUpperCase()}] ${message.message}`,
      message.details || ''
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <DebugContext.Provider
      value={{
        isDebugMode: isAdmin && isDebugMode,
        toggleDebugMode,
        messages,
        addMessage,
        clearMessages,
        isAdmin,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}
