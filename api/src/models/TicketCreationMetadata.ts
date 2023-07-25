import { MintNftParams } from '@iota/sdk';

export interface TicketCreationMetadata {
  nftOptions: MintNftParams[];
  issuerAddress: string;
  estimateStorageDeposit: number;
  ticketsAmount: number;
  metadataCreationTimestamp: number;
  isProcessing: boolean;
}
