/**
 * Paste your Google Apps Script Web App URLs here.
 * Each entry is one spreadsheet source.
 * Deploy via: Extensions → Apps Script → Deploy → New deployment → Web App
 *
 * Optional overrides:
 *   source   — forces the Source field for every lead from this sheet
 *   campaign — forces the Campaign field for every lead from this sheet
 */
export const LEAD_SOURCES: {
  label: string;
  url: string;
  source?: string;
  campaign?: string;
}[] = [
  {
    label: "Website",
    url: "https://script.google.com/macros/s/AKfycbwVfs0fKql70NJNvW65pxs0KRQdPxFUYDmISCNBgPb2w_VwLacHHrYcT2Q62i1bGkwnag/exec",
  },
  {
    label: "Meta Ads — Instant Forms",
    url: "https://script.google.com/macros/s/AKfycbwTjBJG7rmGHouvWGidbYIKhRbY-6gZOAK78SqjDliPN8Nq71BcOKDJUqubjlsbM7qp/exec",
    source: "Meta Ads",
    campaign: "Instant Forms - April 26",
  },
  {
    label: "Meta Ads — Website Visit",
    url: "https://script.google.com/macros/s/AKfycbxgZiqY3PGEY_8kGVDSKYOiDuBDmt_ShH_g5pVUM_9D5sbYZ6lzE6u8WQ8uM1oz0-XH/exec",
    source: "Meta Ads",
    campaign: "Website Visit - April",
  },
];
