export interface RedemptionTokenRequest {
  publicKey: string;
}

export interface RedemptionTokenResponse {
  token: string;
  redemptionTokenRequestTimestamp: number;
}

