type SupportedCurrency = 'usd' | 'eur' | 'gbp';

type GeoLocation = {
  countryCode: string | null;
  continentCode: string | null;
};

export class GeolocationService {
  async getCurrency(headers: Headers): Promise<SupportedCurrency | null> {
    const location = this.getLocationFromHeaders(headers);

    if (!(location.countryCode || location.continentCode)) {
      return null;
    }

    return this.resolveSupportedCurrency(location);
  }

  private getLocationFromHeaders(headers: Headers): GeoLocation {
    return {
      countryCode: headers.get('x-vercel-ip-country'),
      continentCode: headers.get('x-vercel-ip-continent'),
    };
  }

  private resolveSupportedCurrency(
    location: GeoLocation
  ): SupportedCurrency | null {
    if (location.countryCode === 'GB') {
      return 'gbp';
    }

    if (location.continentCode === 'EU') {
      return 'eur';
    }

    if (location.continentCode === 'NA') {
      return 'usd';
    }

    return null;
  }
}

export const geolocationService = new GeolocationService();
