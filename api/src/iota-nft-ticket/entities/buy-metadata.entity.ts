import { ApiProperty } from '@nestjs/swagger';

export class BuyMetadataEntity {
  @ApiProperty()
  public buyRequestAddress: string;

  @ApiProperty()
  public totalPrice: number;

  @ApiProperty()
  public buyRequestTimestamp: number;

  constructor(
    generatedAddress: string,
    totalPrice: number,
    creationTimestamp: number = Date.now(),
  ) {
    this.buyRequestAddress = generatedAddress;
    this.totalPrice = totalPrice;
    this.buyRequestTimestamp = creationTimestamp;
  }
}
