import { useApproval } from '../contexts/approval-context';
import { useAccount } from '../contexts/account-context';
import { useWallet } from '@/contexts/wallet';
import { ethErrors } from 'eth-rpc-errors';
import ConnectionConfirmation from '../components/ConnectConfirmation';

export default function Connect() {
  const wallet = useWallet();
  const { approval } = useApproval();
  const {
    accountInfo: { chainType },
  } = useAccount();

  if (!approval || !approval.data) {
    return null;
  }

  const {
    data: { dApp },
  } = approval;

  const handleConnect = async () => {
    try {
      await wallet.connectWallet(dApp, chainType);
      approval.resolve();
    } catch (error) {
      approval.reject(error);
    } finally {
      window.close();
    }
  };

  const handleReject = () => {
    approval.reject(ethErrors.provider.userRejectedRequest());
    window.close();
  };

  return (
    <div className="w-full h-full flex justify-center items-center min-h-screen p-4">
      <ConnectionConfirmation
        dApp={dApp}
        onConfirm={handleConnect}
        onCancel={handleReject}
      />
    </div>
  );
}
