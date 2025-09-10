'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { toast } from 'react-hot-toast';

interface MfaSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type MfaMethod = 'TOTP' | 'SMS' | 'EMAIL';

interface SetupData {
  method?: MfaMethod;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  phoneNumber?: string;
}

export default function MfaSetup({ onComplete, onCancel }: MfaSetupProps) {
  const [step, setStep] = useState<'select' | 'setup' | 'verify' | 'complete'>('select');
  const [method, setMethod] = useState<MfaMethod | null>(null);
  const [setupData, setSetupData] = useState<SetupData>({});
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const handleMethodSelect = (selectedMethod: MfaMethod) => {
    setMethod(selectedMethod);
    setStep('setup');
    initializeSetup(selectedMethod);
  };

  const initializeSetup = async (selectedMethod: MfaMethod) => {
    setLoading(true);
    try {
      const payload: { method: MfaMethod; phoneNumber?: string } = { method: selectedMethod };

      if (selectedMethod === 'SMS' && phoneNumber) {
        payload.phoneNumber = phoneNumber;
      }

      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setSetupData(data.data);
        if (selectedMethod !== 'TOTP') {
          toast.success(`Verification code sent via ${selectedMethod}`);
        }
      } else {
        toast.error(data.error || 'Setup failed');
      }
    } catch {
      toast.error('Failed to initialize MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      toast.error('Please enter a valid verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          secret: setupData.secret,
          verificationCode,
          backupCodes: setupData.backupCodes,
          phoneNumber: setupData.phoneNumber
        })
      });

      const data = await response.json();

      if (data.success) {
        setStep('complete');
        toast.success('MFA successfully enabled!');
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch {
      toast.error('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (setupData.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedBackupCodes(true);
      toast.success('Backup codes copied to clipboard');
    }
  };

  const downloadBackupCodes = () => {
    if (setupData.backupCodes) {
      const blob = new Blob(
        [
          `Astral Core Backup Codes\n\nSave these codes in a secure location:\n\n${setupData.backupCodes.join('\n')}`
        ],
        { type: 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'astral-core-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (step === 'select') {
    return (
      <Card
        className='max-w-2xl mx-auto'
        role='dialog'
        aria-labelledby='mfa-title'
        aria-describedby='mfa-description'
      >
        <CardHeader>
          <CardTitle id='mfa-title'>Enable Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <p id='mfa-description' className='text-gray-600 dark:text-gray-400 mb-6'>
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>

          <div className='space-y-4' role='radiogroup' aria-labelledby='mfa-title'>
            <button
              onClick={() => handleMethodSelect('TOTP')}
              className='w-full p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              role='radio'
              aria-checked={method === 'TOTP'}
              aria-describedby='totp-description'
            >
              <div className='flex items-start gap-4'>
                <div className='text-3xl' role='img' aria-label='Mobile phone emoji'>
                  📱
                </div>
                <div>
                  <h3 className='font-semibold'>Authenticator App (Recommended)</h3>
                  <p
                    id='totp-description'
                    className='text-sm text-gray-600 dark:text-gray-400 mt-1'
                  >
                    Use an app like Google Authenticator or Authy to generate codes
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                if (!phoneNumber) {
                  toast.error('Please enter your phone number first');
                  return;
                }
                handleMethodSelect('SMS');
              }}
              className='w-full p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              role='radio'
              aria-checked={method === 'SMS'}
              aria-describedby='sms-description'
            >
              <div className='flex items-start gap-4'>
                <div className='text-3xl' role='img' aria-label='Speech bubble emoji'>
                  💬
                </div>
                <div className='flex-1'>
                  <h3 className='font-semibold'>SMS Text Message</h3>
                  <p id='sms-description' className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    Receive codes via text message to your phone
                  </p>
                  {method !== 'SMS' && (
                    <Input
                      type='tel'
                      placeholder='Enter phone number'
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className='mt-2'
                      aria-label='Phone number for SMS verification'
                      aria-required='true'
                    />
                  )}
                </div>
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect('EMAIL')}
              className='w-full p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              role='radio'
              aria-checked={method === 'EMAIL'}
              aria-describedby='email-description'
            >
              <div className='flex items-start gap-4'>
                <div className='text-3xl' role='img' aria-label='Email emoji'>
                  📧
                </div>
                <div>
                  <h3 className='font-semibold'>Email</h3>
                  <p
                    id='email-description'
                    className='text-sm text-gray-600 dark:text-gray-400 mt-1'
                  >
                    Receive codes via email to your registered address
                  </p>
                </div>
              </div>
            </button>
          </div>

          {onCancel && (
            <div className='mt-6 flex justify-end'>
              <Button variant='ghost' onClick={onCancel}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === 'setup' && method === 'TOTP') {
    return (
      <Card className='max-w-2xl mx-auto'>
        <CardHeader>
          <CardTitle>Set Up Authenticator App</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            <div>
              <h3 className='font-medium mb-2'>1. Scan QR Code</h3>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
                Open your authenticator app and scan this QR code:
              </p>
              {setupData.qrCode && (
                <div className='flex justify-center p-4 bg-white rounded-lg'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setupData.qrCode} alt='MFA QR Code' className='w-48 h-48' />
                </div>
              )}
            </div>

            <div>
              <h3 className='font-medium mb-2'>2. Manual Entry</h3>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                Can&apos;t scan? Enter this code manually:
              </p>
              <code className='block p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm break-all'>
                {setupData.secret}
              </code>
            </div>

            <div>
              <h3 className='font-medium mb-2'>3. Enter Verification Code</h3>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                Enter the 6-digit code from your authenticator app:
              </p>
              <Input
                type='text'
                placeholder='000000'
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className='text-center text-2xl tracking-widest'
                maxLength={6}
                aria-label='Enter 6-digit verification code'
                aria-describedby='verification-help'
                inputMode='numeric'
                pattern='[0-9]*'
              />
              <div id='verification-help' className='sr-only'>
                Enter the 6-digit code from your authenticator app
              </div>
            </div>

            <div className='flex justify-between'>
              <Button variant='ghost' onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                onClick={handleVerification}
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'setup' && (method === 'SMS' || method === 'EMAIL')) {
    return (
      <Card className='max-w-2xl mx-auto'>
        <CardHeader>
          <CardTitle>Enter Verification Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            <div>
              <p className='text-gray-600 dark:text-gray-400'>
                We&apos;ve sent a verification code to your {method === 'SMS' ? 'phone' : 'email'}.
                {method === 'SMS' && setupData.phoneNumber && (
                  <span className='font-medium'> (****{setupData.phoneNumber})</span>
                )}
              </p>
            </div>

            <div>
              <label className='block text-sm font-medium mb-2'>Enter the 6-digit code:</label>
              <Input
                type='text'
                placeholder='000000'
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className='text-center text-2xl tracking-widest'
                maxLength={6}
                aria-label='Enter 6-digit verification code'
                aria-describedby='sms-email-verification-help'
                inputMode='numeric'
                pattern='[0-9]*'
              />
              <div id='sms-email-verification-help' className='sr-only'>
                Enter the 6-digit code sent to your {method === 'SMS' ? 'phone' : 'email'}
              </div>
            </div>

            <div className='flex justify-between'>
              <Button variant='ghost' onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                onClick={handleVerification}
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'complete') {
    return (
      <Card className='max-w-2xl mx-auto'>
        <CardHeader>
          <CardTitle>✅ Two-Factor Authentication Enabled!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            <p className='text-gray-600 dark:text-gray-400'>
              Your account is now protected with two-factor authentication.
            </p>

            {setupData.backupCodes && (
              <div className='border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20'>
                <h3 className='font-semibold mb-2'>⚠️ Important: Save Your Backup Codes</h3>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
                  These codes can be used to access your account if you lose your authentication
                  device. Each code can only be used once.
                </p>

                <div className='grid grid-cols-2 gap-2 p-3 bg-white dark:bg-gray-800 rounded mb-4'>
                  {setupData.backupCodes.map((code, index) => (
                    <code key={index} className='text-sm'>
                      {code}
                    </code>
                  ))}
                </div>

                <div className='flex gap-2'>
                  <Button size='sm' onClick={copyBackupCodes}>
                    {copiedBackupCodes ? '✓ Copied' : 'Copy Codes'}
                  </Button>
                  <Button size='sm' variant='secondary' onClick={downloadBackupCodes}>
                    Download Codes
                  </Button>
                </div>
              </div>
            )}

            <div className='flex justify-end'>
              <Button onClick={onComplete || (() => (window.location.href = '/dashboard'))}>
                Continue to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
