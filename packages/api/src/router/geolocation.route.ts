import type { TRPCRouterRecord } from '@trpc/server';
import { IPFlare } from 'ipflare';
import { apiEnv } from '../../env';
import { publicProcedure } from '../trpc';

export const authRouter = {
  getGeolocation: publicProcedure.mutation(async ({ ctx }) => {
    const geolocator = new IPFlare({
      apiKey: apiEnv().IPFLARE_API_KEY,
    });

    const ip = ctx.ip;

    const result = await geolocator.lookup(ip);

    return result;
  }),
} satisfies TRPCRouterRecord;
