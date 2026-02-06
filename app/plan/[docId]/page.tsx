'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExplanationLevel } from '@/lib/models';

type Tab = 'summary' | 'chat';

export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;

  const [level, setLevel] = useState<ExplanationLevel | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; citations?: any[]; confidence?: string }>>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const exampleQuestions = [
    "What is my deductible and out-of-pocket max?",
    "What's my copay for primary care vs specialist?",
    "Are preventive visits covered? How often?",
    "Do I need referrals or prior authorization?",
  ];

  useEffect(() => {
    // Load conversation history if exists
    loadConversation();
  }, [docId]);

  const loadConversation = async () => {
    try {
      const response = await fetch(`/api/conversation?docId=${docId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.conversation) {
          setLevel(data.conversation.level);
          setMessages(data.conversation.messages || []);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleLevelSelect = async (selectedLevel: ExplanationLevel) => {
    setLevel(selectedLevel);
    if (activeTab === 'summary') {
      await loadSummary(selectedLevel);
    }
  };

  const loadSummary = async (selectedLevel: ExplanationLevel) => {
    setSummaryLoading(true);
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, level: selectedLevel }),
      });

      if (!response.ok) {
        throw new Error('Failed to load summary');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSendMessage = async (question?: string) => {
    if (!level) {
      alert('Please select an explanation level first');
      return;
    }

    const questionText = question || input;
    if (!questionText.trim()) return;

    setChatLoading(true);
    const userMessage = { role: 'user' as const, content: questionText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          question: questionText,
          level,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      const assistantMessage = {
        role: 'assistant' as const,
        content: data.answer,
        citations: data.citations,
        confidence: data.confidence,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId }),
      });

      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (!level) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Choose Your Explanation Level
              </h2>
              <div className="space-y-4">
                {[
                  {
                    value: 'beginner' as ExplanationLevel,
                    title: 'Beginner',
                    description: 'Plain language with definitions and examples. Perfect if you\'re new to insurance terms.',
                  },
                  {
                    value: 'intermediate' as ExplanationLevel,
                    title: 'Intermediate',
                    description: 'Clear explanations with brief definitions. For those familiar with basic insurance concepts.',
                  },
                  {
                    value: 'advanced' as ExplanationLevel,
                    title: 'Advanced',
                    description: 'Concise explanations assuming familiarity. Focuses on details, edge cases, and caveats.',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleLevelSelect(option.value)}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{option.title}</h3>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 mb-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Your Insurance Plan</h1>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                  {level}
                </span>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium hover:bg-red-200"
                >
                  Delete Document
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-xl">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => {
                    setActiveTab('summary');
                    if (level && !summary) loadSummary(level);
                  }}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'summary'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Plan Summary
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'chat'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ask Questions
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'summary' && (
                <div>
                  {summaryLoading ? (
                    <div className="text-center py-8">Loading summary...</div>
                  ) : summary ? (
                    <div className="prose prose-blue max-w-none">
                      {summary.fullText ? (
                        <div className="markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-gray-900 mt-6 mb-4" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-gray-900 mt-5 mb-3" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2" {...props} />,
                              h4: ({node, ...props}) => <h4 className="text-lg font-semibold text-gray-800 mt-3 mb-2" {...props} />,
                              p: ({node, ...props}) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700" {...props} />,
                              li: ({node, ...props}) => <li className="ml-4" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                              em: ({node, ...props}) => <em className="italic" {...props} />,
                              code: ({node, inline, ...props}: any) => 
                                inline ? (
                                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800" {...props} />
                                ) : (
                                  <code className="block bg-gray-100 p-3 rounded text-sm font-mono text-gray-800 overflow-x-auto mb-3" {...props} />
                                ),
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-3" {...props} />,
                              table: ({node, ...props}) => <table className="min-w-full border-collapse border border-gray-300 mb-3" {...props} />,
                              thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
                              tbody: ({node, ...props}) => <tbody {...props} />,
                              tr: ({node, ...props}) => <tr className="border-b border-gray-200" {...props} />,
                              th: ({node, ...props}) => <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900" {...props} />,
                              td: ({node, ...props}) => <td className="border border-gray-300 px-4 py-2 text-gray-700" {...props} />,
                            }}
                          >
                            {summary.fullText}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {summary.deductible && (
                            <div>
                              <h3 className="font-semibold text-gray-900">Deductible</h3>
                              <p className="text-gray-700">{summary.deductible}</p>
                            </div>
                          )}
                          {summary.outOfPocketMax && (
                            <div>
                              <h3 className="font-semibold text-gray-900">Out-of-Pocket Maximum</h3>
                              <p className="text-gray-700">{summary.outOfPocketMax}</p>
                            </div>
                          )}
                          {/* Add more fields as needed */}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => loadSummary(level)}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Generate Summary
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="flex flex-col h-[600px]">
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <p className="mb-4">Ask questions about your insurance plan</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {exampleQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(q)}
                              className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              <p className="text-xs font-semibold mb-2">Sources:</p>
                              {msg.citations.map((citation: any, cIdx: number) => (
                                <details key={cIdx} className="mb-2">
                                  <summary className="text-xs cursor-pointer hover:underline">
                                    Page {citation.pageNumber}
                                  </summary>
                                  <p className="text-xs mt-1 italic">"{citation.snippet}"</p>
                                </details>
                              ))}
                            </div>
                          )}
                          {msg.confidence && (
                            <div className="mt-2">
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  msg.confidence === 'high'
                                    ? 'bg-green-100 text-green-800'
                                    : msg.confidence === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                Confidence: {msg.confidence}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg p-4">
                          <p className="text-gray-500">Thinking...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask a question about your plan..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={chatLoading || !input.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
