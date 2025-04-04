'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, subMonths, parseISO, isBefore, isAfter } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Empty } from '@/components/dashboard/empty';

export default function InsightsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [activeTimeframe, setActiveTimeframe] = useState('3m'); // 1m, 3m, 6m, 1y
  const [insights, setInsights] = useState({
    topCategories: [],
    dailySpending: [],
    monthlyTotals: [],
    largestTransactions: [],
    savingsRate: 0,
    recurringExpenses: [],
  });

  // Date ranges based on timeframe
  const getDateRange = (timeframe) => {
    const today = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1m':
        startDate = subMonths(today, 1);
        break;
      case '3m':
        startDate = subMonths(today, 3);
        break;
      case '6m':
        startDate = subMonths(today, 6);
        break;
      case '1y':
        startDate = subMonths(today, 12);
        break;
      default:
        startDate = subMonths(today, 3);
    }
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd'),
    };
  };

  // Category colors
  const CATEGORY_COLORS = {
    'Food and Drink': '#3b82f6',
    'Shopping': '#10b981',
    'Travel': '#f59e0b',
    'Transportation': '#8b5cf6',
    'Housing': '#ec4899',
    'Entertainment': '#f43f5e',
    'Health': '#14b8a6',
    'Personal Care': '#d946ef',
    'Education': '#6366f1',
    'Bills and Utilities': '#64748b',
    'Income': '#22c55e',
    'Transfer': '#94a3b8',
    'Subscription': '#0ea5e9',
    'Other': '#9ca3af',
    'Uncategorized': '#e5e5e5',
  };

  // Fetch transaction data
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.uid) return;
      
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(activeTimeframe);
        
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        
        const querySnapshot = await getDocs(transactionsQuery);
        const transactionData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setTransactions(transactionData);
        
        // Generate insights based on transaction data
        generateInsights(transactionData);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [user, activeTimeframe]);

  // Generate insights from transaction data
  const generateInsights = (transactionData) => {
    // Top spending categories
    const categories = {};
    
    // Separate expenses from income
    const expenses = transactionData.filter(tx => tx.amount > 0);
    const income = transactionData.filter(tx => tx.amount < 0);
    
    // Process expense categories
    expenses.forEach(tx => {
      const category = tx.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = { totalAmount: 0, count: 0 };
      }
      categories[category].totalAmount += tx.amount;
      categories[category].count++;
    });
    
    // Convert to array for charts
    const topCategories = Object.entries(categories)
      .map(([category, data]) => ({
        name: category,
        value: parseFloat(data.totalAmount.toFixed(2)),
        count: data.count,
        color: CATEGORY_COLORS[category] || '#e5e5e5',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    // Monthly totals
    const monthlyGroups = {};
    
    transactionData.forEach(tx => {
      const month = tx.date.substring(0, 7); // YYYY-MM
      
      if (!monthlyGroups[month]) {
        monthlyGroups[month] = { income: 0, expenses: 0 };
      }
      
      if (tx.amount < 0) {
        // Income
        monthlyGroups[month].income += Math.abs(tx.amount);
      } else {
        // Expense
        monthlyGroups[month].expenses += tx.amount;
      }
    });
    
    const monthlyTotals = Object.entries(monthlyGroups)
      .map(([month, data]) => ({
        month: format(parseISO(month + '-01'), 'MMM yyyy'),
        income: parseFloat(data.income.toFixed(2)),
        expenses: parseFloat(data.expenses.toFixed(2)),
        net: parseFloat((data.income - data.expenses).toFixed(2)),
      }))
      .sort((a, b) => parseISO(a.month) - parseISO(b.month));
    
    // Largest transactions
    const largestTransactions = [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    // Calculate savings rate
    const totalIncome = income.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0);
    const savingsRate = totalIncome > 0 
      ? parseFloat(((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1))
      : 0;
    
    // Daily spending average
    const dailyGroups = {};
    expenses.forEach(tx => {
      if (!dailyGroups[tx.date]) {
        dailyGroups[tx.date] = 0;
      }
      dailyGroups[tx.date] += tx.amount;
    });
    
    const dailySpending = Object.entries(dailyGroups)
      .map(([date, amount]) => ({
        date,
        amount: parseFloat(amount.toFixed(2)),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Identify recurring expenses (simplified)
    const potentialRecurring = {};
    
    expenses.forEach(tx => {
      const key = `${tx.name.toLowerCase().trim()}-${Math.round(tx.amount)}`;
      
      if (!potentialRecurring[key]) {
        potentialRecurring[key] = {
          name: tx.name,
          amount: tx.amount,
          category: tx.category,
          occurrences: 0,
          dates: [],
        };
      }
      
      potentialRecurring[key].occurrences++;
      potentialRecurring[key].dates.push(tx.date);
    });
    
    // Filter to likely recurring (3+ occurrences)
    const recurringExpenses = Object.values(potentialRecurring)
      .filter(item => item.occurrences >= 3)
      .map(item => ({
        ...item,
        monthlyEstimate: parseFloat(item.amount.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount);
    
    setInsights({
      topCategories,
      dailySpending,
      monthlyTotals,
      largestTransactions,
      savingsRate,
      recurringExpenses,
    });
  };

  const handleTimeframeChange = (timeframe) => {
    setActiveTimeframe(timeframe);
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Empty 
        title="No Transaction Data" 
        description="Connect your accounts and add transactions to see insights"
        action={
          <Button asChild>
            <a href="/connect-accounts">Connect Accounts</a>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-medium">Financial Insights</h1>
        
        <div className="flex gap-2">
          <Button 
            variant={activeTimeframe === '1m' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => handleTimeframeChange('1m')}
          >
            1 Month
          </Button>
          <Button 
            variant={activeTimeframe === '3m' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimeframeChange('3m')}
          >
            3 Months
          </Button>
          <Button 
            variant={activeTimeframe === '6m' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimeframeChange('6m')}
          >
            6 Months
          </Button>
          <Button 
            variant={activeTimeframe === '1y' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimeframeChange('1y')}
          >
            1 Year
          </Button>
        </div>
      </div>
      
      {/* Savings Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Savings Rate</CardTitle>
          <CardDescription>
            The percentage of your income saved after expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">
                {insights.savingsRate}%
              </div>
              <p className="text-sm text-gray-500">
                {insights.savingsRate >= 20 ? 'Excellent' : 
                  insights.savingsRate >= 10 ? 'Good' : 
                  insights.savingsRate >= 0 ? 'Needs Improvement' : 
                  'Spending Exceeds Income'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Spending Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Spending Categories</CardTitle>
            <CardDescription>
              Where your money went during this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insights.topCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {insights.topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Monthly Income vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Income vs Expenses</CardTitle>
            <CardDescription>
              Your cash flow trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.monthlyTotals}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#10b981" />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Largest Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Largest Transactions</CardTitle>
            <CardDescription>
              Your biggest expenses in this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.largestTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{tx.name}</p>
                    <p className="text-sm text-gray-500">
                      {tx.date} • {tx.category}
                    </p>
                  </div>
                  <p className="font-medium text-rose-600">
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Recurring Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Recurring Expenses</CardTitle>
            <CardDescription>
              Regular payments detected in your transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.recurringExpenses.slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.category} • {item.occurrences} occurrences
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}