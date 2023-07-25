import { Module } from '@nestjs/common';
import { OrbitDbService } from './orbit-db.service';
import { IpfsModule } from '../providers/ipfs/ipfs.module';

@Module({
  imports: [IpfsModule],
  providers: [OrbitDbService],
  exports: [OrbitDbService],
})
export class DatabaseModule {}
