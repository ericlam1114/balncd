// app/api/tax-estimation/route.js
import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { userId, state, filingStatus, period } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Fetch transactions for the relevant period
    const periodMap = {
      'Q1': { startDate: '2025-01-01', endDate: '2025-03-31' },
      'Q2': { startDate: '2025-04-01', endDate: '2025-06-30' },
      'Q3': { startDate: '2025-07-01', endDate: '2025-09-30' },
      'Q4': { startDate: '2025-10-01', endDate: '2025-12-31' },
    };
    
    const { startDate, endDate } = periodMap[period] || periodMap.Q2;
    
    // Query transactions
    const transactionsRef = db.collection('transactions');
    const transactionsQuery = transactionsRef
      .where('userId', '==', userId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate);
    
    const transactionsSnapshot = await transactionsQuery.get();
    const transactions = transactionsSnapshot.docs.map(doc => doc.data());
    
    // Categorize transactions for tax purposes
    const income = transactions.filter(tx => tx.amount < 0).map(tx => ({
      ...tx,
      amount: Math.abs(tx.amount) // Convert to positive for easier processing
    }));
    
    const expenses = transactions.filter(tx => tx.amount > 0);
    
    // Get user profile for additional context
    const userDoc = await db.collection('users').doc(userId).get();
    const userProfile = userDoc.exists ? userDoc.data() : {};
    
    // Call OpenAI to analyze and calculate taxes
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial assistant specializing in tax estimation. Given income and expense data, 
                    calculate estimated quarterly taxes. Be transparent about your methodology.
                    Always return your analysis in a structured JSON format that can be used for visualization.`
        },
        {
          role: "user",
          content: `Calculate estimated quarterly taxes for a user with the following information:
                    State: ${state || 'Unknown'}
                    Filing Status: ${filingStatus || 'Single'}
                    Period: ${period}
                    Income Transactions: ${JSON.stringify(income)}
                    Expense Transactions: ${JSON.stringify(expenses)}
                    User Profile: ${JSON.stringify(userProfile)}`
        }
      ],
      functions: [{
        name: "generate_tax_estimation",
        description: "Generate tax estimation data based on financial transactions",
        parameters: {
          type: "object",
          properties: {
            estimatedTax: {
              type: "number",
              description: "Estimated quarterly tax payment in USD"
            },
            federalTax: {
              type: "number",
              description: "Estimated federal tax component"
            },
            stateTax: {
              type: "number",
              description: "Estimated state tax component"
            },
            selfEmploymentTax: {
              type: "number",
              description: "Estimated self-employment tax if applicable"
            },
            incomeAnalysis: {
              type: "object",
              description: "Analysis of income by category"
            },
            deductibleExpenses: {
              type: "object",
              description: "Analysis of potentially deductible expenses"
            },
            taxRate: {
              type: "number",
              description: "Effective tax rate as a percentage"
            },
            explanation: {
              type: "string",
              description: "Brief explanation of how the estimate was calculated"
            }
          },
          required: ["estimatedTax", "federalTax", "stateTax", "explanation"]
        }
      }],
      function_call: { name: "generate_tax_estimation" }
    });
    
    // Extract the structured data
    const taxData = JSON.parse(response.choices[0].message.function_call.arguments);
    
    return NextResponse.json({
      taxEstimation: taxData,
      period,
      state: state || 'Unknown',
      filingStatus: filingStatus || 'Single'
    });
  } catch (error) {
    console.error('Tax estimation error:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate tax estimation',
      message: error.message
    }, { status: 500 });
  }
}