import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import DAppDetail from './DAppDetail';
import TxDetail, { SendTxTypeEn } from './TxDetail';
import GasEstimation, { TGasEstimate } from './GasEstimation';
import { SupportedChainTypeEn } from '@/constants/chains';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/contexts/wallet';
import { elytroSDK } from '@/background/services/sdk';
import { useAccount } from '../contexts/account-context';
import { Transaction } from '@soulwallet/sdk';
import Spin from '@/components/Spin';
import { DecodeResult } from '@soulwallet/decoder';
import { toast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';

interface ISendTxProps {
  txParams: TTransactionInfo;
  dapp: TDAppInfo;
  onConfirm: () => void;
  onCancel: () => void;
  chainType: SupportedChainTypeEn;
}

export default function SendTx({
  txParams,
  onConfirm,
  onCancel,
  dapp,
  chainType,
}: ISendTxProps) {
  const gasEstimationRef = useRef<TGasEstimate>();
  const wallet = useWallet();
  const {
    accountInfo: { address },
  } = useAccount();
  const userOpRef = useRef<ElytroUserOperation>();
  const [isLoading, setIsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [decodedDetail, setDecodedDetail] = useState<DecodeResult[]>([
    {
      from: '0x7C9A1897dFd01b0287347A1b824f95387ffB0024',
      fromInfo: undefined,
      method: undefined,
      to: '0x0c54FcCd2e384b4BB6f2E405Bf5Cbc15a017AaFb',
      toInfo: undefined,
      value: 0n,
    },
  ]);

  const [needDeposit, setNeedDeposit] = useState(false);

  const getUserOpFromTx = async () => {
    setIsLoading(true);
    try {
      const res = await elytroSDK.createUserOpFromTxs(
        // '0x7C9A1897dFd01b0287347A1b824f95387ffB0024',
        address!,
        [txParams as Transaction]
      );

      const decodeRes = await elytroSDK.getDecodedUserOperation(res);

      if (!decodeRes) {
        throw new Error('Failed to decode user operation');
      }

      const { needDeposit = true } = await elytroSDK.getRechargeAmountForUserOp(
        res,
        decodeRes[0].value
      );

      setDecodedDetail(decodeRes);
      userOpRef.current = res;
      setNeedDeposit(needDeposit);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getUserOpFromTx();
  }, [txParams, address]);

  const onGasChange = (gasEstimate: TGasEstimate) => {
    gasEstimationRef.current = gasEstimate;
  };

  const handleSendTx = async () => {
    try {
      setSending(true);
      userOpRef.current = await wallet.signUserOperation(userOpRef.current!);
      await elytroSDK.sendUserOperation(userOpRef.current!);

      toast({
        title: 'Success',
        description: 'Transaction sent successfully',
      });
      onConfirm();
    } catch (error) {
      toast({
        title: 'Failed to send transaction',
        description: (error as Error).message,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto flex-grow flex flex-col min-w-[430px]">
      <Spin isLoading={isLoading} />
      <CardHeader>
        <DAppDetail dapp={dapp} chainType={chainType} />
      </CardHeader>

      <CardContent className="space-y-4 flex-grow">
        {!isLoading ? (
          <TxDetail
            tx={decodedDetail[0]}
            type={txParams.to ? SendTxTypeEn.SEND : SendTxTypeEn.DEPLOY}
          />
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-col gap-y-4">
        <GasEstimation onGasChange={onGasChange} />
        <div className="flex justify-between mt-auto w-full space-x-4">
          <Button variant="outline" onClick={onCancel} className="w-1/2">
            Cancel
          </Button>
          <Button
            onClick={handleSendTx}
            className="w-1/2"
            disabled={needDeposit || sending}
          >
            {needDeposit ? (
              'Not Enough Balance'
            ) : sending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              'Send'
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
