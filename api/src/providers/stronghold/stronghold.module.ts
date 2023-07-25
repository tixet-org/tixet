import { Module } from '@nestjs/common';
import { StrongholdService } from './stronghold.service';

@Module({
  providers: [StrongholdService],
  exports: [StrongholdService],
})
export class StrongholdModule {}
