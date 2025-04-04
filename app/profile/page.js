'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    accountsCount: 0,
    transactionsCount: 0,
    joinedDate: null,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      
      try {
        // Get user document
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
        
        // Get accounts count
        const accountsQuery = query(
          collection(db, 'accounts'),
          where('userId', '==', user.uid)
        );
        const accountsSnapshot = await getDocs(accountsQuery);
        
        // Get transactions count
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        
        setStats({
          accountsCount: accountsSnapshot.size,
          transactionsCount: transactionsSnapshot.size,
          joinedDate: userDoc.data()?.createdAt?.toDate() || new Date(),
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-2xl font-medium">Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                  <AvatarFallback className="text-xl">
                    {getInitials(user?.displayName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{user?.displayName}</h2>
                <p className="text-gray-500">{user?.email}</p>
                
                <div className="mt-6 w-full">
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/settings">Edit Profile</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 pb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.accountsCount}</p>
                  <p className="text-sm text-gray-500">Connected Accounts</p>
                  </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.transactionsCount}</p>
                  <p className="text-sm text-gray-500">Transactions</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{
                    stats.joinedDate ? 
                    format(stats.joinedDate, 'MMM yyyy') : 
                    'N/A'
                  }</p>
                  <p className="text-sm text-gray-500">Member Since</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Email Address</p>
                <p>{user?.email}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Member Since</p>
                <p>{stats.joinedDate ? format(stats.joinedDate, 'MMMM d, yyyy') : 'N/A'}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Connected Accounts</p>
                <p>{stats.accountsCount} accounts</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Tracked Transactions</p>
                <p>{stats.transactionsCount} transactions</p>
              </div>
              
              <div className="pt-4">
                <Button asChild>
                  <a href="/dashboard">View Dashboard</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}