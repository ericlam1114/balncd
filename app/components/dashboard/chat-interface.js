'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../providers/auth-provider';
import { Button } from '../../../src/components/ui/button';
import { Input } from '../../../src/components/ui/input';
import { SendIcon, User, Bot } from 'lucide-react';

export function ChatInterface({ onWorkspaceUpdate }) {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Welcome to Balncd! 👋 I\'m your financial assistant. Now that you\'ve connected your account, I can help analyze your spending, prepare for taxes, and optimize your budget. What would you like to know about your finances?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const messageEndRef = useRef(null);

  // Sample questions to help the user get started
  const sampleQuestions = [
    "How much did I spend on dining last month?",
    "Help me prepare for quarterly taxes",
    "What are my biggest expense categories?",
    "Show me my income trends",
    "How can I optimize my budget?"
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simulate processing the message
    setTimeout(() => {
      const response = processUserInput(input);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.message }]);
      
      // If the response has workspace content, update the workspace
      if (response.workspaceContent) {
        onWorkspaceUpdate(response.workspaceContent);
      }
      
      setLoading(false);
    }, 1000);
  };

  // Simple function to process user input (this would be replaced with actual AI implementation)
  const processUserInput = (input) => {
    const inputLower = input.toLowerCase();
    
    // Example responses based on input
    if (inputLower.includes('quarterly tax') || inputLower.includes('taxes')) {
      return {
        message: "I can help with your quarterly taxes. Let's gather some information: Where are you located? Are you self-employed or do you have a small business?",
        workspaceContent: {
          type: 'taxes',
          title: 'Quarterly Tax Preparation',
          data: { step: 'gathering-info' }
        }
      };
    } else if (inputLower.includes('spend') && (inputLower.includes('dining') || inputLower.includes('food'))) {
      return {
        message: "Based on your transaction history, you spent $342.18 on dining out last month. This is about 15% of your total monthly expenses.",
        workspaceContent: {
          type: 'chart',
          title: 'Dining Expenses - Last Month',
          data: { 
            category: 'Dining',
            amount: 342.18,
            percentOfTotal: 15 
          }
        }
      };
    } else if (inputLower.includes('expense categories') || inputLower.includes('biggest expense')) {
      return {
        message: "Your top expense categories for the last 3 months are: Housing (40%), Food (20%), Transportation (15%), Entertainment (10%), and Others (15%).",
        workspaceContent: {
          type: 'expenseBreakdown',
          title: 'Expense Breakdown - Last 3 Months',
          data: {
            categories: [
              { name: 'Housing', percentage: 40 },
              { name: 'Food', percentage: 20 },
              { name: 'Transportation', percentage: 15 },
              { name: 'Entertainment', percentage: 10 },
              { name: 'Others', percentage: 15 }
            ]
          }
        }
      };
    } else if (inputLower.includes('income') || inputLower.includes('earning')) {
      return {
        message: "I've analyzed your income trends. Your average monthly income is $4,320. Would you like to see a breakdown by source?",
        workspaceContent: {
          type: 'incomeTrend',
          title: 'Income Trends',
          data: { 
            averageMonthly: 4320,
            sources: [
              { name: 'Primary Job', percentage: 85 },
              { name: 'Side Gig', percentage: 10 },
              { name: 'Investments', percentage: 5 }
            ]
          }
        }
      };
    } else if (inputLower.includes('budget') || inputLower.includes('optimize')) {
      return {
        message: "Based on your spending patterns, I've created a suggested budget that could help you save an additional $350 per month. Take a look at the workspace for details.",
        workspaceContent: {
          type: 'budget',
          title: 'Suggested Budget Optimization',
          data: {
            currentSavings: 500,
            potentialSavings: 850,
            adjustments: [
              { category: 'Dining Out', current: 450, suggested: 300 },
              { category: 'Subscription Services', current: 150, suggested: 80 },
              { category: 'Transportation', current: 400, suggested: 320 },
              { category: 'Miscellaneous', current: 300, suggested: 250 }
            ]
          }
        }
      };
    }
    
    // Default response
    return {
      message: "I understand you're asking about \"" + input + "\". To help you better, could you provide more specific details about what financial information you're looking for?",
      workspaceContent: null
    };
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-slate-50">
        <h2 className="text-lg font-medium">Financial Assistant</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <div key={i} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot size={18} className="text-blue-600" />
              </div>
            )}
            <div className={`max-w-[85%] p-3 rounded-lg ${
              message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}>
              {message.content}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot size={18} className="text-blue-600" />
            </div>
            <div className="max-w-[85%] p-3 rounded-lg bg-gray-100">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
      
      {messages.length === 1 && (
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Suggested questions</h3>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((question, i) => (
              <button
                key={i}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                onClick={() => {
                  setInput(question);
                  // Optional: auto-submit the question
                  // setMessages((prev) => [...prev, { role: 'user', content: question }]);
                  // handleSubmit(new Event('submit'));
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your finances..."
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading}>
            <SendIcon size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
} 