import { ApiProperty } from '@nestjs/swagger';
import { Feature, HexEncodedString, UnlockCondition } from '@iota/sdk';

export class NftOutputEntity {
  @ApiProperty()
    type: 6;

  @ApiProperty()
    amount: string;

  @ApiProperty()
    nftId: HexEncodedString;

  @ApiProperty()
    unlockConditions: UnlockCondition[];

  @ApiProperty()
    immutableFeatures?: Feature[];

  @ApiProperty()
    features?: Feature[];

  constructor(amount: string, nftId: HexEncodedString, unlockConditions: UnlockCondition[], immutableFeatures?: Feature[], features?: Feature[]) {
    this.amount = amount;
    this.nftId = nftId;
    this.unlockConditions = unlockConditions;
    this.immutableFeatures = immutableFeatures;
    this.features = features;
  }
}
