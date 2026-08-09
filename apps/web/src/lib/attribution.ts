'use client';

import posthog from 'posthog-js';

type AttributionParams = {
  ref?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
  wbraid?: string | null;
  gbraid?: string | null;
  referrer?: string | null;
  referring_domain?: string | null;
  landing_page?: string | null;
  timestamp?: string | null;
};

type StoredAttribution = {
  initial: AttributionParams & { timestamp: string };
  last: AttributionParams & { timestamp: string };
};

const STORAGE_KEY = 'vg_attribution';

export function parseAttributionFromLocation(): AttributionParams {
  if (typeof window === 'undefined') return {};
  const url = new URL(window.location.href);
  const params = url.searchParams;

  const ref = params.get('ref');
  const utm_source = params.get('utm_source') || params.get('source') || null;
  const utm_medium = params.get('utm_medium');
  const utm_campaign = params.get('utm_campaign');
  const utm_content = params.get('utm_content');
  const utm_term = params.get('utm_term');
  const gclid = params.get('gclid');
  const wbraid = params.get('wbraid');
  const gbraid = params.get('gbraid');

  const referrer = document.referrer || null;
  const referring_domain = referrer
    ? (() => {
        try {
          return new URL(referrer).hostname;
        } catch {
          return null;
        }
      })()
    : null;

  const landing_page = window.location.pathname + window.location.search;

  return {
    ref: ref || null,
    utm_source: utm_source || (ref ? `ref:${ref}` : null),
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    utm_content: utm_content || null,
    utm_term: utm_term || null,
    gclid: gclid || null,
    wbraid: wbraid || null,
    gbraid: gbraid || null,
    referrer,
    referring_domain,
    landing_page,
    timestamp: new Date().toISOString(),
  };
}

export function loadStoredAttribution(): StoredAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAttribution) : null;
  } catch {
    return null;
  }
}

export function saveStoredAttribution(data: StoredAttribution): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // noop
  }
}

export function upsertAttribution(): StoredAttribution | null {
  if (typeof window === 'undefined') return null;
  const incoming = parseAttributionFromLocation();

  const hasIncoming = Object.entries(incoming).some(
    ([key, value]) => key !== 'timestamp' && value
  );

  const existing = loadStoredAttribution();
  if (!existing) {
    const initial = hasIncoming
      ? (incoming as Required<AttributionParams>)
      : {
          ref: null,
          utm_source: null,
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          utm_term: null,
          gclid: null,
          wbraid: null,
          gbraid: null,
          referrer: document.referrer || null,
          referring_domain: document.referrer
            ? (() => {
                try {
                  return new URL(document.referrer).hostname;
                } catch {
                  return null;
                }
              })()
            : null,
          landing_page:
            typeof window !== 'undefined'
              ? window.location.pathname + window.location.search
              : null,
          timestamp: new Date().toISOString(),
        };
    const last = hasIncoming
      ? (incoming as Required<AttributionParams>)
      : { ...initial };
    const created = { initial, last } as StoredAttribution;
    saveStoredAttribution(created);
    return created;
  }

  // Only update last-touch if we received any new incoming params
  if (hasIncoming) {
    const updated: StoredAttribution = {
      initial: existing.initial,
      last: incoming as Required<AttributionParams & { timestamp: string }>,
    };
    saveStoredAttribution(updated);
    return updated;
  }

  return existing;
}

export function registerPostHogSuperProperties(data: StoredAttribution | null) {
  if (!posthog || !data) return;
  const { initial, last } = data;

  // First-touch (sticky) properties
  posthog.register_once({
    initial_ref: initial.ref || undefined,
    initial_utm_source: initial.utm_source || undefined,
    initial_utm_medium: initial.utm_medium || undefined,
    initial_utm_campaign: initial.utm_campaign || undefined,
    initial_utm_content: initial.utm_content || undefined,
    initial_utm_term: initial.utm_term || undefined,
    initial_gclid: initial.gclid || undefined,
    initial_wbraid: initial.wbraid || undefined,
    initial_gbraid: initial.gbraid || undefined,
    initial_referrer: initial.referrer || undefined,
    initial_referring_domain: initial.referring_domain || undefined,
    initial_landing_page: initial.landing_page || undefined,
    initial_attribution_timestamp: initial.timestamp || undefined,
  });

  // Last-touch (mutable) properties
  posthog.register({
    last_ref: last.ref || undefined,
    last_utm_source: last.utm_source || undefined,
    last_utm_medium: last.utm_medium || undefined,
    last_utm_campaign: last.utm_campaign || undefined,
    last_utm_content: last.utm_content || undefined,
    last_utm_term: last.utm_term || undefined,
    last_gclid: last.gclid || undefined,
    last_wbraid: last.wbraid || undefined,
    last_gbraid: last.gbraid || undefined,
    last_referrer: last.referrer || undefined,
    last_referring_domain: last.referring_domain || undefined,
    last_landing_page: last.landing_page || undefined,
    last_attribution_timestamp: last.timestamp || undefined,
  });
}

export function getAttributionForIdentify(): Record<string, unknown> {
  const stored = loadStoredAttribution();
  if (!stored) return {};
  const { initial } = stored;
  return {
    initial_ref: initial.ref || undefined,
    initial_utm_source: initial.utm_source || undefined,
    initial_utm_medium: initial.utm_medium || undefined,
    initial_utm_campaign: initial.utm_campaign || undefined,
    initial_utm_content: initial.utm_content || undefined,
    initial_utm_term: initial.utm_term || undefined,
    initial_referrer: initial.referrer || undefined,
    initial_referring_domain: initial.referring_domain || undefined,
    initial_landing_page: initial.landing_page || undefined,
    initial_attribution_timestamp: initial.timestamp || undefined,
  };
}


