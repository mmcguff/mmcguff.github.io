import { expect, test, type APIRequestContext } from '@playwright/test';

// #32: devguff.com is DNSSEC-signed and validates. Live DNS, so @network (non-blocking in CI).
// Queries go through validating DNS-over-HTTPS resolvers: Node's dns module can't ask for DS/DNSKEY or report AD.
const DOMAIN = 'devguff.com';
const TYPE = { CNAME: 5, DS: 43, RRSIG: 46, DNSKEY: 48 } as const;

type DnsAnswer = { name: string; type: number; data: string };
type DnsJson = { Status: number; AD: boolean; Answer?: DnsAnswer[] };

const RESOLVERS = {
  '1.1.1.1': (name: string, type: string, extra = '') =>
    `https://cloudflare-dns.com/dns-query?name=${name}&type=${type}${extra}`,
  '8.8.8.8': (name: string, type: string, extra = '') => `https://dns.google/resolve?name=${name}&type=${type}${extra}`,
};

async function query(
  request: APIRequestContext,
  resolver: keyof typeof RESOLVERS,
  name: string,
  type: string,
  extra = '',
): Promise<DnsJson> {
  const res = await request.get(RESOLVERS[resolver](name, type, extra), {
    headers: { accept: 'application/dns-json' },
  });
  expect(res.ok(), `${resolver} ${type} ${name}: HTTP ${res.status()}`).toBe(true);
  return res.json();
}

const types = (json: DnsJson) => (json.Answer ?? []).map((a) => a.type);

// AC2
test(`a DS record for ${DOMAIN} is published in .com @network`, async ({ request }) => {
  const json = await query(request, '8.8.8.8', DOMAIN, 'DS');
  expect(json.Status).toBe(0);
  expect(types(json)).toContain(TYPE.DS);
});

// AC4
test(`${DOMAIN} publishes signed DNSKEYs @network`, async ({ request }) => {
  const json = await query(request, '8.8.8.8', DOMAIN, 'DNSKEY', '&do=true');
  expect(types(json)).toContain(TYPE.DNSKEY);
  expect(types(json)).toContain(TYPE.RRSIG);
});

// AC3
for (const resolver of Object.keys(RESOLVERS) as Array<keyof typeof RESOLVERS>) {
  test(`${resolver} validates the ${DOMAIN} A records @network`, async ({ request }) => {
    const json = await query(request, resolver, DOMAIN, 'A');
    expect(json.Status).toBe(0);
    expect(json.AD).toBe(true);
  });

  test(`${resolver} validates the www.${DOMAIN} CNAME @network`, async ({ request }) => {
    const json = await query(request, resolver, `www.${DOMAIN}`, 'CNAME');
    expect(json.Status).toBe(0);
    expect(types(json)).toContain(TYPE.CNAME);
    expect(json.AD).toBe(true);
  });
}
