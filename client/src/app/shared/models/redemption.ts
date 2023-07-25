export interface RedemptionRequest {
  signedMessage: string;
  publicKey: string;
}

export interface RedemptionRequestWithTicketData extends RedemptionRequest {
  eventId: string;
  nftId: string;
}
