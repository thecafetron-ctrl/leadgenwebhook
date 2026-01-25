/**
 * Chatbot Component
 * 
 * AI-powered chatbot that knows about all leads.
 * Can popup and answer questions about leads.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User,
  Minimize2,
  Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function Chatbot({ isOpen, onClose, onToggle }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI assistant. I know all about your leads. Ask me anything - like 'How many leads do we have?', 'Show me high-scoring leads', or 'Find leads from company X'."
    }
  ]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const chatbotMutation = useMutation({
    mutationFn: async (message) => {
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      
      const response = await axios.post(`${API_BASE_URL}/chatbot/query`, {
        message,
        conversationHistory
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.data.response
          }
        ]);
      } else {
        toast.error('Failed to get response');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to process query');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I encountered an error. Please try again."
        }
      ]);
    }
  });

  const handleSend = () => {
    if (!input.trim() || chatbotMutation.isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: userMessage
      }
    ]);

    // Send to API
    chatbotMutation.mutate(userMessage);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-none"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className={cn(
            "absolute bottom-4 right-4 w-96 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl flex flex-col pointer-events-auto",
            isMinimized ? "h-16" : "h-[600px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-800/50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                <p className="text-xs text-dark-400">Knows all about your leads</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary-400" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-4 py-2.5",
                        message.role === 'user'
                          ? "bg-primary-500/20 text-primary-200 border border-primary-500/30"
                          : "bg-dark-800 text-dark-200 border border-dark-700"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-accent-400" />
                      </div>
                    )}
                  </div>
                ))}
                {chatbotMutation.isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary-400" />
                    </div>
                    <div className="bg-dark-800 text-dark-200 border border-dark-700 rounded-xl px-4 py-2.5">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-dark-700 bg-dark-800/50">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your leads..."
                    className="flex-1 px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                    disabled={chatbotMutation.isLoading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || chatbotMutation.isLoading}
                    className={cn(
                      "px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center",
                      (!input.trim() || chatbotMutation.isLoading) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-dark-500 mt-2">
                  Try: "How many leads do we have?", "Show me high-scoring leads", "Find leads from [company]"
                </p>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Floating button to open chatbot
export function ChatbotButton({ onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors flex items-center justify-center z-40"
      title="Open AI Assistant"
    >
      <MessageSquare className="w-6 h-6" />
    </motion.button>
  );
}

export default Chatbot;
