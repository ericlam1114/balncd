'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../providers/auth-provider';
import { motion } from 'framer-motion';
import { format, subMonths } from 'date-fns';

export function VibeScore({ income, expenses }) {
  const { user } = useAuth();
  const [vibeScore, setVibeScore] = useState({
    score: 0,
    message: 'Calculating...',
    emoji: '⏳',
    factors: {
      spendingToIncome: 0,
      uncategorizedRatio: 0,
      consistency: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const calculateVibeScore = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const startDate = format(subMonths(today, 1), 'yyyy-MM-dd');
        const endDate = format(today, 'yyyy-MM-dd');

        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        
        const querySnapshot = await getDocs(transactionsQuery);
        const transactions = querySnapshot.docs.map(doc => doc.data());
        
        // Calculate spending to income ratio (lower is better)
        const spendingToIncomeRatio = expenses / (income || 1); // Avoid division by zero
        let spendingToIncomeScore = 0;
        
        if (spendingToIncomeRatio <= 0.5) {
          spendingToIncomeScore = 100; // Excellent - spending less than 50% of income
        } else if (spendingToIncomeRatio <= 0.7) {
          spendingToIncomeScore = 80; // Good - spending between 50-70% of income
        } else if (spendingToIncomeRatio <= 0.9) {
          spendingToIncomeScore = 60; // Fair - spending between 70-90% of income
        } else if (spendingToIncomeRatio <= 1) {
          spendingToIncomeScore = 40; // Poor - spending between 90-100% of income
        } else {
          spendingToIncomeScore = 20; // Critical - spending more than income
        }
        
        // Calculate uncategorized transactions ratio (lower is better)
        const uncategorizedTransactions = transactions.filter(
          tx => tx.category === 'Uncategorized' && tx.amount > 0 // Only count expenses
        ).length;
        const totalExpenseTransactions = transactions.filter(tx => tx.amount > 0).length;
        const uncategorizedRatio = uncategorizedTransactions / (totalExpenseTransactions || 1);
        let uncategorizedScore = 100 - (uncategorizedRatio * 100);
        
        // Calculate spending consistency (higher is better)
        // Group transactions by date to get daily spending
        const dailySpending = {};
        
        transactions.forEach(tx => {
          if (tx.amount > 0) { // Only count expenses
            if (!dailySpending[tx.date]) {
              dailySpending[tx.date] = 0;
            }
            dailySpending[tx.date] += tx.amount;
          }
        });
        
        // Calculate standard deviation of daily spending
        const dailyAmounts = Object.values(dailySpending);
        
        let consistencyScore = 50; // Default value
        
        if (dailyAmounts.length > 0) {
          const meanDailySpending = dailyAmounts.reduce((sum, val) => sum + val, 0) / dailyAmounts.length;
          
          const variance = dailyAmounts.reduce(
            (sum, val) => sum + Math.pow(val - meanDailySpending, 2), 
            0
          ) / dailyAmounts.length;
          
          const stdDeviation = Math.sqrt(variance);
          const coefficientOfVariation = meanDailySpending > 0 ? stdDeviation / meanDailySpending : 0;
          
          // Convert coefficient of variation to a score (lower variation is better)
          if (coefficientOfVariation <= 0.2) {
            consistencyScore = 100; // Very consistent
          } else if (coefficientOfVariation <= 0.4) {
            consistencyScore = 80; // Fairly consistent
          } else if (coefficientOfVariation <= 0.6) {
            consistencyScore = 60; // Somewhat inconsistent
          } else if (coefficientOfVariation <= 0.8) {
            consistencyScore = 40; // Inconsistent
          } else {
            consistencyScore = 20; // Very inconsistent
          }
        }
        
        // Calculate overall vibe score (weighted average)
        const weights = {
          spendingToIncome: 0.5,
          uncategorized: 0.2,
          consistency: 0.3,
        };
        
        const overallScore = Math.round(
          spendingToIncomeScore * weights.spendingToIncome +
          uncategorizedScore * weights.uncategorized +
          consistencyScore * weights.consistency
        );
        
        // Determine vibe level
        let vibeEmoji;
        let vibeMessage;
        
        if (overallScore >= 90) {
          vibeEmoji = '🧘';
          vibeMessage = 'Financial Zen Master';
        } else if (overallScore >= 80) {
          vibeEmoji = '⚖️';
          vibeMessage = 'Beautifully Balanced';
        } else if (overallScore >= 70) {
          vibeEmoji = '🌱';
          vibeMessage = 'Grounded & Growing';
        } else if (overallScore >= 60) {
          vibeEmoji = '👀';
          vibeMessage = 'Financially Aware';
        } else if (overallScore >= 50) {
          vibeEmoji = '📚';
          vibeMessage = 'Learning the Flow';
        } else {
          vibeEmoji = '🌪️';
          vibeMessage = 'Chaotic but Creative';
        }
        
        setVibeScore({
          score: overallScore,
          message: vibeMessage,
          emoji: vibeEmoji,
          factors: {
            spendingToIncome: spendingToIncomeScore,
            uncategorizedRatio: uncategorizedScore,
            consistency: consistencyScore,
          },
        });
      } catch (error) {
        console.error('Error calculating vibe score:', error);
      } finally {
        setLoading(false);
      }
    };
    
    calculateVibeScore();
  }, [user, income, expenses]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Vibe Score</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="relative flex items-center justify-center mb-4"
            >
              <div className="absolute text-6xl">{vibeScore.emoji}</div>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: vibeScore.score / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={getScoreColor(vibeScore.score)}
                  strokeDasharray="339.292"
                  strokeDashoffset="339.292"
                  transform="rotate(-90 60 60)"
                />
              </svg>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <h3 className={`text-2xl font-bold ${getScoreColor(vibeScore.score)}`}>
                {vibeScore.message}
              </h3>
              <p className="text-gray-500 mt-1">
                Score: {vibeScore.score}/100
              </p>
            </motion.div>
            
            <div className="grid grid-cols-3 gap-4 w-full mt-6">
              <div className="text-center">
                <p className="text-xs text-gray-500">Spending</p>
                <p className={`font-medium ${getScoreColor(vibeScore.factors.spendingToIncome)}`}>
                  {vibeScore.factors.spendingToIncome}/100
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Organization</p>
                <p className={`font-medium ${getScoreColor(vibeScore.factors.uncategorizedRatio)}`}>
                  {vibeScore.factors.uncategorizedRatio}/100
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Consistency</p>
                <p className={`font-medium ${getScoreColor(vibeScore.factors.consistency)}`}>
                  {vibeScore.factors.consistency}/100
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}