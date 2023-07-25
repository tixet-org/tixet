import { ApiProperty } from '@nestjs/swagger';
import { MintNftParams } from '@iota/sdk';

export class CreationMetadataEntity {
  @ApiProperty()
  public creationRequestAddress: string;

  @ApiProperty()
  public issuerAddress: string;

  @ApiProperty()
  public nftOptions: MintNftParams[];

  @ApiProperty()
  public minimumStorageDeposit: number;

  @ApiProperty()
  public creationRequestTimestamp: number;

  constructor(
    generatedAddress: string,
    issuerAddress: string,
    nftOptions: MintNftParams[],
    minimumStorageDeposit: number,
    creationRequestTimestamp: number = Date.now(),
  ) {
    this.creationRequestAddress = generatedAddress;
    this.issuerAddress = issuerAddress;
    this.nftOptions = nftOptions;
    this.minimumStorageDeposit = minimumStorageDeposit;
    this.creationRequestTimestamp = creationRequestTimestamp;
  }
}
