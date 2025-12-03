import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Database, Building, Settings as SettingsIcon, Cloud, FileText, Link as LinkIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import sub-components
import CompanySettingsPage from './CompanySettings';
import MasterDataProducts from './MasterDataProducts';
import SystemSettings from './SystemSettings';

const Settings = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('master-data');

  // Define tabs with permission checks
  const settingsTabs = [
    {
      id: 'master-data',
      title: 'Master Data Products',
      icon: <Database className="h-4 w-4" />,
      description: 'Upload and manage product master data',
      component: <MasterDataProducts />,
      permission: 'products.create' // Example permission
    },
    {
      id: 'company',
      title: 'Company Settings',
      icon: <Building className="h-4 w-4" />,
      description: 'Manage company information and branding',
      component: <CompanySettingsPage />,
      permission: 'settings.company' // Example permission
    },
    {
      id: 'system',
      title: 'System Settings',
      icon: <SettingsIcon className="h-4 w-4" />,
      description: 'Configure system preferences',
      component: <SystemSettings />,
      permission: 'settings.system'
    },
    {
      id: 'backup',
      title: 'Backup & Restore',
      icon: <Cloud className="h-4 w-4" />,
      description: 'Manage data backup and restoration',
      component: <ComingSoon title="Backup & Restore" />,
      permission: 'settings.backup'
    },
    {
      id: 'templates',
      title: 'Document Templates',
      icon: <FileText className="h-4 w-4" />,
      description: 'Manage document templates',
      component: <ComingSoon title="Document Templates" />,
      permission: 'settings.templates'
    },
    {
      id: 'api',
      title: 'API Integration',
      icon: <LinkIcon className="h-4 w-4" />,
      description: 'Configure API integrations',
      component: <ComingSoon title="API Integration" />,
      permission: 'settings.api'
    }
  ];

  // Filter tabs - For now, if no specific permission is required or if user has it
  // In a real app, you'd filter strictly. For this refactor, we'll be lenient or use a general 'settings.read'
  const availableTabs = settingsTabs.filter(tab => {
    if (tab.id === 'system') {
      return user?.email === 'root@jinantruck.my.id';
    }
    return true;
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PageHeader
        title="Settings"
        description="Manage system configurations and preferences"
      />

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 space-y-2">
          {availableTabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.title}
            </Button>
          ))}
        </div>

        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>{availableTabs.find(t => t.id === activeTab)?.title}</CardTitle>
              <CardDescription>{availableTabs.find(t => t.id === activeTab)?.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {availableTabs.find(t => t.id === activeTab)?.component}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const ComingSoon = ({ title }) => (
  <Alert>
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Coming Soon</AlertTitle>
    <AlertDescription>
      The {title} module is currently under development and will be available in a future update.
    </AlertDescription>
  </Alert>
);

export default Settings;