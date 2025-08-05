import { IPFlare, type IPGeolocationResponse } from 'ipflare';
import { apiEnv } from '../../../env';

export class GeolocationService {
  async getCurrency(ip: string) {
    const geolocator = new IPFlare({
      apiKey: apiEnv().IPFLARE_API_KEY,
    });

    const result = await geolocator.lookup(ip);

    if (!result.ok) {
      return null;
    }

    return this.resolveSupportedCurrency(result.data);
  }

  private resolveSupportedCurrency(location: IPGeolocationResponse) {
    const currency = location.currency;

    if (currency === 'usd' || currency === 'eur' || currency === 'gbp') {
      return currency;
    }

    if (location === undefined) {
      return null;
    }

    if (location.country_code === 'GB') {
      return 'gbp';
    }

    if (location.continent_code === 'EU') {
      // Lets check if they are in the EU
      return 'eur';
    }

    if (location.continent_code === 'NA') {
      // North America
      return 'usd';
    }

    return null;
  }
}

export const geolocationService = new GeolocationService();
