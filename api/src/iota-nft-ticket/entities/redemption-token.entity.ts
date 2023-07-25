import { ApiProperty } from '@nestjs/swagger';

export class RedemptionTokenEntity {
  @ApiProperty()
  public token: string;

  @ApiProperty()
  public redemptionTokenRequestTimestamp: number;

  constructor(
    token: string,
    creationTimestamp: number = Date.now(),
  ) {
    this.token = token;
    this.redemptionTokenRequestTimestamp = creationTimestamp;
  }
}
