import { prisma } from "./db";
import { CommerceError } from "./errors";

export type AddressInput = {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  street: string;
  building: string;
  extraDetails?: string;
  deliveryInstructions?: string;
};

export function assertAddress(input: AddressInput) {
  const required: (keyof AddressInput)[] = ["fullName", "phone", "country", "city", "area", "street", "building"];
  for (const field of required) {
    if (!String(input[field] || "").trim()) {
      throw new CommerceError("ADDRESS_REQUIRED", "Enter the full delivery address, including area and building.");
    }
  }
}

export async function listShippingMethods(address: { country: string; city: string; area: string }) {
  const zones = await prisma.shippingZone.findMany({
    where: { active: true },
    include: { methods: { where: { active: true }, orderBy: { feeCents: "asc" } } },
  });
  const country = address.country.trim().toUpperCase();
  const place = `${address.area} ${address.city}`.toLowerCase();
  const matching = zones.filter((zone) => zone.countries.map((item) => item.toUpperCase()).includes(country));
  const specific = matching.filter((zone) =>
    zone.areas.some((area) => place.includes(area.toLowerCase()) || area.toLowerCase() === address.area.trim().toLowerCase() || area.toLowerCase() === address.city.trim().toLowerCase()),
  );
  const chosen = specific.length > 0 ? specific : matching.filter((zone) => zone.areas.length === 0);
  return chosen.flatMap((zone) => zone.methods.map((method) => ({ ...method, zoneName: zone.name })));
}

export async function resolveShippingMethod(methodId: string, address: { country: string; city: string; area: string }) {
  const methods = await listShippingMethods(address);
  const method = methods.find((item) => item.id === methodId);
  if (!method) throw new CommerceError("SHIPPING_UNAVAILABLE", "Choose a shipping method for this address.");
  return method;
}
