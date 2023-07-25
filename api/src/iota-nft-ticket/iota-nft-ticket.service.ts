import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { hexToByteArray, hexToUtf8, utf8ToHex } from '../utils';
import { BuyNftTicketDto, CreateNftTicketDto, RedeemNftTicketDto, RequestNftTicketRedemptionTokenDto } from './dto';
import {
  BuyMetadataEntity,
  CreationMetadataEntity,
  EventNft,
  EventNftIdentifier,
  RedemptionTokenEntity,
} from './entities';
import { StrongholdService } from '../providers/stronghold/stronghold.service';
import { AddResult, IpfsService } from '../providers/ipfs/ipfs.service';
import { CLEAN_UP_DB_TIMEOUT, KeyValTable, OrbitDbKeyValData, OrbitDbService } from '../database/orbit-db.service';
import {
  NftMetadata,
  TicketBuyMetadata,
  TicketCreationMetadata,
  TicketRedemption,
  TicketRedemptionToken,
} from '../models';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { verify } from '@noble/ed25519';
import {
  Address,
  AddressUnlockCondition,
  AddressWithUnspentOutputs,
  BasicOutput, Ed25519Address,
  Feature,
  FeatureType,
  IssuerFeature,
  MetadataFeature,
  MintNftParams,
  NftOutput,
  OutputData,
  OutputResponse,
  PreparedTransaction,
  SendNftParams,
  Transaction,
  UnlockCondition,
  UnlockConditionType,
  Utils,
} from '@iota/sdk';
import { Subject, takeUntil } from 'rxjs';

interface NewFundsData<T extends | TicketCreationMetadata | TicketBuyMetadata > {
  fundsReceived: AddressWithUnspentOutputs;
  data: T;
}

// NFT implementation based on https://wiki.iota.org/shimmer/tips/tips/TIP-0027/
@Injectable()
export class IotaNftTicketService implements OnModuleDestroy {
  private readonly destroy$: Subject<void> = new Subject<void>();
  constructor(
    private readonly orbitDb: OrbitDbService,
    private readonly ipfsService: IpfsService,
    private readonly configService: ConfigService,
    private readonly stronghold: StrongholdService,
  ) {
    this.stronghold.addressesWithUnspentOutputs$
      .pipe(takeUntil(this.destroy$))
      .subscribe((o: AddressWithUnspentOutputs[]) => this.handleNewOutputs(o));
  }

  onModuleDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public async createTickets(ticketData: CreateNftTicketDto, file: Express.Multer.File): Promise<CreationMetadataEntity> {
    if (!Utils.isAddressValid(ticketData.issuerAddress)) {
      throw new BadRequestException('Invalid issuer address');
    }

    let fileUri = '';
    if (file) {
      const ipfsFile: AddResult = await this.ipfsService.addFile(file.buffer);
      if (!ipfsFile || !ipfsFile.path) throw new BadRequestException('Error uploading file to IPFS');
      fileUri = ipfsFile.path;
    }
    
    const tag: string = utf8ToHex('IOTA NFT Ticket');
    const eventId: string = randomUUID();
    const nftOptions: MintNftParams[] = [];
    for (let i = 0; i <= ticketData.ticketAmount; i++) {
      const nftMetadata: NftMetadata = {
        name: `${ticketData.ticketName} #${i}`,
        issuerName: ticketData.issuerName,
        description: ticketData.description,
        standard: 'IRC27',
        version: 'v1.0',
        type: 'text/plain',
        uri: fileUri,
        attributes: [{
          eventId,
          eventIssuerAddress: ticketData.issuerAddress,
          ticketPrice: ticketData.ticketPrice,
          eventDate: ticketData.eventDate,
          isCollectionNft: i === 0,
        }],
      };
      nftOptions.push({ tag, immutableMetadata: utf8ToHex(JSON.stringify(nftMetadata)) });
    }

    const [generatedAccountAddress] = await this.stronghold.account.generateEd25519Addresses(1);
    const address: Address = Utils.parseBech32Address(ticketData.issuerAddress);
    const unlockCondition: UnlockCondition = new AddressUnlockCondition(address);

    const issuerFeature: IssuerFeature = new IssuerFeature(address);
    const metadataFeature: MetadataFeature = new MetadataFeature(nftOptions[0].immutableMetadata);
    const nftOutput: NftOutput = await this.stronghold.client.buildNftOutput({
      nftId: '0x0000000000000000000000000000000000000000000000000000000000000000',
      unlockConditions: [unlockCondition],
      immutableFeatures: [issuerFeature, metadataFeature],
    });

    const storageDeposit: number = await this.stronghold.client.minimumRequiredStorageDeposit(nftOutput);
    const totalStorageDeposit: number = storageDeposit * (nftOptions.length + 2); // one additional for the collection ticket and one to be sure

    const creationTimestamp: number = Date.now();
    await (await this.orbitDb.ticketCreationMetadataTable()).add(generatedAccountAddress.address, {
      nftOptions,
      issuerAddress: ticketData.issuerAddress,
      estimateStorageDeposit: totalStorageDeposit,
      ticketsAmount: ticketData.ticketAmount,
      metadataCreationTimestamp: creationTimestamp,
      isProcessing: false,
    });

    return new CreationMetadataEntity(
      generatedAccountAddress.address, ticketData.issuerAddress, nftOptions, totalStorageDeposit, creationTimestamp,
    );
  }

  public async buyTickets(eventId: string, buyTicketDto: BuyNftTicketDto): Promise<BuyMetadataEntity> {
    if (!Utils.isAddressValid(buyTicketDto.buyerAddress)) {
      throw new BadRequestException('Invalid buyer address');
    }

    const allEvents: EventNft[] = await this.getAllEvents();
    const event: EventNft = allEvents.find((e: EventNft) => e.eventId === eventId);
    if (!event) { throw new NotFoundException('Event not found'); }
    if (event.ticketAmount < buyTicketDto.ticketAmount) {
      throw new BadRequestException(`Not enough tickets available. Available: ${event.ticketAmount} Requested:${buyTicketDto.ticketAmount}`);
    }

    const [generatedAccountAddress] = await this.stronghold.account.generateEd25519Addresses(1);
    const address: Address = Utils.parseBech32Address(generatedAccountAddress.address);
    const unlockCondition: UnlockCondition = new AddressUnlockCondition(address);

    const totalPrice: number = Number(event.ticketPriceInSmallestUnit) * buyTicketDto.ticketAmount;
    const basicOutput: BasicOutput = await this.stronghold.client.buildBasicOutput({
      amount: totalPrice.toString(), unlockConditions: [unlockCondition],
    });
    console.log(basicOutput);
    const minimumAmount:number = await this.stronghold.client.minimumRequiredStorageDeposit(basicOutput);
    const totalPriceInSmallestUnit: number = totalPrice > minimumAmount ? totalPrice : minimumAmount;

    const creationTimestamp: number = Date.now();
    await (await this.orbitDb.ticketBuyMetadataTable()).add(generatedAccountAddress.address, {
      eventId,
      ticketAmount: buyTicketDto.ticketAmount,
      totalPriceInSmallestUnit,
      buyerAddress: buyTicketDto.buyerAddress,
      metadataCreationTimestamp: creationTimestamp,
      isProcessing: false,
    });

    return new BuyMetadataEntity(generatedAccountAddress.address, totalPriceInSmallestUnit);
  }

  public async checkTicketRedemption(eventId: string, nftId: string): Promise<Date> {
    const redemption: TicketRedemption = await this.getTicketRedemptionData(nftId);
    if (!redemption) { throw new NotFoundException('NFT Ticket not redeemed'); }

    if (redemption.eventId !== eventId) { throw new BadRequestException('NFT Ticket does not match event');}

    const nftOutput: NftOutput = await this.getNftOutputById(nftId);
    if (!nftOutput) { throw new NotFoundException('NFT Ticket not found'); }
    if (!this.checkIfNftOutputMatchesEventId(nftOutput, eventId)) {
      throw new BadRequestException('NFT Ticket does not match event');
    }

    return new Date(redemption.redemptionTimestamp);
  }

  public async requestTicketRedemptionToken(
    eventId: string, nftId: string, requestTicketRedemptionTokenDto: RequestNftTicketRedemptionTokenDto,
  ): Promise<RedemptionTokenEntity> {
    const redemption: TicketRedemption = await this.getTicketRedemptionData(nftId);
    if (redemption) { throw new BadRequestException('NFT Ticket already redeemed'); }

    const nftOutput: NftOutput = await this.getNftOutputById(nftId);
    if (!nftOutput) { throw new NotFoundException('NFT Ticket not found'); }
    if (!this.checkIfNftOutputMatchesEventId(nftOutput, eventId)) { throw new BadRequestException('NFT Ticket does not match event'); }

    if (!this.checkIfUnlockConditionPubKeyHashMatchesPublicKey(nftOutput, requestTicketRedemptionTokenDto.publicKey)) {
      throw new BadRequestException('Public key does not match NFT Ticket');
    }

    const token: string = randomUUID();
    const timestamp: number = Date.now();
    await (await this.orbitDb.ticketRedemptionTokensTable()).add(nftId, {
      eventId, token, redemptionTokenRequestTimestamp: timestamp,
    });

    return new RedemptionTokenEntity(token, timestamp);
  }

  public async redeemTicket(eventId: string, nftId: string, redeemTicketDto: RedeemNftTicketDto): Promise<Date> {
    const redemptionDate: Date | void = await this.checkTicketRedemption(eventId, nftId).catch(() => null);
    if (redemptionDate) { throw new BadRequestException('NFT Ticket already redeemed'); }

    const redemptionTokenTable: KeyValTable<TicketRedemptionToken> = await this.orbitDb.ticketRedemptionTokensTable();
    const redemptionToken: TicketRedemptionToken = await redemptionTokenTable.getByKey(nftId);
    if (!redemptionToken) { throw new NotFoundException('Redemption token not found'); }
    if (Date.now() - redemptionToken.redemptionTokenRequestTimestamp > CLEAN_UP_DB_TIMEOUT) {
      throw new BadRequestException('Redemption token expired');
    }

    const nftOutput: NftOutput = await this.getNftOutputById(nftId);
    if (!nftOutput) { throw new NotFoundException('NFT Ticket not found'); }
    if (!this.checkIfNftOutputMatchesEventId(nftOutput, eventId)) {
      throw new BadRequestException('NFT Ticket does not match event');
    }

    if (!this.checkIfUnlockConditionPubKeyHashMatchesPublicKey(nftOutput, redeemTicketDto.publicKey)) {
      throw new BadRequestException('Public key does not match NFT Ticket');
    }

    let isValid = false;
    try {
      const sigBytes: Uint8Array = hexToByteArray(redeemTicketDto.signedMessage);
      const tokenBytes: Uint8Array = hexToByteArray(utf8ToHex(redemptionToken.token));
      const pubKeyBytes: Uint8Array = hexToByteArray(redeemTicketDto.publicKey);

      isValid = await verify(sigBytes, tokenBytes, pubKeyBytes);
    } catch (e) {console.log(e);}
    if (!isValid) { throw new BadRequestException('Invalid signature'); }

    const redemptionTimestamp: number = Date.now();
    await (await this.orbitDb.ticketRedemptionTable()).add(nftId, { eventId, redemptionTimestamp });

    await redemptionTokenTable.remove(nftId);

    return new Date(redemptionTimestamp);
  }

  public async getEventById(eventId: string): Promise<EventNft> {
    const events: EventNft[] = await this.getAllEvents();
    const event: EventNft = events.find(e => e.eventId === eventId);
    if (!event) { throw new NotFoundException('Event not found'); }
    return event;
  }

  public async getEventsByIssuerAddress(issuerAddress: string): Promise<EventNft[]> {
    const events: EventNft[] = await this.getAllEvents();
    return events.filter((e: EventNft) => e.issuerAddress === issuerAddress);
  }

  public async getAllEvents(): Promise<EventNft[]> {
    // todo cache events and sync periodically (maybe orbitdb or in memory)
    const events: EventNft[] = [];
    await this.stronghold.account.sync();
    const outputTypes: Uint8Array = [6] as unknown as Uint8Array;
    const outputs: OutputData[] = await this.stronghold.account.unspentOutputs({ outputTypes });

    outputs.forEach((outputData: OutputData) => {
      const { output, outputId } = outputData;
      const immutableFeatures = (output as NftOutput).getImmutableFeatures();
      const feature: MetadataFeature = immutableFeatures.find(f => f.getType() === FeatureType.Metadata) as MetadataFeature;
      if (!feature) { return; }

      const data: string = feature.getData();
      if (!data) { return; }

      const nftId: string = Utils.computeNftId(outputId);
      const nftMetadata = JSON.parse(hexToUtf8(data));
      const { uri, name, description, attributes, issuerName } = nftMetadata as NftMetadata;
      const { eventId } = attributes.find(a => a.eventId) ?? {} as { eventId?: string };
      const { ticketPrice } = attributes.find(a => a.ticketPrice) ?? {} as { ticketPrice?: number };
      const { eventIssuerAddress: issuerAddress } = attributes.find(a => a.eventIssuerAddress) ?? {} as { eventIssuerAddress?: string };
      const { eventDate } = attributes.find(a => a.eventDate) ?? {} as { eventDate?: string };
      const { isCollectionNft = false } = attributes.find(a => a.isCollectionNft) ?? {} as { isCollectionNft?: boolean };
      if (!eventId || !issuerAddress || !ticketPrice || !eventDate) { return; }

      const existingEvent = events.find((e: EventNft) => e.eventId === eventId);
      if (existingEvent) {
        existingEvent.ticketAmount += isCollectionNft ? 0 : 1;
        existingEvent.nfts.push({ name, nftId, isCollectionNft });
      } else {
        events.push(new EventNft(
          eventId, name.slice(0, -2), description, issuerName, issuerAddress, uri, isCollectionNft ? 0 : 1,
          ticketPrice, eventDate, [{ name, nftId, isCollectionNft }],
        ));
      }
    });

    return events;
  }

  public async getNftOutputById(nftId: string): Promise<NftOutput> {
    const outputId: string = await this.stronghold.client.nftOutputId(nftId);
    const outputResponse: OutputResponse = await this.stronghold.client.getOutput(outputId);
    return outputResponse.output as NftOutput;
  }

  private async handleNewOutputs(outputs: AddressWithUnspentOutputs[]) {
    await Promise.all([
      this.stronghold.strongholdInitialized, this.orbitDb.orbitInitialized,
    ]);
    const [ticketCreationMetadataTable, ticketBuyMetadataTable] = await Promise.all([
      this.orbitDb.ticketCreationMetadataTable(), this.orbitDb.ticketBuyMetadataTable(),
    ]);

    let [creationMetadata, buyMetadata] = await Promise.all([
      ticketCreationMetadataTable.getAll(), ticketBuyMetadataTable.getAll(),
    ]);
    [creationMetadata, buyMetadata] = await Promise.all([
      this.orbitDb.deleteTimedOutMetadata(creationMetadata, ticketCreationMetadataTable), this.orbitDb.deleteTimedOutMetadata(buyMetadata, ticketBuyMetadataTable),
    ]);

    console.log(`Creation metadata: ${creationMetadata.length}`);
    console.log(`Buy metadata: ${buyMetadata.length}`);

    const newCreationsFundsReceived: NewFundsData<TicketCreationMetadata>[] = this.filterMetadata(outputs, creationMetadata);
    const newBuyFundsReceived: NewFundsData<TicketBuyMetadata>[] = this.filterMetadata(outputs, buyMetadata);

    if (newCreationsFundsReceived.length) { console.log(`New creation funds received: ${newCreationsFundsReceived.length}`); }
    if (newBuyFundsReceived.length) { console.log(`New buy funds received: ${newBuyFundsReceived.length}`); }

    await Promise.all([
      this.handleNewCreationOutput(newCreationsFundsReceived), this.handleNewBuyOutput(newBuyFundsReceived),
    ]);
  }

  private filterMetadata<
      T extends | TicketCreationMetadata | TicketBuyMetadata, U extends OrbitDbKeyValData<T>,
  >(outputs: AddressWithUnspentOutputs[], metadata: U[]): NewFundsData<T>[] {
    return outputs.reduce<NewFundsData<T>[]>((acc: NewFundsData<T>[], output: AddressWithUnspentOutputs) => {
      const metadataMatch = metadata.find((m: U) => m.addressOrNftId === output.address && !m.data.isProcessing);
      if (metadataMatch) {
        metadataMatch.data.isProcessing = true;
        acc.push({ fundsReceived: output, data: metadataMatch.data });
      }
      return acc;
    }, []);
  }

  private async handleNewCreationOutput(newCreationsFundsData: NewFundsData<TicketCreationMetadata>[]) {
    try {
      for (const creation of newCreationsFundsData) {
        const data: TicketCreationMetadata = creation.data;
        const creationMetadataTable: KeyValTable<TicketCreationMetadata> = await this.orbitDb.ticketCreationMetadataTable();
        await creationMetadataTable.update(creation.fundsReceived.address, creation.data);

        const { fundsReceived } = creation;
        console.log(fundsReceived);
        const output: OutputData = await this.stronghold.account.getOutput(fundsReceived.outputIds[0]);
        console.log(output);
        if (output?.output?.getAmount()) {
          const amount: bigint = output.output.getAmount();
          console.log(amount >= data.estimateStorageDeposit);
          if (amount >= data.estimateStorageDeposit) {
            await this.mintTickets(data);
            await creationMetadataTable.remove(creation.fundsReceived.address);
          }
        }
      }
    } catch (e) { console.log(e); }
  }

  private async handleNewBuyOutput(newBuyFundsData: NewFundsData<TicketBuyMetadata>[]) {
    try {
      for (const buyFundsData of newBuyFundsData) {
        const data: TicketBuyMetadata = buyFundsData.data;
        const buyMetadataTable: KeyValTable<TicketBuyMetadata> = await this.orbitDb.ticketBuyMetadataTable();
        await buyMetadataTable.update(buyFundsData.fundsReceived.address, buyFundsData.data);

        const { fundsReceived } = buyFundsData;
        const output: OutputData = await this.stronghold.account.getOutput(fundsReceived.outputIds[0]);
        if (output?.output?.getAmount()) {
          const amount: bigint = output.output.getAmount();
          if (amount >= data.totalPriceInSmallestUnit) {
            await this.transferTickets(buyFundsData.data);
            await buyMetadataTable.remove(buyFundsData.fundsReceived.address);
          }
        }
      }
    } catch (e) { console.log(e); }
  }

  private async mintTickets(data: TicketCreationMetadata): Promise<Transaction[]> {
    const ticketsTransactions: Transaction[] = [];
    const preparedCollectionTicketTransaction: PreparedTransaction = await this.stronghold.account.prepareMintNfts([data.nftOptions[0]]);
    const collectionTicketTransaction: Transaction = await preparedCollectionTicketTransaction.send();
    await this.stronghold.client.retryUntilIncluded(collectionTicketTransaction.blockId);
    await this.stronghold.account.sync();
    ticketsTransactions.push(collectionTicketTransaction);

    const collectionNftId: string = Utils.computeNftId(Utils.computeOutputId(collectionTicketTransaction.transactionId, 0));
    if (!collectionNftId) { return; }

    const issuer: string = Utils.nftIdToBech32(collectionNftId, this.stronghold.bech32HRP);
    const nftOptionsWithCollectionIdAsIssuer = data.nftOptions.slice(1).map((n: MintNftParams) => ({ ...n, issuer }));

    const preparedTicketsTransaction: PreparedTransaction = await this.stronghold.account.prepareMintNfts(nftOptionsWithCollectionIdAsIssuer);
    const ticketsTransaction: Transaction = await preparedTicketsTransaction.send();
    await this.stronghold.client.retryUntilIncluded(ticketsTransaction.blockId);
    await this.stronghold.account.sync();
    ticketsTransactions.push(ticketsTransaction);

    return ticketsTransactions;
  }

  private async transferTickets(data: TicketBuyMetadata): Promise<Transaction> {
    const allEvents: EventNft[] = await this.getAllEvents();
    const event: EventNft = allEvents.find(e => e.eventId === data.eventId);
    if (!event) { return; }

    const nftsToTransfer: SendNftParams[] = event.nfts
      .filter((n: EventNftIdentifier) => !n.isCollectionNft).slice(0, data.ticketAmount)
      .map((n: EventNftIdentifier) => ({ address: data.buyerAddress, nftId: n.nftId }));

    const preparedNftTransaction: PreparedTransaction = await this.stronghold.account.prepareSendNft(nftsToTransfer);
    const [nftTransaction, amountTransaction] = await Promise.all([
      preparedNftTransaction.send(), this.stronghold.account.send(data.totalPriceInSmallestUnit.toString(), event.issuerAddress),
    ]);
    console.log(nftTransaction, amountTransaction);
  }

  private async getTicketRedemptionData(nftId: string): Promise<TicketRedemption> {
    const redemptionTable: KeyValTable<TicketRedemption> = await this.orbitDb.ticketRedemptionTable();
    return  redemptionTable.getByKey(nftId);
  }

  private checkIfNftOutputMatchesEventId(nftOutput: NftOutput, eventId: string): boolean {
    const immutableFeatures: Feature[] = nftOutput.getImmutableFeatures();
    const metadataFeature: MetadataFeature = immutableFeatures.find((f: Feature) => f.getType() === FeatureType.Metadata) as MetadataFeature;
    if (!metadataFeature || !metadataFeature.getData()) { return false; }

    const nftMetadata: NftMetadata = JSON.parse(hexToUtf8(metadataFeature.getData())) as NftMetadata;
    if (!nftMetadata.attributes) { return false; }

    const { attributes } = nftMetadata;
    const metadataEventId: string = attributes.find(a => a.eventId).eventId;
    return metadataEventId === eventId;
  }

  private checkIfUnlockConditionPubKeyHashMatchesPublicKey(nftOutput: NftOutput, publicKey: string): boolean {
    const unlockConditions: UnlockCondition[] = nftOutput.getUnlockConditions();
    const address: AddressUnlockCondition = unlockConditions.find((c: UnlockCondition) => c.getType() === UnlockConditionType.Address) as AddressUnlockCondition;
    const pubKeyHash: string = address.getAddress().toString();

    const addressForPublicKey: Ed25519Address = Utils.parseBech32Address(Utils.hexPublicKeyToBech32Address(publicKey, this.stronghold.bech32HRP)) as Ed25519Address;
    return pubKeyHash === addressForPublicKey.getPubKeyHash();
  }

}
