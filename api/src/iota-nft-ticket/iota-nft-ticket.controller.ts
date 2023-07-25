import { Body, Controller, Get, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { IotaNftTicketService } from './iota-nft-ticket.service';
import { ApiBody, ApiConsumes, ApiExtraModels, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { BuyMetadataEntity, CreationMetadataEntity, EventNft, NftOutputEntity, RedemptionTokenEntity } from './entities';
import { BuyNftTicketDto, CreateNftTicketDto, RedeemNftTicketDto, RequestNftTicketRedemptionTokenDto } from './dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Feature, FeatureType, MetadataFeature, NftOutput } from '@iota/sdk';
import { hexToUtf8 } from '../utils';

@Controller('iota-nft-ticket')
@ApiTags('IOTA NFT Tickets')
export class IotaNftTicketController {
  constructor(private readonly iotaNftTicketService: IotaNftTicketService) {}

  @ApiExtraModels(CreationMetadataEntity)
  @ApiResponse({ schema: { $ref: getSchemaPath(CreationMetadataEntity) } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ticketName', 'issuerAddress', 'ticketAmount', 'ticketPrice'],
      properties: {
        ticketName: { type: 'string' },
        issuerAddress: { type: 'string' },
        issuerName: { type: 'string' },
        description: { type: 'string' },
        ticketAmount: { type: 'integer' },
        ticketPrice: { type: 'integer' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createTickets(
    @Body() createTicketsDto: CreateNftTicketDto, @UploadedFile('file') file: Express.Multer.File,
  ): Promise<CreationMetadataEntity> {
    return this.iotaNftTicketService.createTickets(createTicketsDto, file);
  }

  @ApiExtraModels(BuyMetadataEntity)
  @ApiResponse({ schema: { $ref: getSchemaPath(BuyMetadataEntity) } })
  @Put('buy/:eventId')
  async buyTicket(
    @Param('eventId') eventId: string, @Body() buyTicketDto: BuyNftTicketDto,
  ): Promise<BuyMetadataEntity> {
    return this.iotaNftTicketService.buyTickets(eventId, buyTicketDto);
  }

  @ApiResponse({ status: 200 })
  @Get('checkRedemption/:eventId/:nftId')
  async checkTicketRedemption(@Param('eventId') eventId: string, @Param('nftId') nftId: string): Promise<Date> {
    return this.iotaNftTicketService.checkTicketRedemption(eventId, nftId);
  }

  @ApiExtraModels(RedemptionTokenEntity)
  @ApiResponse({ schema: { $ref: getSchemaPath(RedeemNftTicketDto) } })
  @Put('redemptionToken/:eventId/:nftId')
  async requestTicketRedemptionToken(
    @Param('eventId') eventId: string, @Param('nftId') nftId: string,
      @Body() requestTicketRedemptionTokenDto: RequestNftTicketRedemptionTokenDto,
  ): Promise<RedemptionTokenEntity> {
    return this.iotaNftTicketService.requestTicketRedemptionToken(eventId, nftId, requestTicketRedemptionTokenDto);
  }

  @Put('redeem/:eventId/:nftId')
  async redeemTicket(
    @Param('eventId') eventId: string, @Param('nftId') nftId: string, @Body() redeemTicketDto: RedeemNftTicketDto,
  ): Promise<Date> {
    return this.iotaNftTicketService.redeemTicket(eventId, nftId, redeemTicketDto);
  }

  @ApiExtraModels(EventNft)
  @ApiResponse({ isArray: true, schema: { $ref: getSchemaPath(EventNft) } })
  @Get('events/:eventId')
  async getEventById(@Param('eventId') eventId: string): Promise<EventNft> {
    return this.iotaNftTicketService.getEventById(eventId);
  }

  @ApiExtraModels(EventNft)
  @ApiResponse({ isArray: true, schema: { $ref: getSchemaPath(EventNft) } })
  @Get('events-by-issuer-address/:issuerAddress')
  async getEventsByIssuerAddress(@Param('issuerAddress') issuerAddress: string): Promise<EventNft[]> {
    return this.iotaNftTicketService.getEventsByIssuerAddress(issuerAddress);
  }

  @ApiExtraModels(EventNft)
  @ApiResponse({ isArray: true, schema: { $ref: getSchemaPath(EventNft) } })
  @Get('events')
  async getAllEvents(): Promise<EventNft[]> {
    return this.iotaNftTicketService.getAllEvents();
  }

  @ApiExtraModels(NftOutputEntity)
  @ApiResponse({ schema: { $ref: getSchemaPath(NftOutputEntity) } })
  @Get('nft/:nftId')
  async getNftOutputById(@Param('nftId') nftId: string): Promise<NftOutputEntity> {
    const nftOutput: NftOutput = await this.iotaNftTicketService.getNftOutputById(nftId);
    const immutableFeatures: Feature[] = nftOutput.getImmutableFeatures();
    const metadataFeature: MetadataFeature = immutableFeatures.find((f: Feature) => f.getType() === FeatureType.Metadata) as MetadataFeature;
    if (metadataFeature && metadataFeature.getData()) {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      metadataFeature['data'] = JSON.parse(hexToUtf8(metadataFeature.getData()));
    }
    return new NftOutputEntity(
      nftOutput.getAmount().toString(),
      nftOutput.getNftId(),
      nftOutput.getUnlockConditions(),
      nftOutput.getImmutableFeatures(),
      nftOutput.getFeatures(),
    );
  }
}
