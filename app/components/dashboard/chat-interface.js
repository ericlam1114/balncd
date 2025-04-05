'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../providers/auth-provider';
import { memoryClient } from '../../../lib/memory-client';
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
  const [conversationContext, setConversationContext] = useState({
    activeQuarter: null,
    activeState: null,
    activeTaxYear: new Date().getFullYear(),
    activeFilingStatus: null,
    lastQueryType: null
  });
  const { user } = useAuth();
  const messageEndRef = useRef(null);

  // Load user preferences and context when component mounts
  useEffect(() => {
    if (user?.uid) {
      loadUserMemory(user.uid);
    }
  }, [user]);

  // Load user memory including preferences and past context
  const loadUserMemory = async (userId) => {
    try {
      // Load tax preferences
      const taxPreferences = await memoryClient.getTaxPreferences(userId);
      
      if (taxPreferences) {
        console.log('Loaded tax preferences from memory:', taxPreferences);
        
        // Update conversation context with these preferences
        setConversationContext(prev => ({
          ...prev,
          activeState: taxPreferences.state || prev.activeState,
          activeFilingStatus: taxPreferences.filingStatus || prev.activeFilingStatus
        }));
      }
      
      // Load user profile for additional context
      const userProfile = await memoryClient.getUserProfile(userId);
      
      if (userProfile?.facts?.tax) {
        // Use any available tax facts to enhance context
        const taxFacts = userProfile.facts.tax;
        console.log('Found tax facts in user profile:', taxFacts);
        
        // Update context with any facts not already set
        setConversationContext(prev => ({
          ...prev,
          activeState: prev.activeState || taxFacts.filingState,
          activeFilingStatus: prev.activeFilingStatus || taxFacts.filingStatus
        }));
      }
    } catch (error) {
      console.error('Error loading user memory:', error);
    }
  };
  
  // Save conversation context to memory store periodically
  useEffect(() => {
    // Skip first render and if no user
    if (!user?.uid || messages.length <= 1) return;
    
    // Create a debounced version of the save function
    const debouncedSave = setTimeout(() => {
      saveConversationToMemory();
    }, 3000);
    
    return () => clearTimeout(debouncedSave);
  }, [messages, conversationContext, user]);
  
  // Save current conversation to memory store
  const saveConversationToMemory = async () => {
    if (!user?.uid || messages.length <= 1) return;
    
    try {
      // Only save the last 10 messages to avoid storing too much data
      const recentMessages = messages.slice(-10);
      
      // Store the conversation with the current context
      await memoryClient.storeConversation(user.uid, recentMessages, conversationContext);
      console.log('Saved conversation to memory store');
      
      // If context includes tax preferences, save those separately
      if (conversationContext.activeState || conversationContext.activeFilingStatus) {
        const taxPreferences = {
          state: conversationContext.activeState,
          filingStatus: conversationContext.activeFilingStatus
        };
        
        // Only save if we have actual values (not undefined or null)
        if (taxPreferences.state || taxPreferences.filingStatus) {
          await memoryClient.saveTaxPreferences(user.uid, taxPreferences);
          console.log('Saved tax preferences to memory store:', taxPreferences);
        }
      }
    } catch (error) {
      console.error('Error saving to memory store:', error);
    }
  };
  
  // Retrieve similar past conversations for context
  const findSimilarPastConversations = async (question) => {
    if (!user?.uid || !question) return [];
    
    try {
      // Search for similar past conversations using the memory store
      const similarConversations = await memoryClient.getSimilarConversations(user.uid, question, 2);
      
      if (similarConversations && similarConversations.length > 0) {
        console.log('Found similar past conversations:', similarConversations);
        
        // Use the most similar conversation's context to enhance current context
        const mostSimilar = similarConversations[0];
        
        if (mostSimilar.similarity > 0.7) { // Only use if similarity is high enough
          console.log('Using context from similar conversation:', mostSimilar.context);
          
          // Update our context with information from the similar conversation
          setConversationContext(prev => ({
            ...prev,
            // Only use values that aren't already set in current context
            activeState: prev.activeState || mostSimilar.context.activeState,
            activeFilingStatus: prev.activeFilingStatus || mostSimilar.context.activeFilingStatus,
            // For other values, prefer the similar conversation's context
            activeQuarter: mostSimilar.context.activeQuarter || prev.activeQuarter,
            activeTaxYear: mostSimilar.context.activeTaxYear || prev.activeTaxYear
          }));
          
          return mostSimilar.messages;
        }
      }
    } catch (error) {
      console.error('Error finding similar conversations:', error);
    }
    
    return [];
  };

  // Sample questions to help the user get started
  const sampleQuestions = [
    "How much did I spend on dining last month?",
    "What are my biggest expense categories?",
    "How much should I pay for quarterly taxes in Q2?",
    "Show me my income trends",
    "Help me prepare for quarterly taxes"
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to extract entities from user input
  const extractEntities = (input) => {
    const lowerInput = input.toLowerCase();
    
    // Extract states
    const states = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
      'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
      'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
      'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 
      'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 
      'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 
      'District of Columbia', 'D.C.'
    ];
    
    const detectedStates = states.filter(state => 
      lowerInput.includes(state.toLowerCase())
    );
    
    // Extract quarters (Q1, Q2, Q3, Q4, etc.)
    const quarterRegex = /\b(q[1-4]|quarter [1-4]|first quarter|second quarter|third quarter|fourth quarter)\b/i;
    const quarterMatch = lowerInput.match(quarterRegex);
    let quarterMentions = [];
    
    if (quarterMatch) {
      const quarterText = quarterMatch[0].toLowerCase();
      
      if (quarterText.includes('q1') || quarterText.includes('first')) {
        quarterMentions.push('Q1');
      } else if (quarterText.includes('q2') || quarterText.includes('second')) {
        quarterMentions.push('Q2');
      } else if (quarterText.includes('q3') || quarterText.includes('third')) {
        quarterMentions.push('Q3');
      } else if (quarterText.includes('q4') || quarterText.includes('fourth')) {
        quarterMentions.push('Q4');
      }
    }
    
    // Extract years
    const yearRegex = /\b(20\d{2})\b/g;
    const yearMatches = [...lowerInput.matchAll(yearRegex)].map(match => parseInt(match[0]));
    
    // Extract filing statuses with improved patterns
    let filingStatuses = [];
    
    // Check for "Married Filing Jointly" pattern
    if ((lowerInput.includes('married') && lowerInput.includes('joint')) || 
        (lowerInput.includes('married') && lowerInput.includes('jointly')) ||
        lowerInput.match(/\bmarried\s+joint\b/) ||
        lowerInput.match(/\bjoint\s+filing\b/) ||
        lowerInput.match(/\bfiling\s+jointly\b/) ||
        lowerInput === 'married jointly' ||
        lowerInput === 'jointly' ||
        lowerInput === 'joint' ||
        (lowerInput.includes('married') && !lowerInput.includes('separate'))) {
      filingStatuses.push('Married Filing Jointly');
    }
    // Check for "Married Filing Separately" pattern
    else if ((lowerInput.includes('married') && lowerInput.includes('separate')) ||
             lowerInput.match(/\bseparate\s+filing\b/) ||
             lowerInput.match(/\bfiling\s+separately\b/) ||
             lowerInput === 'married separately' ||
             lowerInput === 'separately') {
      filingStatuses.push('Married Filing Separately');
    }
    // Check for "Single" pattern
    else if (lowerInput.includes('single')) {
      filingStatuses.push('Single');
    }
    // Check for "Head of Household" pattern
    else if ((lowerInput.includes('head') && lowerInput.includes('household')) ||
             lowerInput.match(/\bhead\s+of\s+household\b/) ||
             lowerInput === 'head of household' ||
             lowerInput === 'hoh') {
      filingStatuses.push('Head of Household');
    }
    
    return {
      states: detectedStates,
      quarterMentions,
      years: yearMatches,
      filingStatuses
    };
  };

  // Determine the type of query based on the text
  const determineQueryType = (text) => {
    const lowerText = text.toLowerCase();
    
    // One-word tax queries
    if (lowerText === 'taxes' || lowerText === 'tax' || lowerText === 'quarterly') {
      return 'tax';
    }
    
    // Tax-related questions about amounts owed
    if (
      (lowerText.includes('tax') || lowerText.includes('taxes')) &&
      (lowerText.includes('how much') || lowerText.includes('calculate') || 
       lowerText.includes('owe') || lowerText.includes('estimate') ||
       lowerText.includes('payment') || lowerText.includes('amount'))
    ) {
      return 'tax';
    }
    
    // Questions about quarterly taxes specifically
    if (
      lowerText.includes('quarterly') && 
      (lowerText.includes('estimate') || lowerText.includes('payment') || 
       lowerText.includes('tax') || lowerText.includes('owe'))
    ) {
      return 'tax';
    }
    
    // Estimated tax questions
    if (lowerText.includes('estimated tax') || lowerText.match(/\bq[1-4]\s+tax/)) {
      return 'tax';
    }
    
    // Questions about filing status
    if (
      lowerText.includes('filing status') || 
      lowerText.includes('married filing') || 
      lowerText.includes('head of household') ||
      lowerText.includes('single filer')
    ) {
      return 'tax';
    }
    
    // Tax rationale questions
    if (
      (lowerText.includes('tax') || lowerText.includes('taxes')) &&
      (lowerText.includes('why') || lowerText.includes('how come') || 
       lowerText.includes('explain') || lowerText.includes('reasons') ||
       lowerText.includes('calculation') || lowerText.includes('breakdown'))
    ) {
      return 'taxRationale';
    }
    
    // Income-related questions
    if (
      (lowerText.includes('income') || lowerText.includes('earn') || 
       lowerText.includes('revenue') || lowerText.includes('made')) &&
      (lowerText.includes('how much') || lowerText.includes('total') || 
       lowerText.includes('analyze') || lowerText.includes('summary'))
    ) {
      return 'income';
    }
    
    // Look for other tax-related keywords
    const taxKeywords = [
      'withholding', 'irs', 'deduction', 'deduct', 'write-off', 
      'filing', 'refund', '1040', 'w2', 'w-2', 'tax bracket',
      'exemption', 'credit'
    ];
    
    for (const keyword of taxKeywords) {
      if (lowerText.includes(keyword)) {
        return 'tax';
      }
    }
    
    // Default to general
    return 'general';
  };

  // Define indicators for major topic changes that should reset context
  const detectMajorTopicChange = (question, prevQueryType) => {
    const lowerQuestion = question.toLowerCase();
    
    // Look for explicit topic change indicators
    const topicChangeIndicators = [
      /\blet('s| us)? (talk|chat|discuss) about (something else|a different topic)\b/i,
      /\bchange (the |of )?(topic|subject)\b/i,
      /\b(forget|ignore) (that|the previous|my last) (question|message)\b/i,
      /\bstart over\b/i,
      /\bnew question\b/i,
      /\bi('ve| have) (another|a different) question\b/i,
      /\bmoving on\b/i,
      /\bon (a |the )?(different|another|unrelated) (note|topic|subject)\b/i
    ];
    
    // Check for explicit indicators
    if (topicChangeIndicators.some(pattern => pattern.test(lowerQuestion))) {
      return true;
    }
    
    // Check for question that is introducing a completely new domain
    // when there was already an active specialized domain
    if (prevQueryType && prevQueryType !== 'general') {
      // If previous question was tax-related and new question has nothing to do with taxes
      if (prevQueryType === 'tax' && 
          !lowerQuestion.match(/\b(tax|owe|payment|quarterly|q[1-4])\b/i)) {
        // Look for very specific key terms from other domains
        const otherDomainTerms = {
          budget: /\b(budget|save money|financial plan|spending plan)\b/i,
          investment: /\b(invest|stock market|portfolio|retirement account)\b/i,
          income: /\b(income source|salary|earnings|revenue)\b/i,
          expense: /\b(spending patterns|expense tracking|money going)\b/i
        };
        
        // If it strongly matches another domain, treat as topic change
        for (const [domain, pattern] of Object.entries(otherDomainTerms)) {
          if (pattern.test(lowerQuestion)) {
            return true;
          }
        }
      }
      
      // Similar checks for other query types
      // For brevity, I'm only implementing the tax->other transition check
    }
    
    return false;
  };

  // Handle a major topic change by resetting context
  const handleMajorTopicChange = (question) => {
    console.log('Detected major topic change - resetting context');
    
    // Reset conversation context
    const resetContext = {
      activeQuarter: null,
      activeState: null, 
      activeTaxYear: new Date().getFullYear(),
      lastQueryType: 'general'
    };
    
    setConversationContext(resetContext);
    
    // Extract entities from the new question to start fresh
    const entities = extractEntities(question);
    const queryType = determineQueryType(question);
    
    // Update with any entities from the new question
    const updatedContext = {
      ...resetContext,
      activeQuarter: entities.quarterMentions[0],
      activeState: entities.states[0],
      activeTaxYear: entities.years[0],
      lastQueryType: queryType
    };
    
    // Add a subtle message indicating topic change
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: 'I understand you want to discuss something different. Let me help with that.' 
    }]);
    
    return updatedContext;
  };

  // Updated handleSubmit function with memory store integration
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    setInput('');
    
    // Handle special commands for debugging
    if (userQuestion.startsWith('/reset')) {
      setMessages([{ 
        role: 'assistant', 
        content: 'I\'ve reset our conversation and context. How can I help you with your finances today?' 
      }]);
      setConversationContext({
        activeState: null,
        activeQuarter: null,
        activeTaxYear: new Date().getFullYear(),
        activeFilingStatus: null,
        lastQueryType: null,
        awaitingTaxInfo: null,
        pendingTaxQuery: null
      });
      return;
    }
    
    if (userQuestion.startsWith('/debug')) {
      setMessages(prev => [...prev, 
        { role: 'user', content: userQuestion },
        { role: 'assistant', content: `Current context: ${JSON.stringify(conversationContext, null, 2)}` }
      ]);
      return;
    }
    
    // Add user message to the chat
    setMessages(prev => [...prev, { role: 'user', content: userQuestion }]);
    
    try {
      // If we're awaiting specific tax information, handle accordingly
      if (conversationContext.awaitingTaxInfo) {
        await processAwaitingTaxInfo(userQuestion, conversationContext);
        return;
      }
      
      // Get the recent conversation history (last few messages)
      const recentHistory = messages.slice(-6).concat([{ role: 'user', content: userQuestion }]);
      
      // Set loading indicator
      setLoading(true);
      
      // Process the user input with AI
      await processUserInput(userQuestion, conversationContext, recentHistory);
    } catch (error) {
      console.error('Error processing user input:', error);
      
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: 'I apologize, but I encountered an error processing your request. Could you try rephrasing or providing more specific information?' 
        }
      ]);
    } finally {
      setLoading(false);
      
      // Save conversation to memory after processing
      if (user?.uid && messages.length > 1) {
        try {
          // Save conversation asynchronously
          setTimeout(() => {
            saveConversationToMemory();
          }, 500);
        } catch (error) {
          console.error('Error saving conversation:', error);
        }
      }
    }
  };

  // Process user input with AI assistance
  const processUserInput = async (question, context, history) => {
    // Check if there's a major topic change or reset request
    if (context.lastQueryType && detectMajorTopicChange(question, context.lastQueryType)) {
      // Handle topic change by resetting context appropriately
      return handleMajorTopicChange(question);
    }
    
    // Track if we're using memory in this response
    let usingSavedPreferences = false;
    let usingSimilarConversations = false;
    
    // First, try to find similar past conversations to enhance context
    const similarConversations = await findSimilarPastConversations(question);
    let enhancedHistory = history;
    
    // Add similar conversation as context if available
    if (similarConversations.length > 0) {
      // Take just enough messages to provide context without overwhelming
      const contextMessages = similarConversations.slice(-3);
      enhancedHistory = [...contextMessages, ...history.slice(-5)];
      console.log('Enhanced history with similar conversations', enhancedHistory);
      usingSimilarConversations = true;
    }
    
    // Determine the type of query
    const queryType = determineQueryType(question);
    console.log(`Query type: ${queryType}`);
    
    // Extract mentioned entities (states, quarters, years)
    const entities = extractEntities(question);
    console.log('Entities extracted:', entities);
    
    // Update context with any new information from this query
    let updatedContext = { ...context };
    
    // Update state if mentioned in this query
    if (entities.states.length > 0) {
      updatedContext.activeState = entities.states[0];
    } else if (context.activeState) {
      // If using saved state preference, mark it
      usingSavedPreferences = true;
    }
    
    // Update filing status if mentioned in this query
    if (entities.filingStatuses.length > 0) {
      updatedContext.activeFilingStatus = entities.filingStatuses[0];
    } else if (context.activeFilingStatus) {
      // If using saved filing status preference, mark it
      usingSavedPreferences = true;
    }
    
    // Update quarter if mentioned in this query
    if (entities.quarterMentions.length > 0) {
      updatedContext.activeQuarter = entities.quarterMentions[0];
    }
    
    // Update tax year if mentioned in this query
    if (entities.years.length > 0) {
      updatedContext.activeTaxYear = entities.years[0];
    }
    
    // Store the query type in the context
    updatedContext.lastQueryType = queryType;
    
    // Update the conversation context state
    setConversationContext(updatedContext);
    
    // Save the updated context and this conversation to memory
    if (user?.uid) {
      // Use setTimeout to avoid blocking the main thread
      setTimeout(() => {
        saveConversationToMemory();
      }, 100);
    }
    
    // Process based on query type
    let result;
    if (queryType === 'tax') {
      result = await handleTaxQuery(question, updatedContext, enhancedHistory);
    } else if (queryType === 'income') {
      result = await handleIncomeAnalysis(question, updatedContext, enhancedHistory);
    } else {
      result = await handleGeneralQuery(question, updatedContext, enhancedHistory);
    }
    
    // If we have a response and are using saved preferences or similar conversations,
    // modify the last message to indicate that memory was used
    if (usingSavedPreferences || usingSimilarConversations) {
      setMessages(prev => {
        // Get the last message (which should be the assistant's response)
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
          // Clone the messages array
          const newMessages = [...prev];
          
          // Add memory indicators to the last message
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            fromMemory: usingSavedPreferences,
            memorySource: usingSimilarConversations
          };
          
          return newMessages;
        }
        return prev;
      });
    }
    
    return result;
  };

  // Enhanced tax query handler with context awareness and preference gathering
  const handleTaxQuery = async (question, context, history) => {
    // If context doesn't include state, we need to determine it first
    if (!context.activeState) {
      const entities = extractEntities(question);
      
      // If state is mentioned in the question, use it
      if (entities.states.length > 0) {
        context.activeState = entities.states[0];
      } else {
        // Check if user has saved preferences
        if (user?.uid) {
          try {
            // Try to load from memory store first
            const taxPreferences = await memoryClient.getTaxPreferences(user.uid);
            if (taxPreferences?.state) {
              context.activeState = taxPreferences.state;
              console.log(`Using saved state preference: ${context.activeState}`);
            } else {
              // If not in memory store, try to parse from the message
              const detectedState = await parseStateWithAI(question);
              
              if (detectedState) {
                context.activeState = detectedState;
                console.log(`Detected state from question: ${context.activeState}`);
                
                // Save this preference
                await memoryClient.saveTaxPreferences(user.uid, {
                  ...taxPreferences,
                  state: detectedState
                });
              } else {
                // Ask the user for their state
                setMessages(prev => [
                  ...prev,
                  { 
                    role: 'assistant', 
                    content: 'To provide an accurate tax estimate, I need to know which state you\'re filing in. Could you please let me know your state?' 
                  }
                ]);
                
                // Set context to await tax info
                setConversationContext({
                  ...context,
                  awaitingTaxInfo: 'state',
                  pendingTaxQuery: question
                });
                return;
              }
            }
          } catch (error) {
            console.error('Error checking tax preferences:', error);
          }
        }
      }
    }
    
    // If context doesn't include filing status, we need to determine it
    if (!context.activeFilingStatus) {
      const entities = extractEntities(question);
      
      // If filing status is mentioned in the question, use it
      if (entities.filingStatuses.length > 0) {
        context.activeFilingStatus = entities.filingStatuses[0];
      } else {
        // Check if user has saved preferences
        if (user?.uid) {
          try {
            // Try to load from memory store first
            const taxPreferences = await memoryClient.getTaxPreferences(user.uid);
            if (taxPreferences?.filingStatus) {
              context.activeFilingStatus = taxPreferences.filingStatus;
              console.log(`Using saved filing status: ${context.activeFilingStatus}`);
            } else {
              // If not in memory store, try to parse from the message
              const detectedStatus = await parseFilingStatusWithAI(question);
              
              if (detectedStatus) {
                context.activeFilingStatus = detectedStatus;
                console.log(`Detected filing status: ${context.activeFilingStatus}`);
                
                // Save this preference
                await memoryClient.saveTaxPreferences(user.uid, {
                  ...taxPreferences,
                  filingStatus: detectedStatus
                });
              } else {
                // Ask the user for their filing status
                setMessages(prev => [
                  ...prev,
                  { 
                    role: 'assistant', 
                    content: 'To provide an accurate tax estimate, I need to know your filing status. Are you filing as Single, Married Filing Jointly, Married Filing Separately, or Head of Household?' 
                  }
                ]);
                
                // Set context to await tax info
                setConversationContext({
                  ...context,
                  awaitingTaxInfo: 'filingStatus',
                  pendingTaxQuery: question
                });
                return;
              }
            }
          } catch (error) {
            console.error('Error checking tax preferences:', error);
          }
        }
      }
    }
    
    // For quarterly tax calculations, we need to know which quarter
    if (question.match(/\b(quarterly|q[1-4])\b/i) && !context.activeQuarter) {
      // Extract quarter from the question if present
      const entities = extractEntities(question);
      
      if (entities.quarterMentions.length > 0) {
        context.activeQuarter = entities.quarterMentions[0];
      } else {
        // Determine the current or next quarter
        const now = new Date();
        const month = now.getMonth() + 1;
        
        if (month <= 3) context.activeQuarter = 'Q1';
        else if (month <= 6) context.activeQuarter = 'Q2';
        else if (month <= 9) context.activeQuarter = 'Q3';
        else context.activeQuarter = 'Q4';
        
        console.log(`Using current quarter: ${context.activeQuarter}`);
      }
    }
    
    // Set up request parameters
    const params = {
      userId: user?.uid,
      state: context.activeState,
      filingStatus: context.activeFilingStatus,
      period: context.activeQuarter || 'annual',
      year: context.activeTaxYear || new Date().getFullYear()
    };
    
    console.log('Tax estimation request params:', params);
    
    // Update conversation context with these values
    setConversationContext(context);
    
    // Call the tax estimation API
    try {
      setLoading(true);
      
      const response = await fetch('/api/tax-estimation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Tax estimation response:', data);
      
      // Update the workspace with the tax data
      if (onWorkspaceUpdate && data.calculations) {
        onWorkspaceUpdate({
          type: 'tax',
          data: data.calculations
        });
      }
      
      // Save tax facts to memory store
      if (user?.uid) {
        try {
          // Store facts about this tax calculation for future reference
          await memoryClient.storeFact(user.uid, 'tax', {
            filingState: context.activeState,
            filingStatus: context.activeFilingStatus,
            estimatedTaxes: data.calculations?.total || null,
            lastCalculated: new Date().toISOString(),
            period: context.activeQuarter || 'annual',
            taxYear: context.activeTaxYear || new Date().getFullYear()
          });
          
          console.log('Saved tax calculation facts to memory');
        } catch (error) {
          console.error('Error saving tax facts to memory:', error);
        }
      }
      
      // Add the response to the messages
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.explanation || 'I\'ve calculated your estimated taxes. Please see the workspace for details.' }
      ]);
      
    } catch (error) {
      console.error('Error fetching tax estimation:', error);
      
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: 'I apologize, but I encountered an error while calculating your estimated taxes. Please try again later or provide more information.' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Check if we have stored tax preferences for the user
  const checkUserTaxPreferences = async (userId) => {
    try {
      const response = await fetch(`/api/user-preferences?userId=${userId}`);
      
      if (!response.ok) {
        console.error('Error fetching user preferences:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (!data.exists || !data.preferences) {
        return null;
      }
      
      return data.preferences;
    } catch (error) {
      console.error('Error checking user tax preferences:', error);
      return null;
    }
  };

  // Process responses when we're awaiting specific tax information
  const processAwaitingTaxInfo = async (userInput, context) => {
    if (!context.awaitingTaxInfo) {
      return false;
    }
    
    const infoType = context.awaitingTaxInfo;
    console.log(`Processing awaiting tax info: ${infoType}`);
    
    // Handle state input
    if (infoType === 'state') {
      let stateName = null;
      
      // Try to extract state from user input
      const entities = extractEntities(userInput);
      if (entities.states.length > 0) {
        stateName = entities.states[0];
      } else {
        // Use AI to parse the state
        stateName = await parseStateWithAI(userInput);
      }
      
      if (stateName) {
        console.log(`Detected state: ${stateName}`);
        
        // Update context with the state
        const updatedContext = {
          ...context,
          activeState: stateName,
          awaitingTaxInfo: null
        };
        
        setConversationContext(updatedContext);
        
        // Save this preference to memory store
        if (user?.uid) {
          try {
            const taxPreferences = await memoryClient.getTaxPreferences(user.uid) || {};
            await memoryClient.saveTaxPreferences(user.uid, {
              ...taxPreferences,
              state: stateName
            });
            console.log(`Saved state preference to memory: ${stateName}`);
          } catch (error) {
            console.error('Error saving tax preference to memory store:', error);
          }
        }
        
        // If we have a pending query, run it now
        if (context.pendingTaxQuery) {
          await handleTaxQuery(context.pendingTaxQuery, updatedContext, messages.slice(-6));
        } else {
          // Acknowledge the state input
          setMessages(prev => [
            ...prev, 
            { 
              role: 'assistant', 
              content: `Thanks for letting me know you're in ${stateName}. This helps me provide more accurate tax information. What would you like to know about your taxes?` 
            }
          ]);
        }
        
        return true;
      } else {
        // Could not recognize the state
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: 'I\'m sorry, I couldn\'t recognize that state. Please provide the full name of your state (e.g., "California" or "New York").' 
          }
        ]);
        return true;
      }
    } 
    // Handle filing status input
    else if (infoType === 'filingStatus') {
      let filingStatus = null;
      
      // Try to extract filing status from user input
      const entities = extractEntities(userInput);
      if (entities.filingStatuses.length > 0) {
        filingStatus = entities.filingStatuses[0];
      } else {
        // Use AI to parse the filing status
        filingStatus = await parseFilingStatusWithAI(userInput);
      }
      
      if (filingStatus) {
        console.log(`Detected filing status: ${filingStatus}`);
        
        // Update context with the filing status
        const updatedContext = {
          ...context,
          activeFilingStatus: filingStatus,
          awaitingTaxInfo: null
        };
        
        setConversationContext(updatedContext);
        
        // Save this preference to memory store
        if (user?.uid) {
          try {
            const taxPreferences = await memoryClient.getTaxPreferences(user.uid) || {};
            await memoryClient.saveTaxPreferences(user.uid, {
              ...taxPreferences,
              filingStatus: filingStatus
            });
            console.log(`Saved filing status preference to memory: ${filingStatus}`);
          } catch (error) {
            console.error('Error saving tax preference to memory store:', error);
          }
        }
        
        // If we have a pending query, run it now
        if (context.pendingTaxQuery) {
          await handleTaxQuery(context.pendingTaxQuery, updatedContext, messages.slice(-6));
        } else {
          // Acknowledge the filing status input
          setMessages(prev => [
            ...prev, 
            { 
              role: 'assistant', 
              content: `Thanks for letting me know your filing status is ${filingStatus}. This helps me provide more accurate tax information. What would you like to know about your taxes?` 
            }
          ]);
        }
        
        return true;
      } else {
        // Could not recognize the filing status
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: 'I\'m sorry, I couldn\'t recognize that filing status. Please choose one of: Single, Married Filing Jointly, Married Filing Separately, or Head of Household.' 
          }
        ]);
        return true;
      }
    }
    
    return false;
  };

  // Parse state from user input using AI
  const parseStateWithAI = async (userInput) => {
    try {
      // Use a server-side API route to handle calling AI
      const response = await fetch('/api/parse-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userInput })
      });
      
      if (!response.ok) {
        console.error('Error parsing state with AI:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      let state = data.state;
      
      if (state) {
        console.log('AI detected state:', state);
        return state;
      }
      
      console.log('AI could not determine state');
      return null;
    } catch (error) {
      console.error('Error in parseStateWithAI:', error);
      return null;
    }
  };
  
  // Advanced AI-based filing status detection
  const parseFilingStatusWithAI = async (userInput) => {
    try {
      const response = await fetch('/api/parse-filing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userInput })
      });
      
      if (!response.ok) {
        console.error('Error parsing filing status with AI:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      let filingStatus = data.filingStatus;
      
      // Only return a valid filing status
      const validStatuses = [
        'Single', 
        'Married Filing Jointly', 
        'Married Filing Separately', 
        'Head of Household'
      ];
      
      if (validStatuses.includes(filingStatus)) {
        console.log('AI detected filing status:', filingStatus);
        return filingStatus;
      } else if (filingStatus?.toLowerCase().includes('married') && !filingStatus?.toLowerCase().includes('separate')) {
        // Default behavior for "married" without specification
        console.log('AI detected generic married status, defaulting to Married Filing Jointly');
        return 'Married Filing Jointly';
      }
      
      console.log('AI could not determine filing status');
      return null;
    } catch (error) {
      console.error('Error in parseFilingStatusWithAI:', error);
      return null;
    }
  };

  // Handle income-related queries
  const handleIncomeAnalysis = async (question, context, history) => {
    try {
      // Show loading indicator
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Analyzing your income data...`
      }]);
      
      // Try to fetch real income data
      const response = await fetch('/api/income-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          question,
          context,
          conversationHistory: history
        })
      }).catch(err => {
        console.error('Error fetching income data:', err);
        return { ok: false };
      });
      
      // Remove loading message
      setMessages(prev => prev.slice(0, -1));
      
      // If we have real data, use it
      if (response && response.ok) {
        try {
          const data = await response.json();
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.message
          }]);
          
          if (data.workspaceContent) {
            onWorkspaceUpdate(data.workspaceContent);
          }
          
          return;
        } catch (err) {
          console.error('Error parsing income response:', err);
          // Fall back to mock data
        }
      }
      
      // If the API is not implemented yet or fails, use mock data
      // Check if we have any transaction data at all
      const hasIncomeData = await checkForTransactionData(user.uid);
      
      let mockResponse;
      
      if (hasIncomeData) {
        // We have some data, but the detailed API failed
        mockResponse = {
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
      } else {
        // No income data at all
        mockResponse = {
          message: "I don't see any income transactions in your account yet. Once you connect your accounts with income data, I can provide detailed income analysis.",
          workspaceContent: {
            type: 'incomeTrend',
            title: 'Income Trends',
            data: { 
              averageMonthly: 0,
              noData: true,
              sources: []
            }
          }
        };
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: mockResponse.message 
      }]);
      
      onWorkspaceUpdate(mockResponse.workspaceContent);
    } catch (error) {
      console.error('Income query error:', error);
      
      // Remove loading message if it exists
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content.includes('Analyzing your income')) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error analyzing your income data. Please try again later.' 
      }]);
    }
  };
  
  // Helper function to check if user has any transaction data
  const checkForTransactionData = async (userId) => {
    try {
      // Basic check to see if there are any transactions
      const response = await fetch('/api/check-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      }).catch(() => ({ ok: false }));
      
      if (response && response.ok) {
        const data = await response.json();
        return data.hasTransactions;
      }
      
      return false;
    } catch (err) {
      console.error('Error checking for transactions:', err);
      return false;
    }
  };

  // Handle general queries
  const handleGeneralQuery = async (question, context, history) => {
    try {
      // Show loading indicator
      setLoading(true);
      
      // Check if it seems like a tax or finance related question that we missed
      // with our specific detectors
      const financialKeywords = ['tax', 'money', 'income', 'expense', 'budget', 'invest', 'save', 'spend', 'quarterly', 'owe'];
      const isTaxOrFinanceRelated = financialKeywords.some(keyword => question.toLowerCase().includes(keyword));
      
      // If it's financial but vague, try to get more specific information
      if (isTaxOrFinanceRelated && question.length < 25) {
        // This is likely a follow-up or vague financial question
        
        // First check if we have context about a previous tax discussion
        if (context.lastQueryType === 'tax' && context.activeState) {
          // This is likely a follow-up to a tax discussion
          
          if (question.toLowerCase().includes('yes') || 
              question.toLowerCase().includes('tell me more') || 
              question.toLowerCase().includes('another quarter') ||
              question.toLowerCase().includes('different quarter')) {
            
            // They want to see tax information for another quarter
            // Default to Q1 if we were just looking at Q2, etc.
            let newQuarter = 'Q1';
            
            if (context.activeQuarter === 'Q1') newQuarter = 'Q2';
            if (context.activeQuarter === 'Q2') newQuarter = 'Q3';
            if (context.activeQuarter === 'Q3') newQuarter = 'Q4';
            if (context.activeQuarter === 'Q4') newQuarter = 'Q1';
            
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `Let me show you the estimated taxes for ${newQuarter} instead...`
            }]);
            
            // Update context with new quarter
            setConversationContext(prev => ({
              ...prev,
              activeQuarter: newQuarter
            }));
            
            // Re-run tax query with new quarter
            await handleTaxQuery(
              `How much estimated taxes do I owe for ${newQuarter}?`, 
              {
                ...context,
                activeQuarter: newQuarter
              }, 
              history
            );
            
            return;
          }
          
          // If it's a tax-related question, treat it as a tax query
          if (question.toLowerCase().includes('tax')) {
            await handleTaxQuery(question, context, history);
            return;
          }
        }
        
        // For vague questions, ask for clarification
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I understand you're asking about "${question}". I notice we were discussing finances${context.activeState ? ` for ${context.activeQuarter || 'Q2'} in ${context.activeState}` : ''}. To help you better, could you provide more specific details about what financial information you're looking for? You can ask about your expenses, income, budget, taxes, or investments.`
        }]);
        
        setLoading(false);
        return;
      }

      // Handle capability questions
      if (question.toLowerCase().includes('what can you') || 
          question.toLowerCase().includes('help me with') || 
          question.includes('how do you')) {
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm your financial assistant, and I can help you with a variety of financial tasks. I can analyze your spending patterns, help with tax planning, suggest budget optimizations, track your investments, and provide insights on your overall financial health. Just ask me a specific question about your finances, and I'll do my best to assist you."
        }]);
        
        // Update workspace with capabilities visualization
        onWorkspaceUpdate({
          type: 'capabilities',
          title: 'How I Can Help You',
          data: {
            capabilities: [
              { name: "Expense Tracking", description: "Analyze where your money is going" },
              { name: "Tax Planning", description: "Estimate quarterly taxes and plan for tax season" },
              { name: "Budget Optimization", description: "Find ways to save and meet financial goals" },
              { name: "Income Analysis", description: "Track income sources and trends" },
              { name: "Investment Insights", description: "Monitor portfolio performance" }
            ]
          }
        });
        
        return;
      }
      
      // Default response with suggestions
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I understand you're asking about "${question}". I notice we were discussing finances${context.activeState ? ` for ${context.activeQuarter || 'Q2'} in ${context.activeState}` : ''}. To help you better, could you provide more specific details about what financial information you're looking for? You can ask about your expenses, income, budget, taxes, or investments.` 
      }]);
      
      // Update workspace with suggested questions
      onWorkspaceUpdate({
        type: 'suggestions',
        title: 'Suggested Questions',
        data: {
          suggestions: [
            "How much did I spend on groceries last month?",
            "What are my largest expense categories?",
            "How much should I set aside for quarterly taxes?",
            "Show me my income trends",
            "Help me create a budget"
          ]
        }
      });
      
    } catch (error) {
      console.error('Error handling general query:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error processing your question. Could you try phrasing it differently?' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <div 
            key={i} 
            className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'} mb-4`}
          >
            <div className={`flex items-start max-w-[80%] ${message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {message.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div 
                className={`px-4 py-2 rounded-lg ${
                  message.role === 'assistant' 
                    ? 'bg-muted text-foreground rounded-tl-none' 
                    : 'bg-primary text-primary-foreground rounded-tr-none'
                }`}
              >
                {message.content}
                {message.memorySource && (
                  <div className="text-xs mt-1 opacity-70 italic">
                    Using information from previous conversations
                  </div>
                )}
                {message.fromMemory && (
                  <div className="text-xs mt-1 opacity-70 italic">
                    Using your saved preferences
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start max-w-[80%]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 bg-primary text-primary-foreground">
                <Bot size={16} />
              </div>
              <div className="px-4 py-2 bg-muted text-foreground rounded-lg rounded-tl-none">
                <div className="flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-foreground rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-foreground rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 bg-foreground rounded-full animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messageEndRef} />
      </div>
      
      {/* Quick suggestions */}
      {messages.length === 1 && (
        <div className="px-4 mb-4">
          <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setInput(question);
                  handleSubmit({ preventDefault: () => {} });
                }}
                className="text-xs py-1 px-3"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Memory context indicator */}
      {(conversationContext.activeState || conversationContext.activeFilingStatus) && (
        <div className="flex items-center justify-start px-4 mb-2 text-xs text-muted-foreground space-x-4">
          {conversationContext.activeState && (
            <div className="flex items-center">
              <span className="font-medium mr-1">State:</span> 
              {conversationContext.activeState}
            </div>
          )}
          {conversationContext.activeFilingStatus && (
            <div className="flex items-center">
              <span className="font-medium mr-1">Filing Status:</span> 
              {conversationContext.activeFilingStatus}
            </div>
          )}
          <button 
            onClick={() => {
              setConversationContext(prev => ({
                ...prev,
                activeState: null,
                activeFilingStatus: null
              }));
            }}
            className="text-xs text-primary hover:underline"
          >
            Clear
          </button>
        </div>
      )}
      
      {/* Chat input form */}
      <form onSubmit={handleSubmit} className="border-t p-4 flex space-x-2">
        <Input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={loading}>
          <SendIcon size={18} />
        </Button>
      </form>
    </div>
  );
}