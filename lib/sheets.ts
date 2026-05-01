import { Lead } from "./types";
import { LEAD_SOURCES } from "./sources";

export async function getLeadsFromSheet(): Promise<Lead[]> {
  // No sources configured yet — return mock data
  if (LEAD_SOURCES.length === 0) {
    return getMockLeads();
  }

  // Fetch all sources in parallel
  const results = await Promise.allSettled(
    LEAD_SOURCES.map(async ({ label, url, source, campaign }) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch from "${label}"`);
      const data = await res.json();
      const leads: Lead[] = data.leads ?? [];

      // Apply overrides: explicit source/campaign take priority, then existing value, then label
      return leads.map((lead) => ({
        ...lead,
        Source:   source   || lead.Source   || label,
        Campaign: campaign || lead.Campaign || "",
        _source: label,
      }));
    })
  );

  // Merge successful results, log failures
  const merged: Lead[] = [];
  let idCounter = 1;

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      result.value.forEach((lead) => {
        merged.push({ ...lead, _id: String(idCounter++) });
      });
    } else {
      console.error(`Source "${LEAD_SOURCES[i].label}" failed:`, result.reason);
    }
  });

  return merged;
}

function getMockLeads(): Lead[] {
  return [
    {
      _id: "2",
      Name: "Alice Chen",
      Email: "alice@example.com",
      Phone: "+1 555-0101",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"Website",
      Message: "Interested in your enterprise plan.",
      "Submitted At": "2025-04-01T09:15:00Z",
    },
    {
      _id: "3",
      Name: "Marcus Webb",
      Email: "marcus@techco.io",
      Phone: "+1 555-0234",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"Referral",
      Message: "A colleague recommended you. Looking for onboarding tools.",
      "Submitted At": "2025-04-03T14:22:00Z",
    },
    {
      _id: "4",
      Name: "Priya Sharma",
      Email: "priya.s@startup.in",
      Phone: "+91 98100 00123",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"LinkedIn",
      Message: "Saw your post. Want to learn more.",
      "Submitted At": "2025-04-05T11:00:00Z",
    },
    {
      _id: "5",
      Name: "Jordan Mills",
      Email: "jmills@agency.co",
      Phone: "+1 555-0388",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"Website",
      Message: "Need a custom quote for 15 seats.",
      "Submitted At": "2025-04-07T16:45:00Z",
    },
    {
      _id: "6",
      Name: "Sofia Romano",
      Email: "sofia@venture.eu",
      Phone: "+39 334 000 0000",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"Conference",
      Message: "Met your team at SaaStr. Following up.",
      "Submitted At": "2025-04-09T10:30:00Z",
    },
    {
      _id: "7",
      Name: "Daniel Park",
      Email: "d.park@bigcorp.com",
      Phone: "+82 10 0000 0000",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"Referral",
      Message: "Our CEO wants a demo next week.",
      "Submitted At": "2025-04-12T08:00:00Z",
    },
    {
      _id: "8",
      Name: "Leila Hassan",
      Email: "leila@design.ae",
      Phone: "+971 50 000 0000",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"Website",
      Message: "Looking for team collaboration features.",
      "Submitted At": "2025-04-14T13:20:00Z",
    },
    {
      _id: "9",
      Name: "Tom Bauer",
      Email: "tom@growth.de",
      Phone: "+49 151 000 0000",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"Email Campaign",
      Message: "Replied to your newsletter.",
      "Submitted At": "2025-04-16T09:50:00Z",
    },
    {
      _id: "10",
      Name: "Camille Dupont",
      Email: "c.dupont@mediagroup.fr",
      Phone: "+33 6 00 00 00 00",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"Conference",
      Message: "Interested in the content management features.",
      "Submitted At": "2025-04-18T15:00:00Z",
    },
    {
      _id: "11",
      Name: "Raj Patel",
      Email: "raj@saas.uk",
      Phone: "+44 7700 000000",
      Company: "",
      Industry: "",
      Campaign: "",
      Source:"Website",
      Message: "Quick question about API rate limits.",
      "Submitted At": "2025-04-21T12:10:00Z",
    },
  ];
}
