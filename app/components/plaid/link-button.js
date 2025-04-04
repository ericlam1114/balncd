'use client';

import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export function PlaidLinkButton({ className }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const createLinkToken = async () => {
    setLoading(true);
    try {
      // Call our API endpoint to create a link token
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
      });
      
      if (!response.ok) throw new Error('Failed to create link token');
      
      const data = await response.json();
      return data.linkToken;
    } catch (error) {
      console.error('Error creating link token:', error);
      toast({
        title: 'Error',
        description: 'Could not initialize bank connection',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle success
  const onSuccess = useCallback(async (publicToken, metadata) => {
    toast({
      title: 'Account connected',
      description: 'Processing your financial data...',
    });
    
    try {
      // Call the Firebase function to process the Plaid connection
      const processPlaidConnection = httpsCallable(functions, 'processPlaidConnection');
      const result = await processPlaidConnection({ publicToken });
      
      toast({
        title: 'Success!',
        description: `Connected ${result.data.accountsCount} accounts`,
      });
      
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Error processing Plaid connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your accounts',
        variant: 'destructive',
      });
    }
  }, [toast, router]);

  // Initialize Plaid Link
  const config = {
    token: null,
    onSuccess,
    onExit: () => {
      toast({
        title: 'Connection canceled',
        description: 'You canceled the account connection process.',
      });
    },
  };

  const { open, ready } = usePlaidLink(config);

  const handleConnect = async () => {
    const token = await createLinkToken();
    if (token) {
      config.token = token;
      open();
    }
  };

  return (
    <Button 
      className={className} 
      onClick={handleConnect}
      disabled={loading || !ready || !user}
    >
      {loading ? 'Connecting...' : 'Connect Bank Account'}
    </Button>
  );
}