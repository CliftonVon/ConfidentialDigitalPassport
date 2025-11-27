import React, { useState, useEffect } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACT_ADDRESS } from '../contract';
import { LoadingSpinner } from './Loading';
import { ErrorMessage } from './ErrorHandling';

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const loadTransactionHistory = async () => {
    if (!publicClient || !address) return;

    setLoading(true);
    setError(null);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - 10000n; // Last ~10000 blocks

      // Fetch all relevant events
      const [passportIssuedLogs, verificationRequestedLogs, verificationApprovedLogs] = await Promise.all([
        publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: parseAbiItem('event PassportIssued(uint256 indexed passportId, address indexed owner, uint256 issuedAt)'),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: parseAbiItem('event VerificationRequested(uint256 indexed passportId, address indexed requester, uint256 requestIndex)'),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: parseAbiItem('event VerificationApproved(uint256 indexed passportId, address indexed requester, uint256 requestIndex)'),
          fromBlock,
          toBlock: 'latest',
        }),
      ]);

      // Process and combine all events
      const allEvents = [
        ...passportIssuedLogs.map(log => ({
          type: 'PassportIssued',
          passportId: log.args.passportId?.toString(),
          owner: log.args.owner,
          timestamp: log.args.issuedAt?.toString(),
          blockNumber: log.blockNumber.toString(),
          transactionHash: log.transactionHash,
        })),
        ...verificationRequestedLogs.map(log => ({
          type: 'VerificationRequested',
          passportId: log.args.passportId?.toString(),
          requester: log.args.requester,
          requestIndex: log.args.requestIndex?.toString(),
          blockNumber: log.blockNumber.toString(),
          transactionHash: log.transactionHash,
        })),
        ...verificationApprovedLogs.map(log => ({
          type: 'VerificationApproved',
          passportId: log.args.passportId?.toString(),
          requester: log.args.requester,
          requestIndex: log.args.requestIndex?.toString(),
          blockNumber: log.blockNumber.toString(),
          transactionHash: log.transactionHash,
        })),
      ];

      // Filter events related to user's address and sort by block number
      const userEvents = allEvents
        .filter(event =>
          event.owner?.toLowerCase() === address.toLowerCase() ||
          event.requester?.toLowerCase() === address.toLowerCase()
        )
        .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

      setTransactions(userEvents);
    } catch (err) {
      console.error('Error loading transaction history:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactionHistory();
  }, [address, publicClient]);

  const getEventIcon = (type) => {
    switch (type) {
      case 'PassportIssued':
        return '📄';
      case 'VerificationRequested':
        return '🔍';
      case 'VerificationApproved':
        return '✅';
      default:
        return '📋';
    }
  };

  const getEventDescription = (event) => {
    switch (event.type) {
      case 'PassportIssued':
        return `Passport #${event.passportId} issued to ${event.owner?.substring(0, 10)}...`;
      case 'VerificationRequested':
        return `Verification requested for Passport #${event.passportId}`;
      case 'VerificationApproved':
        return `Verification approved for Passport #${event.passportId}`;
      default:
        return 'Unknown event';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Transaction History</h3>
        <button
          onClick={loadTransactionHistory}
          disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
        >
          {loading ? <LoadingSpinner size="sm" /> : '🔄 Refresh'}
        </button>
      </div>

      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {loading && transactions.length === 0 ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx, index) => (
            <div
              key={`${tx.transactionHash}-${index}`}
              className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getEventIcon(tx.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium mb-1">{getEventDescription(tx)}</p>
                  <p className="text-sm text-gray-400 mb-2">Block #{tx.blockNumber}</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 text-sm font-mono truncate block"
                  >
                    {tx.transactionHash}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
