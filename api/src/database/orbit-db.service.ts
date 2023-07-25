import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { IpfsService } from '../providers/ipfs/ipfs.service';
import { OrbitDBAddress, OrbitDB } from 'orbit-db';
import { BehaviorSubject, filter, first, lastValueFrom } from 'rxjs';
import KeyValueStore from 'orbit-db-kvstore';
import { TicketBuyMetadata, TicketCreationMetadata, TicketRedemption, TicketRedemptionToken } from '../models';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const orbit: OrbitDB = require('orbit-db');
export const CLEAN_UP_DB_TIMEOUT = 1000 * 60 * 5; // 5 minutes

export enum OrbitDbTables {
  TicketCreationMetadata = 'ticketCreationMetadata',
  TicketBuyMetadata = 'ticketBuyMetadata',
  TicketRedemptionTokens = 'ticketRedemptionTokens',
  TicketRedemption = 'ticketRedemption',
}

export interface OrbitDbKeyValData<T extends | TicketCreationMetadata | TicketBuyMetadata | TicketRedemption | TicketRedemptionToken> {
  addressOrNftId: string;
  data: T;
}

export interface KeyValTable<T> {
  table: KeyValueStore<T>;
  getAll: () => Promise<Array<{ addressOrNftId: string; data: T }>>;
  getByKey: (addressKey: string) => Promise<T>;
  add: (addressKey: string, data: T) => Promise<void>;
  remove: (addressKey: string) => Promise<void>;
  update: (addressKey: string, data: T) => Promise<void>;
}

type Metadata<T> = { [address: string]: T };

const ObitDbTableTypes = new Map<OrbitDbTables, string>([
  [OrbitDbTables.TicketCreationMetadata, 'keyvalue'],
  [OrbitDbTables.TicketBuyMetadata, 'keyvalue'],
  [OrbitDbTables.TicketRedemption, 'keyvalue'],
]);

@Injectable()
export class OrbitDbService implements OnModuleDestroy {
  private readonly dbCleanUpInterval: NodeJS.Timeout = setInterval(async () => this.cleanUpDb(), CLEAN_UP_DB_TIMEOUT);
  private readonly orbitDbInitialized$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private orbitDb: OrbitDB;

  constructor(private readonly ipfsService: IpfsService) {
    this.init();
    this.cleanUpDb();
  }

  onModuleDestroy() {
    clearInterval(this.dbCleanUpInterval);
  }

  get orbit() {
    return this.orbitDb;
  }

  get orbitInitialized(): Promise<boolean> {
    return lastValueFrom(
      this.orbitDbInitialized$.pipe(filter((value) => value), first()),
    );
  }

  async keyValTable<T>(tableName: string): Promise<KeyValTable<T>> {
    await this.orbitInitialized;
    const table = await this.orbitDb.keyvalue<T>(tableName);
    await table.load();

    const getAllData = async () => {
      const metadata: Metadata<T> = table.all;
      return Object.keys(metadata).map((addressOrNftId: string) => ({
        addressOrNftId,
        data: metadata[addressOrNftId],
      }));
    };

    const getByAddressKey = async (addressKey: string) => {
      return table.get(addressKey);
    };

    const addMetadata = async (addressKey: string, data: T): Promise<void> => {
      await table.put(addressKey, data);
    };

    const removeMetadata = async (addressKey: string): Promise<void> => {
      await table.del(addressKey);
    };

    const updateMetadata = async (addressKey: string, data: T): Promise<void> => {
      await table.set(addressKey, data);
    };

    return { table, getAll: getAllData, getByKey: getByAddressKey, add: addMetadata, remove: removeMetadata, update: updateMetadata };
  }

  async ticketCreationMetadataTable(): Promise<KeyValTable<TicketCreationMetadata>> {
    return this.keyValTable<TicketCreationMetadata>(OrbitDbTables.TicketCreationMetadata);
  }

  async ticketBuyMetadataTable(): Promise<KeyValTable<TicketBuyMetadata>> {
    return this.keyValTable<TicketBuyMetadata>(OrbitDbTables.TicketBuyMetadata);
  }

  async ticketRedemptionTable(): Promise<KeyValTable<TicketRedemption>> {
    return this.keyValTable<TicketRedemption>(OrbitDbTables.TicketRedemption);
  }

  async ticketRedemptionTokensTable(): Promise<KeyValTable<TicketRedemptionToken>> {
    return this.keyValTable<TicketRedemptionToken>(OrbitDbTables.TicketRedemptionTokens);
  }

  private async init(): Promise<void> {
    if (this.orbitDbInitialized$.value) { return; }
    await this.ipfsService.ipfsInitialized;

    this.orbitDb = await orbit.createInstance(this.ipfsService.ipfs);
    const orbitDbLoaderPromises: Array<() => void> = [];
    ObitDbTableTypes.forEach((type: string, name: OrbitDbTables) => {
      orbitDbLoaderPromises.push(async () => {
        const address: OrbitDBAddress = await this.orbitDb.determineAddress(name, type);
        console.log(`Opening OrbitDB ${name} at ${address.toString()}`);
        const db = await this.orbitDb.open(address);
        await db.load();
      });
    });

    await Promise.all(orbitDbLoaderPromises.map((p) => p()));

    this.orbitDbInitialized$.next(true);
  }

  public async deleteTimedOutMetadata<
      T extends | TicketCreationMetadata | TicketBuyMetadata,
  >(metadata: { addressOrNftId: string, data: T }[], table: KeyValTable<T>): Promise<{ addressOrNftId: string, data: T }[]> {
    const timedOutMetadata: { addressOrNftId: string, data: T }[] = metadata.filter((m: { addressOrNftId: string, data: T }) => {
      const timedOut: boolean = Date.now() - m.data.metadataCreationTimestamp > CLEAN_UP_DB_TIMEOUT;
      return timedOut && !m.data.isProcessing;
    });
    await Promise.all(timedOutMetadata.map((m: { addressOrNftId: string, data: T }) => table.remove(m.addressOrNftId)));
    return metadata.filter((m: { addressOrNftId: string, data: T }) => !timedOutMetadata.includes(m));
  }

  private async cleanUpDb() {
    await this.orbitInitialized;

    const [ticketCreationMetadataTable, ticketBuyMetadataTable, ticketRedemptionTokensTable] = await Promise.all([
      this.ticketCreationMetadataTable(),
      this.ticketBuyMetadataTable(),
      this.ticketRedemptionTokensTable(),
    ]);
    const [creationMetadata, buyMetadata, redemptionTokens] = await Promise.all([
      ticketCreationMetadataTable.getAll(),
      ticketBuyMetadataTable.getAll(),
      ticketRedemptionTokensTable.getAll(),
    ]);
    const timedOutCreationMetadata = creationMetadata.filter(m => Date.now() - m.data.metadataCreationTimestamp > CLEAN_UP_DB_TIMEOUT);
    const timedOutBuyMetadata = buyMetadata.filter(m => Date.now() - m.data.metadataCreationTimestamp > CLEAN_UP_DB_TIMEOUT);
    const timedOutRedemptionTokens = redemptionTokens.filter(t => Date.now() - t.data.redemptionTokenRequestTimestamp > CLEAN_UP_DB_TIMEOUT);
    await Promise.all([
      ...timedOutCreationMetadata.map(m => ticketCreationMetadataTable.remove(m.addressOrNftId)),
      ...timedOutBuyMetadata.map(m => ticketBuyMetadataTable.remove(m.addressOrNftId)),
      ...timedOutRedemptionTokens.map(t => ticketRedemptionTokensTable.remove(t.addressOrNftId)),
    ]);
  }

}
