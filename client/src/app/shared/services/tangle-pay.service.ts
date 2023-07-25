import { Injectable } from '@angular/core';
import IotaSDK from '../libs/tangle-pay-sdk';
import { BehaviorSubject, filter, first, lastValueFrom, Observable, ReplaySubject } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { NftMetadata } from '../models';

export type TanglePayAddress = {
  address: string;
  nodeId: number;
};

export type TanglePayBalance = {
  amount: number;
  collectibles: NftMetadata[];
  others: [];
  nativeTokens: [];
};

@Injectable({
  providedIn: 'root',
})
export class TanglePayService {
  private readonly tanglePayInitialized$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private readonly currentAddressSubject = new ReplaySubject<string | null>();
  private currentConnectedAddress: string | null = null;

  constructor(private toastCtrl: ToastController) {
    window.addEventListener('iota-ready', () => this.init());
  }

  get tanglePayInitialized(): Promise<boolean> {
    return lastValueFrom(
      this.tanglePayInitialized$.pipe(filter((value: boolean) => value), first()),
    );
  }

  get currentAddress(): string | null {
    return this.currentConnectedAddress;
  }

  get currentAddress$(): Observable<string | null> {
    return this.currentAddressSubject.asObservable();
  }

  public async connectWallet(initialConnect = false) {
    if (!initialConnect) { await this.tanglePayInitialized; }

    try {
      const res = await IotaSDK
        .request({ method: 'iota_connect', params: null, timeout: 3000000 }) as TanglePayAddress;
      if (!res || !res.address) { return; }
      this.changeAddress(res.address);
    } catch (e) { console.log(e); }
  }

  public async getCurrentAddress(): Promise<string | null> {
    await this.tanglePayInitialized;

    let address = this.currentAddress;
    if (!address) {
      await this.connectWallet();
    }
    address = this.currentAddress;

    if (!address) {
      const toast = await this.toastCtrl.create({ message: 'Please connect your TanglePay wallet', duration: 3000 });
      await toast.present();
      return null;
    }

    return address;
  }

  public async getBalance(address: string): Promise<TanglePayBalance> {
    await this.tanglePayInitialized;

    let res: TanglePayBalance = { amount: 0, collectibles: [], others: [], nativeTokens: [] };
    try {
      res = await IotaSDK.request({
        method: 'iota_getBalance',
        params: { assetsList: ['soonaverse'], addressList: [address] },
        timeout: 3000000,
      }) as TanglePayBalance;
    } catch (e) { console.log(e); }

    return res;
  }

  public async getPublicKey(address: string): Promise<string | undefined> {
    await this.tanglePayInitialized;

    let res;
    try {
      res = await IotaSDK.request({
        method: 'iota_getPublicKey',
        params: { addressList: [address] },
        timeout: 3000000,
      }) as string;
    } catch (e) { console.log(e); }

    return res;
  }

  public async sendValue(address: string, value: number) {
    await this.tanglePayInitialized;

    try {
      await IotaSDK.request({
        method: 'iota_sendTransaction',
        params: { to: address, value, data: '', unit: 'SMR' },
        timeout: 3000000,
      });
    } catch (e) { console.log(e); }
  }

  public async signData(content: string): Promise<string | undefined> {
    await this.tanglePayInitialized;

    let res;
    try {
      res = await IotaSDK.request({
        method: 'iota_sign',
        params: { content },
        timeout: 3000000,
      }) as string;
    } catch (e) { console.log(e); }

    return res;
  }

  private async init() {
    if (this.tanglePayInitialized$.value) { return; }

    await this.connectWallet(true);
    IotaSDK.on('accountsChanged', (accounts: TanglePayAddress) => this.changeAddress(accounts.address));

    this.tanglePayInitialized$.next(true);
  }

  private changeAddress(walletAddress: string | null) {
    this.currentConnectedAddress = walletAddress;
    this.currentAddressSubject.next(walletAddress);
  }

}
