import { Module } from '@nestjs/common';
import { IotaNftTicketModule } from './iota-nft-ticket/iota-nft-ticket.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `${process.env.NODE_ENV || ''}.env`,
      load: [AppModule.configuration],
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
    IotaNftTicketModule,
  ],
  providers: [{
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  }],
})
export class AppModule {
  static configuration = () => ({
    NODE_ENV: process.env.NODE_ENV,
    iota: {
      network: process.env.IOTA_NETWORK,
      mnemonic: process.env.IOTA_MNEMONIC,
      strongholdPassword: process.env.IOTA_STRONGHOLD_PASSWORD,
    },
  });
}
