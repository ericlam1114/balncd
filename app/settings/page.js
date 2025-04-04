'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    transactions: true,
    insights: true,
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid name',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { 
        displayName 
      });
      
      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        displayName,
        updatedAt: new Date(),
      });
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been updated successfully',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // In a real app, you would save this to Firestore
    toast({
      title: 'Preferences Updated',
      description: 'Your notification preferences have been updated',
    });
  };

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-2xl font-medium">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <form onSubmit={handleProfileUpdate}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={user?.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  Email cannot be changed
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Manage how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">
                  Receive important account updates via email
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={() => handleNotificationChange('email')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Transaction Alerts</p>
                <p className="text-sm text-gray-500">
                  Get notified when new transactions are imported
                </p>
              </div>
              <Switch
                checked={notifications.transactions}
                onCheckedChange={() => handleNotificationChange('transactions')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Insights & Reports</p>
                <p className="text-sm text-gray-500">
                  Receive weekly spending insights and reports
                </p>
              </div>
              <Switch
                checked={notifications.insights}
                onCheckedChange={() => handleNotificationChange('insights')}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Connected Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Manage your connected financial accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                Connected accounts can be managed in the Connect Accounts section.
              </p>
              <Button variant="outline" asChild>
                <a href="/connect-accounts">Manage Connected Accounts</a>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Data Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Data & Privacy</CardTitle>
            <CardDescription>
              Manage your data and privacy preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" asChild>
              <a href="/export-data">Export Your Data</a>
            </Button>
            <Button variant="destructive" className="w-full">
              Delete Account
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Deleting your account will permanently remove all your data. This action cannot be undone.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}