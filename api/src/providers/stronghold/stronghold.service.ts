import { Injectable } from '@nestjs/common';
import {
  Account, AddressWithUnspentOutputs, Client, Utils, Wallet,
} from '@iota/sdk';
import { ConfigService } from '@nestjs/config';
import {
  BehaviorSubject, distinctUntilChanged, filter, first, firstValueFrom,
} from 'rxjs';

const FAUCET_ADDRESS = 'https://faucet.testnet.shimmer.network/api/enqueue';
const MARKETPLACE_ACCOUNT = 'iota-nft-ticket-marketplace';
const BALANCE_LISTENER_INTERVAL = 1000;

@Injectable()
export class StrongholdService {
  private readonly walletInstance: Wallet;
  private readonly strongholdInitialized$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private readonly addressesWithUnspentOutputsSubject: BehaviorSubject<AddressWithUnspentOutputs[]> =
    new BehaviorSubject<AddressWithUnspentOutputs[]>([]);

  private clientInstance: Client;
  private accountInstance: Account;

  constructor(private readonly configService: ConfigService) {
    this.walletInstance = new Wallet({
      clientOptions: {
        nodes: [this.configService.get('iota.network')],
      },
      storagePath: './iota-stronghold-storage',
      coinType: 4219,
      secretManager: {
        stronghold: {
          snapshotPath: './iota-stronghold-snapshot',
          password: this.configService.get('iota.strongholdPassword'),
        },
      },
    });
    this.init();
  }

  get wallet() {
    return this.walletInstance;
  }

  get account() {
    return this.accountInstance;
  }

  get client() {
    return this.clientInstance;
  }

  get bech32HRP(): 'rms' | 'smr' {
    return this.configService.get('iota.network').includes('testnet') ? 'rms' : 'smr';
  }

  get strongholdInitialized(): Promise<boolean> {
    return firstValueFrom(this.strongholdInitialized$.pipe(filter((value: boolean) => value), first()));
  }

  get addressesWithUnspentOutputs(): AddressWithUnspentOutputs[] {
    return this.addressesWithUnspentOutputsSubject.value;
  }

  get addressesWithUnspentOutputs$() {
    return this.addressesWithUnspentOutputsSubject.asObservable().pipe(
      filter((value: AddressWithUnspentOutputs[]) => value.length > 0),
      distinctUntilChanged((a: AddressWithUnspentOutputs[], b: AddressWithUnspentOutputs[]) => {
        return JSON.stringify(a).split('').sort().join('') === JSON.stringify(b).split('').sort().join('');
      }),
    );
  }

  private async init() {
    if (this.strongholdInitialized$.value) { return; }

    this.clientInstance = await this.walletInstance.getClient();
    await this.initAccount();
    await this.initBalanceListener();
    this.strongholdInitialized$.next(true);
  }

  private async initAccount(): Promise<void> {
    if (this.strongholdInitialized$.value) { return; }

    try {
      this.accountInstance = await this.walletInstance.getAccount(MARKETPLACE_ACCOUNT);
    } catch (e) {
      console.log(e);
      if (e.error.includes('not found')) {
        console.log('Account not found, creating new account...');
      }
    }

    if (this.accountInstance) {
      try {
        await this.accountInstance.sync();
        await this.requestFundsFromFaucet();
      } catch (e) { console.log(e); }
    } else {
      await this.createAccount(MARKETPLACE_ACCOUNT);
    }
  }

  private async initBalanceListener(): Promise<void> {
    if (this.strongholdInitialized$.value) { return; }

    await this.syncBalance();
  }

  private async syncBalance(): Promise<void> {
    try {
      await this.account.sync();
      this.addressesWithUnspentOutputsSubject.next(await this.account.addressesWithUnspentOutputs());
    } catch (e) { console.log(e); }
    setTimeout(() => this.syncBalance(), BALANCE_LISTENER_INTERVAL);
  }

  private async createAccount(alias: string): Promise<void> {
    try {
      this.accountInstance = await this.walletInstance.createAccount({ alias });
      await this.requestFundsFromFaucet();
    } catch (e) {
      console.log(e);
      if (e.error.includes('no mnemonic') || e.error.includes('no password')) {
        console.log('No stronghold password or mnemonic found, creating new one...');
        await this.createStrongholdAccountManager();
        await this.createAccount(alias);
      }
    }
  }

  private async createStrongholdAccountManager(): Promise<void> {
    try {
      await this.walletInstance.setStrongholdPassword(this.configService.get('iota.strongholdPassword'));
      await this.walletInstance.storeMnemonic(this.configService.get('iota.mnemonic') || Utils.generateMnemonic());
    } catch (e) { console.log(e); }
  }

  private async requestFundsFromFaucet() {
    if (!this.configService.get('iota.network').includes('testnet')) {
      return;
    }
    const [address] = await this.accountInstance.generateEd25519Addresses(1);
    await this.client.requestFundsFromFaucet(FAUCET_ADDRESS, address.address);
  }

}
