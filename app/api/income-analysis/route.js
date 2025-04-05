import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { userId, question, context, conversationHistory } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Get the date range for analysis (default to last 3 months)
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    const startDate = threeMonthsAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    
    // Query income transactions for the specified period
    const transactionsRef = db.collection('transactions');
    const transactionsQuery = transactionsRef
      .where('userId', '==', userId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .where('amount', '<', 0); // Negative amounts are income in Plaid
    
    const transactionsSnapshot = await transactionsQuery.get();
    const incomeTransactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      amount: Math.abs(doc.data().amount) // Convert to positive
    }));
    
    // If no income transactions found
    if (incomeTransactions.length === 0) {
      return NextResponse.json({
        message: "I don't see any income transactions in your account for the last three months. Once you connect your accounts with income data, I can provide detailed income analysis.",
        workspaceContent: {
          type: 'incomeTrend',
          title: 'Income Trends',
          data: { 
            averageMonthly: 0,
            noData: true,
            sources: [],
            period: '3 months'
          }
        }
      });
    }
    
    // Calculate total income
    const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const monthlyAverage = totalIncome / 3;
    
    // Group by categories
    const categories = {};
    incomeTransactions.forEach(tx => {
      const category = tx.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += tx.amount;
    });
    
    // Convert to array and calculate percentages
    const sources = Object.entries(categories).map(([name, amount]) => ({
      name,
      amount,
      percentage: Math.round((amount / totalIncome) * 100)
    }));
    
    // Sort by amount (descending)
    sources.sort((a, b) => b.amount - a.amount);
    
    // Use OpenAI to generate a natural language response
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial assistant specializing in income analysis. Given income transaction data, 
                    provide insights in a conversational tone. Be specific, mentioning actual amounts, and trends.
                    Consider the conversation history for context when responding to follow-up questions.`
        },
        ...(conversationHistory || []).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: "user",
          content: `Analyze this income data for a user:
                    Question: ${question}
                    Period: Last 3 months
                    Total Income: $${totalIncome.toFixed(2)}
                    Monthly Average: $${monthlyAverage.toFixed(2)}
                    Number of Income Transactions: ${incomeTransactions.length}
                    Income by Source: ${JSON.stringify(sources)}
                    Income Transactions: ${JSON.stringify(incomeTransactions.slice(0, 10))}
                    
                    Provide a friendly, conversational analysis of their income situation.`
        }
      ]
    });

    const aiMessage = response.choices[0].message.content;
    
    return NextResponse.json({
      message: aiMessage,
      workspaceContent: {
        type: 'incomeTrend',
        title: 'Income Analysis - Last 3 Months',
        data: { 
          totalIncome,
          averageMonthly: monthlyAverage,
          transactions: incomeTransactions.length,
          sources,
          period: '3 months'
        }
      }
    });
    
  } catch (error) {
    console.error('Income analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze income data',
      message: error.message
    }, { status: 500 });
  }
} 