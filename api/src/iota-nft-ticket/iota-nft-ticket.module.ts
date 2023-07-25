import { Module } from '@nestjs/common';
import { IotaNftTicketService } from './iota-nft-ticket.service';
import { IotaNftTicketController } from './iota-nft-ticket.controller';
import { DatabaseModule } from '../database/database.module';
import { IpfsModule } from '../providers/ipfs/ipfs.module';
import { StrongholdModule } from '../providers/stronghold/stronghold.module';

@Module({
  controllers: [IotaNftTicketController],
  providers: [IotaNftTicketService],
  imports: [StrongholdModule, IpfsModule, DatabaseModule],
})
export class IotaNftTicketModule {}
