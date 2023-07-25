import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TicketCreationResponse,
  EventNft,
  TicketCreationRequest,
  BuyTicketRequest, BuyTicketResponse, NftOutput, RedemptionTokenResponse, RedemptionTokenRequest, RedemptionRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly apiBaseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  public createTickets(ticketCreationRequest: TicketCreationRequest, file?: File): Promise<TicketCreationResponse> {
    const formData = new FormData();
    const { ticketName, issuerName, issuerAddress, ticketAmount, ticketPrice, eventDate } = ticketCreationRequest;
    formData.append('ticketName', ticketName);
    formData.append('issuerName', issuerName);
    formData.append('issuerAddress', issuerAddress);
    formData.append('ticketAmount', ticketAmount.toString());
    formData.append('ticketPrice', ticketPrice.toString());
    formData.append('eventDate', eventDate);
    if (file) {
      formData.append('file', file);
    }

    return lastValueFrom(
      this.http.post(`${this.apiBaseUrl}/iota-nft-ticket`, formData) as Observable<TicketCreationResponse>,
    );
  }

  public buyTicket(eventId: string, buyNftTicket: BuyTicketRequest): Promise<BuyTicketResponse> {
    return lastValueFrom(
      this.http.put(`${this.apiBaseUrl}/iota-nft-ticket/buy/${eventId}`, buyNftTicket) as Observable<BuyTicketResponse>,
    );
  }

  public checkTicketRedemption(eventId: string, nftId: string): Promise<Date> {
    return lastValueFrom(
      this.http.get(`${this.apiBaseUrl}/iota-nft-ticket/checkRedemption/${eventId}/${nftId}`) as Observable<Date>,
    );
  }

  public requestTicketRedemptionToken(
    eventId: string, nftId: string, requestNftTicketRedemptionToken: RedemptionTokenRequest,
  ): Promise<RedemptionTokenResponse> {
    return lastValueFrom(
      this.http.put(
        `${this.apiBaseUrl}/iota-nft-ticket/redemptionToken/${eventId}/${nftId}`, requestNftTicketRedemptionToken,
      ) as Observable<RedemptionTokenResponse>,
    );
  }

  public redeemTicket(eventId: string, nftId: string, redeemNftTicket: RedemptionRequest): Promise<Date> {
    return lastValueFrom(
      this.http.put(`${this.apiBaseUrl}/iota-nft-ticket/redeem/${eventId}/${nftId}`, redeemNftTicket) as Observable<Date>,
    );
  }

  public getEventById(eventId: string): Promise<EventNft> {
    return lastValueFrom(
      this.http.get(`${this.apiBaseUrl}/iota-nft-ticket/events/${eventId}`) as Observable<EventNft>,
    );
  }

  public getEventsByIssuerAddress(issuerAddress: string): Promise<EventNft[]> {
    return lastValueFrom(
      this.http.get(`${this.apiBaseUrl}/iota-nft-ticket/events-by-issuer-address/${issuerAddress}`) as Observable<EventNft[]>,
    );
  }

  public getAllEvents(): Promise<EventNft[]> {
    return lastValueFrom(
      this.http.get(`${this.apiBaseUrl}/iota-nft-ticket/events`) as Observable<EventNft[]>,
    );
  }

  public getNftOutputById(nftId: string): Promise<NftOutput> {
    return lastValueFrom(
      this.http.get(`${this.apiBaseUrl}/iota-nft-ticket/nft/${nftId}`) as Observable<NftOutput>,
    );
  }
}
