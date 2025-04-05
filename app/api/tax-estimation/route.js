// app/api/tax-estimation/route.js
import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import { memoryStore } from '../../../lib/memory-store';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use AI to parse filing status from user input
async function parseFilingStatusWithAI(userInput) {
  if (!userInput || !process.env.OPENAI_API_KEY) {
    // Fall back to local logic if no input or API key
    return normalizeFilingStatus(userInput);
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a parser that extracts filing status from user messages. Extract the filing status from the user's message and respond with ONLY one of the following options: 'Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household', or 'Unknown' if you can't determine it."
        },
        {
          role: "user",
          content: `Parse this message and extract the tax filing status: "${userInput}"`
        }
      ],
      temperature: 0.1, // Low temperature for more deterministic outputs
      max_tokens: 20   // Very short response needed
    });
    
    const parsedStatus = response.choices[0].message.content.trim();
    console.log(`AI parsed filing status from "${userInput}" as "${parsedStatus}"`);
    
    // Map to our expected values or fall back to local normalization
    if (
      parsedStatus === "Single" || 
      parsedStatus === "Married Filing Jointly" || 
      parsedStatus === "Married Filing Separately" || 
      parsedStatus === "Head of Household"
    ) {
      return parsedStatus;
    } else {
      // If AI returned "Unknown" or something unexpected, fall back to our local logic
      return normalizeFilingStatus(userInput);
    }
  } catch (error) {
    console.error("Error parsing filing status with AI:", error);
    // Fall back to local normalization if AI fails
    return normalizeFilingStatus(userInput);
  }
}

export async function POST(request) {
  try {
    // Parse JSON request body
    const requestData = await request.json();
    const { userId, state, filingStatus, period, year, conversationHistory } = requestData;
    
    console.log(`Tax estimation request: userId=${userId}, state=${state}, filingStatus=${filingStatus}, period=${period}, year=${year}`);
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }
    
    // Default values
    let userState = state;
    let userFilingStatus;
    
    // If we have conversationHistory, try to use AI to extract filing status
    if (conversationHistory && conversationHistory.length > 0 && filingStatus) {
      userFilingStatus = await parseFilingStatusWithAI(filingStatus);
    } else {
      userFilingStatus = normalizeFilingStatus(filingStatus);
    }
    
    let taxPeriod = period;
    let taxYear = year || new Date().getFullYear();
    
    console.log(`Normalized filing status from '${filingStatus}' to '${userFilingStatus}'`);
    
    // If state or filing status is missing, try to get from saved preferences using the memory store
    if (!userState || !userFilingStatus) {
      const preferences = await memoryStore.getTaxPreferences(userId);
      
      if (preferences) {
        if (!userState && preferences.state) {
          userState = preferences.state;
          console.log(`Using saved state preference: ${userState}`);
        }
        
        if (!userFilingStatus && preferences.filingStatus) {
          userFilingStatus = preferences.filingStatus;
          console.log(`Using saved filing status preference: ${userFilingStatus}`);
        }
      }
    }
    
    // If we still don't have these values, use defaults
    if (!userState) {
      userState = 'California'; // Default state
      console.log(`Using default state: ${userState}`);
    }
    
    if (!userFilingStatus) {
      userFilingStatus = 'Single'; // Default filing status
      console.log(`Using default filing status: ${userFilingStatus}`);
    }
    
    // Save the user's preferences for future use using the memory store
    await memoryStore.saveTaxPreferences(userId, {
      state: userState,
      filingStatus: userFilingStatus
    });
    
    // Also store tax-related facts for long-term memory
    await memoryStore.storeUserFact(userId, 'tax', 'filingState', userState);
    await memoryStore.storeUserFact(userId, 'tax', 'filingStatus', userFilingStatus);
    
    // If we have a conversation history, store it for future reference
    if (conversationHistory && conversationHistory.length > 0) {
      await memoryStore.storeConversation(userId, conversationHistory, {
        type: 'tax_query',
        state: userState,
        filingStatus: userFilingStatus,
        period: taxPeriod,
        year: taxYear
      });
    }
    
    // Normalize period input (Q1, Q2, etc.)
    if (!taxPeriod) {
      taxPeriod = getCurrentQuarter();
      console.log(`Using current quarter: ${taxPeriod}`);
    } else {
      taxPeriod = normalizePeriod(taxPeriod);
    }
    
    // Get user profile for additional context
    const userProfile = await memoryStore.getUserProfile(userId);
    
    // If we don't have a profile yet, create a basic one
    if (!userProfile) {
      await memoryStore.saveUserProfile(userId, {
        taxPreferences: {
          state: userState,
          filingStatus: userFilingStatus
        },
        lastActivity: new Date().toISOString(),
        facts: {
          tax: {
            filingState: userState,
            filingStatus: userFilingStatus
          }
        }
      });
    }
    
    // For this demo/prototype, we'll generate mock tax data
    // In a real app, you would calculate this based on actual financial data
    
    let mockData = null;
    
    // Check if we should use mock data (for demo/development)
    const hasMockDataForPeriod = taxPeriod === 'Q1' || taxPeriod === 'Q2' || taxPeriod === 'Q3' || taxPeriod === 'Q4';
    
    if (!await userHasTransactions(userId) || hasMockDataForPeriod) {
      mockData = generateMockData(taxPeriod, userState);
    }
    
    // Calculate tax estimation (using mock data for now)
    const taxEstimation = calculateTaxEstimation(
      mockData, 
      userState, 
      userFilingStatus,
      taxPeriod,
      taxYear
    );
    
    // Return the tax estimation results
    return NextResponse.json({
      success: true,
      userId,
      state: userState,
      filingStatus: userFilingStatus,
      period: taxPeriod,
      year: taxYear,
      taxEstimation
    });
    
  } catch (error) {
    console.error('Error calculating tax estimation:', error);
    return NextResponse.json(
      { error: 'Failed to calculate tax estimation' },
      { status: 500 }
    );
  }
}

// Normalize filing status to standard formats
function normalizeFilingStatus(status) {
  if (!status) return null;
  
  const normalized = status.toString().trim();
  const lowerNormalized = normalized.toLowerCase();
  
  // Handle common filing status formats
  if (lowerNormalized === 'single') {
    return 'Single';
  } else if (lowerNormalized === 'married filing jointly' || lowerNormalized.includes('married') && lowerNormalized.includes('joint')) {
    return 'Married Filing Jointly';
  } else if (lowerNormalized === 'married filing separately' || (lowerNormalized.includes('married') && lowerNormalized.includes('separate'))) {
    return 'Married Filing Separately';
  } else if (lowerNormalized === 'head of household' || (lowerNormalized.includes('head') && lowerNormalized.includes('household'))) {
    return 'Head of Household';
  } else if (lowerNormalized === 'married') {
    // Default to joint if just "married" is specified
    return 'Married Filing Jointly';
  }
  
  // If we can't normalize it, default to Single
  console.log(`Could not normalize filing status: ${status}, defaulting to Single`);
  return 'Single';
}

// Get the current quarter based on the current month
function getCurrentQuarter() {
  const month = new Date().getMonth();
  
  // Map months to quarters (0-indexed months: Jan=0, Feb=1, etc.)
  if (month <= 2) return 'Q1';
  if (month <= 5) return 'Q2';
  if (month <= 8) return 'Q3';
  return 'Q4';
}

// Normalize period input to standard format (Q1, Q2, Q3, Q4)
function normalizePeriod(period) {
  if (!period) return getCurrentQuarter();
  
  const normalized = period.toString().trim().toUpperCase();
  
  // Handle various formats
  if (normalized === 'Q1' || normalized === '1' || normalized === 'FIRST' || normalized === 'FIRST QUARTER') {
    return 'Q1';
  } else if (normalized === 'Q2' || normalized === '2' || normalized === 'SECOND' || normalized === 'SECOND QUARTER') {
    return 'Q2';
  } else if (normalized === 'Q3' || normalized === '3' || normalized === 'THIRD' || normalized === 'THIRD QUARTER') {
    return 'Q3';
  } else if (normalized === 'Q4' || normalized === '4' || normalized === 'FOURTH' || normalized === 'FOURTH QUARTER') {
    return 'Q4';
  } else {
    // Default to current quarter if input can't be normalized
    console.log(`Could not normalize period: ${period}, using current quarter`);
    return getCurrentQuarter();
  }
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Check if user has transaction data
async function userHasTransactions(userId) {
  try {
    if (!userId) {
      return false;
    }
    
    console.log(`Checking if user ${userId} has transaction data`);
    
    // For demo purposes, we'll use a mock implementation
    // In a real app, this would query your transactions database
    
    // Example of a real implementation:
    // const snapshot = await db.collection('transactions')
    //   .where('userId', '==', userId)
    //   .limit(1)
    //   .get();
    // return !snapshot.empty;
    
    // For demo purposes, return false to trigger mock data generation
    return userId.includes('has-transactions');
  } catch (error) {
    console.error('Error checking user transactions:', error);
    return false;
  }
}

// Generate mock financial data based on quarter
function generateMockData(period, state) {
  // Different scenarios for different quarters
  switch(period) {
    case 'Q1':
      // Q1: Profitable quarter scenario
      return {
        income: {
          total: 12000,
          sources: [
            { name: "Freelance", amount: 8000 },
            { name: "Salary", amount: 4000 }
          ]
        },
        expenses: {
          total: 3000,
          categories: [
            { name: "Business", amount: 1500 },
            { name: "Home Office", amount: 800 },
            { name: "Software", amount: 700 }
          ]
        }
      };
      
    case 'Q2':
      // Q2: Break-even scenario
      return {
        income: {
          total: 9000,
          sources: [
            { name: "Freelance", amount: 5000 },
            { name: "Salary", amount: 4000 }
          ]
        },
        expenses: {
          total: 9000,
          categories: [
            { name: "Business", amount: 4500 },
            { name: "Equipment", amount: 3500 },
            { name: "Software", amount: 1000 }
          ]
        }
      };
      
    case 'Q3':
      // Q3: Loss scenario (no tax owed)
      return {
        income: {
          total: 6000,
          sources: [
            { name: "Freelance", amount: 2000 },
            { name: "Salary", amount: 4000 }
          ]
        },
        expenses: {
          total: 10000,
          categories: [
            { name: "Business", amount: 5500 },
            { name: "Travel", amount: 3500 },
            { name: "Software", amount: 1000 }
          ]
        }
      };
      
    case 'Q4':
      // Q4: Highly profitable quarter
      return {
        income: {
          total: 25000,
          sources: [
            { name: "Freelance", amount: 15000 },
            { name: "Salary", amount: 5000 },
            { name: "Year-end Bonus", amount: 5000 }
          ]
        },
        expenses: {
          total: 7000,
          categories: [
            { name: "Business", amount: 3500 },
            { name: "Marketing", amount: 2500 },
            { name: "Software", amount: 1000 }
          ]
        }
      };
      
    default:
      // Default to Q1 data
      return generateMockData('Q1', state);
  }
}

// Calculate tax estimation based on financial data
function calculateTaxEstimation(data, state, filingStatus, period, year) {
  // Use the provided data or default to empty objects
  const incomeData = data?.income || { total: 0, sources: [] };
  const expenseData = data?.expenses || { total: 0, categories: [] };
  
  // Normalize filing status
  const normalizedFilingStatus = normalizeFilingStatus(filingStatus) || 'Single';
  
  // Tax rates (simplified) - these would be more complex in a real app
  // Different rates based on filing status
  let federalTaxRate = 0.24; // Base rate for Single
  
  // Adjust federal tax rate based on filing status
  if (normalizedFilingStatus === 'Married Filing Jointly') {
    federalTaxRate = 0.22; // Lower rate for joint filers (simplified)
  } else if (normalizedFilingStatus === 'Married Filing Separately') {
    federalTaxRate = 0.24; // Similar to Single but with different brackets in reality
  } else if (normalizedFilingStatus === 'Head of Household') {
    federalTaxRate = 0.23; // Between Single and MFJ (simplified)
  }
  
  const stateTaxRates = {
    "Delaware": 0.066,
    "California": 0.093,
    "Texas": 0,
    "New York": 0.065,
    "Florida": 0,
    "Georgia": 0.057,
    "Colorado": 0.0455,
    "Arizona": 0.025,
    "Washington": 0,
    "Nevada": 0,
    "Oregon": 0.095,
    "Illinois": 0.0495,
    "Pennsylvania": 0.0307,
    "New Jersey": 0.0637,
    "Massachusetts": 0.05,
    "Connecticut": 0.0699,
    // Add more states as needed
  };
  
  // Ensure state is valid or use default
  const validState = state && stateTaxRates.hasOwnProperty(state) 
    ? state 
    : "California";
  const stateTaxRate = stateTaxRates[validState];
  
  // Calculate tax amounts
  const netIncome = incomeData.total - expenseData.total;
  const taxableIncome = Math.max(0, netIncome); // Cannot be negative
  
  // Standard deduction varies by filing status (simplified for 2023)
  let standardDeduction = 13850; // Single filer deduction for 2023
  
  if (normalizedFilingStatus === 'Married Filing Jointly') {
    standardDeduction = 27700; // Joint filers for 2023
  } else if (normalizedFilingStatus === 'Head of Household') {
    standardDeduction = 20800; // Head of Household for 2023
  } else if (normalizedFilingStatus === 'Married Filing Separately') {
    standardDeduction = 13850; // Same as Single for 2023
  }
  
  // Apply standard deduction for a more realistic calculation
  const taxableIncomeAfterDeduction = Math.max(0, taxableIncome - standardDeduction / 4); // Divide by 4 for quarterly
  
  // Calculate tax components
  const federalTax = taxableIncomeAfterDeduction * federalTaxRate;
  const stateTax = taxableIncomeAfterDeduction * stateTaxRate;
  
  // Self-employment tax (15.3% of 92.35% of net earnings)
  const isSelfEmployed = incomeData.sources.some(source => 
    source.name.toLowerCase().includes("freelance") || 
    source.name.toLowerCase().includes("self-employed") ||
    source.name.toLowerCase().includes("consulting")
  );
  
  const selfEmploymentIncome = isSelfEmployed 
    ? incomeData.sources
        .filter(source => 
          source.name.toLowerCase().includes("freelance") || 
          source.name.toLowerCase().includes("self-employed") ||
          source.name.toLowerCase().includes("consulting")
        )
        .reduce((sum, source) => sum + source.amount, 0)
    : 0;
  
  const selfEmploymentTax = selfEmploymentIncome > 0 
    ? selfEmploymentIncome * 0.9235 * 0.153 
    : 0;
  
  // Total estimated tax
  const estimatedTax = federalTax + stateTax + selfEmploymentTax;
  
  // Effective tax rate
  const taxRate = taxableIncomeAfterDeduction > 0 
    ? (estimatedTax / taxableIncomeAfterDeduction) * 100 
    : 0;
  
  // Prepare explanation based on the scenario
  let explanation;
  
  if (taxableIncomeAfterDeduction <= 0) {
    // No tax owed scenario
    explanation = `Based on your reported income of ${formatCurrency(incomeData.total)} and expenses of ${formatCurrency(expenseData.total)} for ${period} ${year}, you don't owe any estimated taxes for this quarter because your expenses exceed your income.`;
  } else {
    // Standard tax explanation
    explanation = `Your estimated tax is based on ${formatCurrency(incomeData.total)} of income and ${formatCurrency(expenseData.total)} of deductible expenses for ${period} ${year}, resulting in ${formatCurrency(taxableIncomeAfterDeduction)} of taxable income after standard deduction.`;
    
    // Add filing status to explanation
    explanation += `\n\nAs someone filing as ${normalizedFilingStatus} in ${validState}, your tax rate includes ${(federalTaxRate * 100).toFixed(1)}% federal tax and ${(stateTaxRate * 100).toFixed(1)}% state tax.`;
    
    // Add detailed breakdown
    explanation += `\n\nDetailed calculation:\n
• Gross Income: ${formatCurrency(incomeData.total)}
• Deductible Expenses: ${formatCurrency(expenseData.total)}
• Net Income: ${formatCurrency(taxableIncome)}
• Standard Deduction (${normalizedFilingStatus}): ${formatCurrency(standardDeduction / 4)} (quarterly portion)
• Taxable Income: ${formatCurrency(taxableIncomeAfterDeduction)}
• Federal Tax (${(federalTaxRate * 100).toFixed(1)}%): ${formatCurrency(federalTax)}
• ${validState} State Tax (${(stateTaxRate * 100).toFixed(1)}%): ${formatCurrency(stateTax)}`;
    
    if (selfEmploymentTax > 0) {
      explanation += `\n• Self-Employment Tax (15.3% of 92.35% of ${formatCurrency(selfEmploymentIncome)}): ${formatCurrency(selfEmploymentTax)}
• SE Tax Breakdown: 12.4% for Social Security + 2.9% for Medicare`;
    }
    
    // Include breakdown of business expenses if present
    if (expenseData.categories && expenseData.categories.length > 0) {
      explanation += "\n\nDeductible expense breakdown:";
      expenseData.categories.forEach(category => {
        explanation += `\n• ${category.name}: ${formatCurrency(category.amount)}`;
      });
    }
    
    // Add income source breakdown
    explanation += "\n\nIncome source breakdown:";
    incomeData.sources.forEach(source => {
      explanation += `\n• ${source.name}: ${formatCurrency(source.amount)}`;
    });
    
    // Add estimated quarterly payment info
    explanation += `\n\nYour total estimated quarterly payment of ${formatCurrency(estimatedTax)} should be made by the quarterly deadline for ${period}.`;
  }
  
  // Return the tax estimation object
  return {
    estimatedTax: parseFloat(estimatedTax.toFixed(2)),
    federalTax: parseFloat(federalTax.toFixed(2)),
    stateTax: parseFloat(stateTax.toFixed(2)),
    selfEmploymentTax: parseFloat(selfEmploymentTax.toFixed(2)),
    taxableIncome: parseFloat(taxableIncomeAfterDeduction.toFixed(2)),
    grossIncome: parseFloat(incomeData.total.toFixed(2)),
    expenses: parseFloat(expenseData.total.toFixed(2)),
    taxRate: parseFloat(taxRate.toFixed(2)),
    explanation,
    data: {
      income: incomeData,
      expenses: expenseData
    }
  };
}