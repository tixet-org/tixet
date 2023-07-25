import { Injectable } from '@nestjs/common';
import { BehaviorSubject, filter, first, firstValueFrom } from 'rxjs';
import { dynamicImport } from 'tsimportlib';
import { IPFS } from 'ipfs-core-types';
import { Mtime } from 'ipfs-unixfs';

export interface AddResult {
  cid: any;
  size: number;
  path: string;
  mode?: number;
  mtime?: Mtime;
}

@Injectable()
export class IpfsService {
  private ipfsNode: IPFS;

  private readonly ipfsInitialized$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {
    this.init();
  }

  get ipfs() {
    return this.ipfsNode;
  }

  get ipfsInitialized(): Promise<boolean> {
    return firstValueFrom(this.ipfsInitialized$.pipe(filter((value: boolean) => value), first()));
  }

  addFile(file: Buffer): Promise<AddResult> {
    return this.ipfs.add(file);
  }

  private async init(): Promise<void> {
    if (this.ipfsInitialized$.value) { return; }

    const ipfsCore = (await dynamicImport('ipfs-core', module)) as typeof import('ipfs-core');
    this.ipfsNode = await ipfsCore.create({ relay: { enabled: true, hop: { enabled: true, active: true } } });
    this.ipfsInitialized$.next(true);
  }
}
