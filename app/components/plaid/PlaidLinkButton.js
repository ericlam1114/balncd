'use client';

import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

export function PlaidLinkButton({ className }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const createLinkToken = async () => {
    setLoading(true);
    try {
      // Get user's Firebase auth token
      const idToken = await user.getIdToken();
      
      // Call our API endpoint to create a link token
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
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

  // Handle Plaid Link success
  const onSuccess = useCallback(async (publicToken, metadata) => {
    toast({
      title: 'Account connected',
      description: 'Processing your financial data...',
    });
    
    try {
      const idToken = await user.getIdToken();
      
      // Exchange public token for access token and process account data
      const response = await fetch('/api/plaid/process-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          publicToken, 
          metadata 
        }),
      });
      
      if (!response.ok) throw new Error('Failed to process accounts');
      
      const result = await response.json();
      
      toast({
        title: 'Success!',
        description: `Connected ${result.accountsCount} accounts`,
      });
      
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Error processing accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your accounts',
        variant: 'destructive',
      });
    }
  }, [user, toast, router]);

  // Initialize Plaid Link
  const config = {
    token: null, // Will be set when the button is clicked
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