import { NftOptions } from './nft-options';

export interface TicketCreationRequest {
  ticketName: string;
  issuerName: string;
  issuerAddress: string;
  description: string;
  ticketAmount: number;
  ticketPrice: number;
  eventDate: string;
}

export interface TicketCreationResponse {
  creationRequestAddress: string;
  issuerAddress: string;
  nftOptions: NftOptions[];
  minimumStorageDeposit: number;
  creationRequestTimestamp: number;
}
