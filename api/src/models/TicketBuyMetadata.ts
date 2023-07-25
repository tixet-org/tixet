export interface TicketBuyMetadata {
  eventId: string;
  buyerAddress: string;
  ticketAmount: number;
  totalPriceInSmallestUnit: number;
  metadataCreationTimestamp: number;
  isProcessing: boolean;
}
