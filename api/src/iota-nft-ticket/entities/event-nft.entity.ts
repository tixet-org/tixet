import { ApiProperty } from '@nestjs/swagger';

export interface EventNftIdentifier {
  nftId: string;
  name: string;
  isCollectionNft: boolean;
}

export class EventNft {
  @ApiProperty()
  public eventId: string;

  @ApiProperty()
  public eventName: string;

  @ApiProperty()
  public description: string;

  @ApiProperty()
  public issuerName: string;

  @ApiProperty()
  public issuerAddress: string;

  @ApiProperty()
  public uri: string;

  @ApiProperty()
  public ticketAmount: number;

  @ApiProperty()
  public ticketPriceInSmallestUnit: number;

  @ApiProperty()
  public eventDate: string;

  @ApiProperty()
  public nfts: EventNftIdentifier[];

  constructor(
    eventId: string,
    eventName: string,
    description: string,
    issuerName: string,
    issuerAddress: string,
    uri: string,
    ticketAmount: number,
    ticketPrice: number,
    eventDate: string,
    nfts: EventNftIdentifier[],
  ) {
    this.eventId = eventId;
    this.eventName = eventName;
    this.description = description;
    this.issuerName = issuerName;
    this.issuerAddress = issuerAddress;
    this.uri = uri;
    this.ticketAmount = ticketAmount;
    this.ticketPriceInSmallestUnit = ticketPrice;
    this.eventDate = eventDate;
    this.nfts = nfts;
  }
}
