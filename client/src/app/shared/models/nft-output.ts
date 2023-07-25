import { NftMetadata } from './nft-metadata';

export interface NftOutput {
  amount: string;
  nftId: string;
  immutableFeatures: { type: number; data: NftMetadata | string }[];
}
