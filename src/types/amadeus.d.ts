declare module "amadeus" {
  interface AmadeusConfig {
    clientId: string;
    clientSecret: string;
    hostname?: string;
  }

  interface AmadeusResponse {
    data: Record<string, unknown>[];
    result?: {
      dictionaries?: {
        carriers?: Record<string, string>;
      };
      errors?: Array<{ detail: string }>;
    };
  }

  class Amadeus {
    constructor(config: AmadeusConfig);
    shopping: {
      flightOffersSearch: {
        get(params: Record<string, string | number>): Promise<AmadeusResponse>;
      };
    };
    referenceData: {
      locations: {
        get(params: Record<string, string | number>): Promise<AmadeusResponse>;
      };
    };
  }

  export = Amadeus;
}
