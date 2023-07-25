export interface BuyTicketRequest {
  ticketAmount: number;
  buyerAddress: string;
}

export interface BuyTicketResponse {
  buyRequestAddress: string;
  totalPrice: number;
  buyRequestTimestamp: number;
}
