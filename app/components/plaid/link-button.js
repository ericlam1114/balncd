'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '../../../providers/auth-provider';
import { Button } from '@/components/ui/button';
import { useToast } from '../../../hooks/use-toast';
import { useRouter } from 'next/navigation';
import { auth } from '../../../lib/firebase';

export function PlaidLinkButton({ className }) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
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
        },
        body: JSON.stringify({
          userId: user?.uid || 'test-user-id',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create link token');
      }
      
      const data = await response.json();
      setToken(data.linkToken);
      return data.linkToken;
    } catch (error) {
      console.error('Error creating link token:', error);
      toast({
        title: 'Error',
        description: 'Could not initialize bank connection: ' + error.message,
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
      // Get Firebase ID token for the current user
      let userId = user?.uid || 'test-user-id';
      
      // Call our API endpoint to process the connection
      const response = await fetch('/api/plaid/process-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          publicToken,
          metadata,
          userId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process accounts');
      }
      
      const result = await response.json();
      
      toast({
        title: 'Success!',
        description: `Connected ${result.accountsCount} accounts`,
      });
      
      // Force a full page refresh to ensure data is reloaded
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error processing Plaid connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your accounts: ' + error.message,
        variant: 'destructive',
      });
    }
  }, [toast, router, user]);

  // Initialize Plaid Link
  const config = {
    token,
    onSuccess,
    onExit: () => {
      setToken(null);
      toast({
        title: 'Connection canceled',
        description: 'You canceled the account connection process.',
      });
    },
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (token && ready) {
      open();
    }
  }, [token, ready, open]);

  const handleConnect = async () => {
    await createLinkToken();
  };

  return (
    <Button 
      className={className} 
      onClick={handleConnect}
      disabled={loading}
    >
      {loading ? 'Connecting...' : 'Connect Bank Account'}
    </Button>
  );
}