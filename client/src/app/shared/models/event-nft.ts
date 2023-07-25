export interface NftIdentifier {
  nftId: string;
  name: string;
  isCollectionNft: boolean;
}

export interface EventNft {
  eventId: string;
  eventName: string;
  description: string;
  uri: string;
  ticketAmount: number;
  ticketPriceInSmallestUnit: number;
  issuerName: string;
  issuerAddress: string;
  eventDate: string;
  nfts: NftIdentifier[];
}
