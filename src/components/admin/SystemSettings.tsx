'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface SystemSetting {
  key: string;
  label: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number' | 'select';
  options?: string[];
  description?: string;
  category: 'general' | 'security' | 'notifications' | 'performance';
}

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('general');

  useEffect(() => {
    // Initialize with default settings
    setSettings([
      {
        key: 'site_name',
        label: 'Site Name',
        value: 'Astral Mental Health Platform',
        type: 'string',
        category: 'general',
        description: 'The name displayed in the browser title and header'
      },
      {
        key: 'maintenance_mode',
        label: 'Maintenance Mode',
        value: false,
        type: 'boolean',
        category: 'general',
        description: 'Enable to put the site in maintenance mode'
      },
      {
        key: 'session_timeout',
        label: 'Session Timeout (minutes)',
        value: 60,
        type: 'number',
        category: 'security',
        description: 'How long user sessions remain active'
      },
      {
        key: 'password_policy',
        label: 'Password Policy',
        value: 'strict',
        type: 'select',
        options: ['basic', 'moderate', 'strict'],
        category: 'security',
        description: 'Password complexity requirements'
      },
      {
        key: 'email_notifications',
        label: 'Email Notifications',
        value: true,
        type: 'boolean',
        category: 'notifications',
        description: 'Enable email notifications for system events'
      },
      {
        key: 'cache_enabled',
        label: 'Cache Enabled',
        value: true,
        type: 'boolean',
        category: 'performance',
        description: 'Enable caching to improve performance'
      }
    ]);
  }, []);

  const categories = [
    { key: 'general', label: 'General' },
    { key: 'security', label: 'Security' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'performance', label: 'Performance' }
  ];

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Settings saved:', settings);
    } finally {
      setLoading(false);
    }
  };

  const filteredSettings = settings.filter(setting => setting.category === activeCategory);

  const renderSettingInput = (setting: SystemSetting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={setting.value as boolean}
              onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        );
      case 'number':
        return (
          <input
            type="number"
            value={setting.value as number}
            onChange={(e) => handleSettingChange(setting.key, parseInt(e.target.value))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        );
      case 'select':
        return (
          <select
            value={setting.value as string}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {setting.options?.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={setting.value as string}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        );
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">System Settings</h1>
        <p className="text-gray-600">Configure system-wide settings and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Category Navigation */}
        <div className="w-64">
          <Card className="p-4">
            <nav className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setActiveCategory(category.key)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeCategory === category.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {categories.find(c => c.key === activeCategory)?.label} Settings
              </h2>
            </div>

            <div className="space-y-6">
              {filteredSettings.map((setting) => (
                <div key={setting.key} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        {setting.label}
                      </label>
                      {setting.description && (
                        <p className="text-sm text-gray-500 mb-3">{setting.description}</p>
                      )}
                    </div>
                    <div className="w-64">
                      {renderSettingInput(setting)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="px-6"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;