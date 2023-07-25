import { NftMetadata } from '../models';

export const isTicketNftMetadata = (obj: any): obj is NftMetadata => {
  if (
    typeof obj.standard !== 'string' ||
    typeof obj.type !== 'string' ||
    typeof obj.version !== 'string' ||
    typeof obj.name !== 'string' ||
    !obj.attributes ||
    !Array.isArray(obj.attributes) ||
    obj.attributes?.length !== 1 ||
    typeof obj.attributes[0]?.eventIssuerAddress !== 'string' ||
    typeof obj.attributes[0]?.eventId !== 'string' ||
    typeof obj.attributes[0]?.ticketPrice !== 'string' ||
    typeof obj.attributes[0]?.eventDate !== 'string' ||
    typeof obj.attributes[0]?.isCollectionNft !== 'boolean'
  ) {
    return false;
  }
  if (obj.uri !== undefined && typeof obj.uri !== 'string') {
    return false;
  }
  if (obj.collectionName !== undefined && typeof obj.collectionName !== 'string') {
    return false;
  }
  if (obj.royalties !== undefined && typeof obj.royalties !== 'object') {
    return false;
  }
  if (obj.issuerName !== undefined && typeof obj.issuerName !== 'string') {
    return false;
  }
  if (obj.description !== undefined && typeof obj.description !== 'string') {
    return false;
  }
  return true;
};



