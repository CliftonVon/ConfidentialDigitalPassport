import React, { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

import { config } from './wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';
import { ErrorBoundary, ErrorMessage } from './components/ErrorHandling';
import { LoadingButton, LoadingOverlay } from './components/Loading';
import { Toast } from './components/Toast';
import { Tabs, TabsContent } from './components/Tabs';
import TransactionHistory from './components/TransactionHistory';

const queryClient = new QueryClient();

function PassportApp() {
  const { address, isConnected } = useAccount();
  const [toast, setToast] = useState({ open: false, title: '', description: '', variant: 'default' });
  const [error, setError] = useState(null);
  const [pendingTx, setPendingTx] = useState(null);

  // Form states
  const [issuePassportForm, setIssuePassportForm] = useState({
    ownerAddress: '',
    age: '',
    nationalId: '',
    citizenshipCode: '',
    encryptedName: '',
    encryptedCountry: '',
    validityYears: '5',
  });

  const [verifierAddress, setVerifierAddress] = useState('');
  const [verificationForm, setVerificationForm] = useState({
    passportId: '',
    purpose: '',
    ageVerification: false,
    nationalityVerification: false,
    identityVerification: false,
  });

  const [ageVerifyForm, setAgeVerifyForm] = useState({ passportId: '', minimumAge: '' });
  const [nationalityVerifyForm, setNationalityVerifyForm] = useState({ passportId: '', countryCode: '' });

  // Contract reads
  const { data: authority } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'authority',
  });

  const { data: nextPassportId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'nextPassportId',
  });

  const { data: isAuthorizedVerifier } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'authorizedVerifiers',
    args: address ? [address] : undefined,
  });

  const { data: myPassportId, refetch: refetchPassportId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getMyPassportId',
    account: address,
  });

  const { data: passportInfo, refetch: refetchPassportInfo } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPassportInfo',
    args: myPassportId && myPassportId > 0n ? [myPassportId] : undefined,
  });

  const { data: isValidPassport } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'isValidPassport',
    args: myPassportId && myPassportId > 0n ? [myPassportId] : undefined,
  });

  const { data: requestCount, refetch: refetchRequestCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getVerificationRequestCount',
    args: myPassportId && myPassportId > 0n ? [myPassportId] : undefined,
  });

  // Contract writes
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const showToast = (title, description, variant = 'default') => {
    setToast({ open: true, title, description, variant });
    setTimeout(() => setToast({ ...toast, open: false }), 5000);
  };

  const handleIssuePassport = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const { ownerAddress, age, nationalId, citizenshipCode, encryptedName, encryptedCountry, validityYears } = issuePassportForm;

      if (!ownerAddress || !age || !nationalId || !citizenshipCode || !encryptedName || !encryptedCountry || !validityYears) {
        throw new Error('Please fill all required fields');
      }

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'issuePassport',
        args: [
          ownerAddress,
          parseInt(age),
          BigInt(nationalId),
          parseInt(citizenshipCode),
          encryptedName,
          encryptedCountry,
          parseInt(validityYears),
        ],
      });

      setPendingTx('Issuing passport...');
      showToast('Transaction Submitted', 'Waiting for blockchain confirmation', 'default');
    } catch (err) {
      setError(err);
      showToast('Error', err.message, 'error');
    }
  };

  const handleAuthorizeVerifier = async () => {
    setError(null);

    try {
      if (!verifierAddress) {
        throw new Error('Please enter verifier address');
      }

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'authorizeVerifier',
        args: [verifierAddress],
      });

      setPendingTx('Authorizing verifier...');
      showToast('Transaction Submitted', 'Authorizing verifier organization', 'default');
    } catch (err) {
      setError(err);
      showToast('Error', err.message, 'error');
    }
  };

  const handleRevokeVerifier = async () => {
    setError(null);

    try {
      if (!verifierAddress) {
        throw new Error('Please enter verifier address');
      }

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'revokeVerifier',
        args: [verifierAddress],
      });

      setPendingTx('Revoking verifier...');
      showToast('Transaction Submitted', 'Revoking verifier access', 'default');
    } catch (err) {
      setError(err);
      showToast('Error', err.message, 'error');
    }
  };

  const handleRequestVerification = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const { passportId, purpose, ageVerification, nationalityVerification, identityVerification } = verificationForm;

      if (!passportId || !purpose) {
        throw new Error('Please fill passport ID and purpose');
      }

      if (!ageVerification && !nationalityVerification && !identityVerification) {
        throw new Error('Please select at least one verification type');
      }

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'requestVerification',
        args: [BigInt(passportId), purpose, ageVerification, nationalityVerification, identityVerification],
      });

      setPendingTx('Requesting verification...');
      showToast('Transaction Submitted', 'Submitting verification request', 'default');
    } catch (err) {
      setError(err);
      showToast('Error', err.message, 'error');
    }
  };

  const handleVerifyAge = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const { passportId, minimumAge } = ageVerifyForm;

      if (!passportId || !minimumAge) {
        throw new Error('Please enter passport ID and minimum age');
      }

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'verifyAge',
        args: [BigInt(passportId), parseInt(minimumAge)],
      });

      setPendingTx('Verifying age...');
      showToast('Transaction Submitted', 'Performing FHE age verification', 'default');
    } catch (err) {
      setError(err);
      showToast('Error', err.message, 'error');
    }
  };

  const handleVerifyNationality = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const { passportId, countryCode } = nationalityVerifyForm;

      if (!passportId || !countryCode) {
        throw new Error('Please enter passport ID and country code');
      }

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'verifyNationality',
        args: [BigInt(passportId), parseInt(countryCode)],
      });

      setPendingTx('Verifying nationality...');
      showToast('Transaction Submitted', 'Performing FHE nationality verification', 'default');
    } catch (err) {
      setError(err);
      showToast('Error', err.message, 'error');
    }
  };

  React.useEffect(() => {
    if (txHash && !isTxPending && pendingTx) {
      showToast('Success', 'Transaction confirmed!', 'success');
      setPendingTx(null);
      // Refetch data
      refetchPassportId();
      refetchPassportInfo();
      refetchRequestCount();
    }
  }, [txHash, isTxPending, pendingTx]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg shadow-xl p-8 text-center max-w-md">
          <h1 className="text-3xl font-bold text-white mb-4">🔐 Digital Passport Platform</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to access the confidential digital passport system</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const isAuthority = authority?.toLowerCase() === address?.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {isTxPending && <LoadingOverlay message={pendingTx || 'Processing transaction...'} />}

      <Toast
        open={toast.open}
        onOpenChange={(open) => setToast({ ...toast, open })}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />

      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🔐 Digital Passport Platform</h1>
            <p className="text-gray-400">Privacy-Preserving Identity System on Sepolia</p>
          </div>
          <ConnectButton />
        </header>

        <ErrorMessage error={error} onDismiss={() => setError(null)} />

        {/* Contract Info Card */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-primary-500/30">
          <h2 className="text-xl font-bold text-white mb-4">📊 System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-1">Contract Address</p>
              <p className="text-white font-mono text-xs">{CONTRACT_ADDRESS}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Next Passport ID</p>
              <p className="text-white">{nextPassportId?.toString() || '...'}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Your Role</p>
              <p className="text-white">
                {isAuthority && '🏛️ Authority'}
                {isAuthorizedVerifier && ' 🔍 Verifier'}
                {!isAuthority && !isAuthorizedVerifier && '👤 User'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Authority Panel */}
          {isAuthority && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">🏛️ Government Authority Panel</h2>
              <form onSubmit={handleIssuePassport} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Citizen Wallet Address</label>
                  <input
                    type="text"
                    value={issuePassportForm.ownerAddress}
                    onChange={(e) => setIssuePassportForm({ ...issuePassportForm, ownerAddress: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                    placeholder="0x..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Age</label>
                    <input
                      type="number"
                      value={issuePassportForm.age}
                      onChange={(e) => setIssuePassportForm({ ...issuePassportForm, age: e.target.value })}
                      className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                      min="0"
                      max="150"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">National ID</label>
                    <input
                      type="number"
                      value={issuePassportForm.nationalId}
                      onChange={(e) => setIssuePassportForm({ ...issuePassportForm, nationalId: e.target.value })}
                      className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Country Code</label>
                    <input
                      type="number"
                      value={issuePassportForm.citizenshipCode}
                      onChange={(e) => setIssuePassportForm({ ...issuePassportForm, citizenshipCode: e.target.value })}
                      className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                      placeholder="e.g., 840 for USA"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Validity (Years)</label>
                    <input
                      type="number"
                      value={issuePassportForm.validityYears}
                      onChange={(e) => setIssuePassportForm({ ...issuePassportForm, validityYears: e.target.value })}
                      className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Encrypted Name</label>
                  <input
                    type="text"
                    value={issuePassportForm.encryptedName}
                    onChange={(e) => setIssuePassportForm({ ...issuePassportForm, encryptedName: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Encrypted Country</label>
                  <input
                    type="text"
                    value={issuePassportForm.encryptedCountry}
                    onChange={(e) => setIssuePassportForm({ ...issuePassportForm, encryptedCountry: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <LoadingButton
                  loading={isPending}
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                >
                  Issue Passport
                </LoadingButton>
              </form>

              <hr className="my-6 border-slate-700" />

              <h3 className="text-lg font-semibold text-white mb-4">Manage Verifiers</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={verifierAddress}
                  onChange={(e) => setVerifierAddress(e.target.value)}
                  className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                  placeholder="Verifier address (0x...)"
                />
                <div className="flex gap-2">
                  <LoadingButton
                    loading={isPending}
                    onClick={handleAuthorizeVerifier}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                  >
                    Authorize
                  </LoadingButton>
                  <LoadingButton
                    loading={isPending}
                    onClick={handleRevokeVerifier}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                  >
                    Revoke
                  </LoadingButton>
                </div>
              </div>
            </div>
          )}

          {/* Passport Holder Panel */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">👤 My Passport</h2>
            {myPassportId && myPassportId > 0n && passportInfo ? (
              <div className="space-y-3 text-sm">
                <div className="bg-slate-700 p-4 rounded">
                  <p className="text-gray-400">Passport ID</p>
                  <p className="text-white font-bold text-lg">#{myPassportId.toString()}</p>
                </div>
                <div className="bg-slate-700 p-4 rounded">
                  <p className="text-gray-400">Status</p>
                  <p className="text-white">{isValidPassport ? '✅ Valid' : '❌ Invalid/Expired'}</p>
                </div>
                <div className="bg-slate-700 p-4 rounded">
                  <p className="text-gray-400">Active</p>
                  <p className="text-white">{passportInfo[0] ? '✅ Yes' : '❌ No'}</p>
                </div>
                <div className="bg-slate-700 p-4 rounded">
                  <p className="text-gray-400">Government Verified</p>
                  <p className="text-white">{passportInfo[1] ? '✅ Yes' : '❌ No'}</p>
                </div>
                <div className="bg-slate-700 p-4 rounded">
                  <p className="text-gray-400">Issued Date</p>
                  <p className="text-white">{new Date(Number(passportInfo[2]) * 1000).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-700 p-4 rounded">
                  <p className="text-gray-400">Expiration Date</p>
                  <p className="text-white">{new Date(Number(passportInfo[3]) * 1000).toLocaleDateString()}</p>
                </div>
                <p className="text-gray-500 text-xs italic">Personal information is encrypted using FHE</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No passport found for your address</p>
                <p className="text-gray-500 text-sm mt-2">Contact the authority to issue a passport</p>
              </div>
            )}
          </div>

          {/* Verifier Panel */}
          {isAuthorizedVerifier && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">🔍 Verification Panel</h2>
              <Tabs defaultValue="request" tabs={[
                { label: 'Request Verification', value: 'request' },
                { label: 'Age Check', value: 'age' },
                { label: 'Nationality Check', value: 'nationality' },
              ]}>
                <TabsContent value="request">
                  <form onSubmit={handleRequestVerification} className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Passport ID</label>
                      <input
                        type="number"
                        value={verificationForm.passportId}
                        onChange={(e) => setVerificationForm({ ...verificationForm, passportId: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Purpose</label>
                      <textarea
                        value={verificationForm.purpose}
                        onChange={(e) => setVerificationForm({ ...verificationForm, purpose: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                        rows="3"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={verificationForm.ageVerification}
                          onChange={(e) => setVerificationForm({ ...verificationForm, ageVerification: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Age Verification
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={verificationForm.nationalityVerification}
                          onChange={(e) => setVerificationForm({ ...verificationForm, nationalityVerification: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Nationality Verification
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={verificationForm.identityVerification}
                          onChange={(e) => setVerificationForm({ ...verificationForm, identityVerification: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Identity Verification
                      </label>
                    </div>
                    <LoadingButton
                      loading={isPending}
                      type="submit"
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                      Submit Request
                    </LoadingButton>
                  </form>
                </TabsContent>

                <TabsContent value="age">
                  <form onSubmit={handleVerifyAge} className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Passport ID</label>
                      <input
                        type="number"
                        value={ageVerifyForm.passportId}
                        onChange={(e) => setAgeVerifyForm({ ...ageVerifyForm, passportId: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Minimum Age</label>
                      <input
                        type="number"
                        value={ageVerifyForm.minimumAge}
                        onChange={(e) => setAgeVerifyForm({ ...ageVerifyForm, minimumAge: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                        placeholder="e.g., 18"
                      />
                    </div>
                    <LoadingButton
                      loading={isPending}
                      type="submit"
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                      Verify Age (FHE)
                    </LoadingButton>
                  </form>
                </TabsContent>

                <TabsContent value="nationality">
                  <form onSubmit={handleVerifyNationality} className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Passport ID</label>
                      <input
                        type="number"
                        value={nationalityVerifyForm.passportId}
                        onChange={(e) => setNationalityVerifyForm({ ...nationalityVerifyForm, passportId: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Country Code</label>
                      <input
                        type="number"
                        value={nationalityVerifyForm.countryCode}
                        onChange={(e) => setNationalityVerifyForm({ ...nationalityVerifyForm, countryCode: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
                        placeholder="e.g., 840"
                      />
                    </div>
                    <LoadingButton
                      loading={isPending}
                      type="submit"
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                      Verify Nationality (FHE)
                    </LoadingButton>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Transaction History */}
          <div className="lg:col-span-2">
            <TransactionHistory />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <PassportApp />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
