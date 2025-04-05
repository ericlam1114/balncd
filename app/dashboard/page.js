'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../providers/auth-provider';
import { TransactionList } from '../components/dashboard/transaction-list';
import { CashFlowChart } from '../components/dashboard/cash-flow-chart';
import { CategoryChart } from '../components/dashboard/category-chart';
import { VibeScore } from '../components/dashboard/vibe-score';
import { AccountsSummary } from '../components/dashboard/accounts-summary';
import { CSVExport } from '../components/dashboard/csv-export';
import { PlaidLinkButton } from '../components/plaid/link-button';
import { ChatInterface } from '../components/dashboard/chat-interface';
import { Workspace } from '../components/dashboard/workspace';
import { format, subMonths } from 'date-fns';
import { Button } from '../../src/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/tabs';

export default function DashboardPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({
    income: 0,
    expenses: 0,
    totalBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [workspaceContent, setWorkspaceContent] = useState(null);
  const [view, setView] = useState('overview'); // 'overview', 'assistant'

  // Fetch accounts and summary data
  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch accounts
        const accountsQuery = query(
          collection(db, 'accounts'),
          where('userId', '==', user.uid)
        );
        const accountsSnapshot = await getDocs(accountsQuery);
        const accountsData = accountsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAccounts(accountsData);

        // If this is the user's first time connecting accounts, show the assistant view
        if (accountsData.length > 0) {
          const hasVisitedBefore = localStorage.getItem('hasVisitedDashboard');
          if (!hasVisitedBefore) {
            setView('assistant');
            localStorage.setItem('hasVisitedDashboard', 'true');
          }
        }

        // Calculate total balance
        const totalBalance = accountsData.reduce((sum, account) => 
          sum + (account.balance?.current || 0), 0);

        // Calculate income and expenses for the last 30 days
        const today = new Date();
        const startDate = format(subMonths(today, 1), 'yyyy-MM-dd');
        const endDate = format(today, 'yyyy-MM-dd');

        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        
        let income = 0;
        let expenses = 0;
        
        transactionsSnapshot.docs.forEach(doc => {
          const transaction = doc.data();
          if (transaction.amount < 0) {
            // Negative amounts are credits/income in Plaid
            income += Math.abs(transaction.amount);
          } else {
            expenses += transaction.amount;
          }
        });

        setFinancialSummary({
          income,
          expenses,
          totalBalance,
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // If no accounts connected yet
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 mt-10 rounded-lg border border-dashed">
        <h2 className="text-2xl font-medium mb-2">Connect Your First Account</h2>
        <p className="text-gray-500 mb-6 text-center max-w-md">
          Link your bank accounts to start tracking your finances with Balncd
        </p>
        <PlaidLinkButton className="mt-4" />
      </div>
    );
  }

  // Handle workspace content updates from the chat
  const handleWorkspaceUpdate = (content) => {
    setWorkspaceContent(content);
    // Auto-switch to the assistant view when content is updated from chat
    setView('assistant');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-medium">Financial Dashboard</h1>
        <div className="flex items-center gap-4">
          <Tabs value={view} onValueChange={setView} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="assistant">Financial Assistant</TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'overview' && <CSVExport />}
        </div>
      </div>
      
      {view === 'overview' ? (
        // Overview dashboard
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AccountsSummary 
              accounts={accounts} 
              totalBalance={financialSummary.totalBalance} 
            />
            <div className="md:col-span-2">
              <VibeScore 
                income={financialSummary.income} 
                expenses={financialSummary.expenses} 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CashFlowChart />
            <CategoryChart />
          </div>
          
          <TransactionList />
        </div>
      ) : (
        // Financial assistant with chat interface and workspace
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-12rem)]">
          <div className="lg:col-span-2 h-full">
            <ChatInterface onWorkspaceUpdate={handleWorkspaceUpdate} />
          </div>
          <div className="lg:col-span-3 h-full">
            <Workspace content={workspaceContent} />
          </div>
        </div>
      )}
    </div>
  );
}