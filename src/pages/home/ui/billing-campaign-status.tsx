import type { PackageOffer } from "@/services/billing.service";

export default function BillingCampaignStatus({ offer }: { offer: PackageOffer }) {
  const campaign = offer.terms.kind === "MEMBERSHIP" ? offer.campaign : null;
  if (!campaign || campaign.userLimit === null || campaign.remainingUsers === null) return null;
  const active = campaign.status === "ACTIVE" && offer.discountUzs > 0 &&
    offer.amountUzs < offer.terms.basePriceUzs;
  if (!active && campaign.status !== "RESERVED" && campaign.status !== "SOLD_OUT") return null;
  const remaining = campaign.status === "RESERVED" ? 0 : campaign.remainingUsers;

  return (
    <div className="mt-2 mb-2 text-sm leading-5">
      <p>{remaining.toLocaleString("tr-TR")} kontenjan kaldı</p>
    </div>
  );
}
