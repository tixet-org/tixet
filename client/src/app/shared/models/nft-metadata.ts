export interface NftMetadata {
  standard: string;
  type: string;
  version: string;
  uri?: string;
  name: string;
  nftId: string;
  collectionName?: string;
  royalties?: { [key: string]: number };
  issuerName?: string;
  description?: string;
  attributes: [{
    eventIssuerAddress: string;
    eventId: string;
    ticketPrice: number;
    eventDate: string;
    isCollectionNft: boolean;
  }];
}

