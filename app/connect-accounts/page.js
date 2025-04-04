'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { PlaidLinkButton } from '@/components/plaid/link-button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export default function ConnectAccountsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSkip = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Connect Your Accounts</CardTitle>
          <CardDescription>
            Link your bank accounts to start tracking your finances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-md text-sm text-blue-600 flex items-start space-x-2">
            <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>
              Balncd uses Plaid to securely connect to your financial institutions.
              Your banking credentials are never stored on our servers.
            </p>
          </div>
          <PlaidLinkButton className="w-full" />
        </CardContent>
        <CardFooter className="flex justify-center">
        <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}