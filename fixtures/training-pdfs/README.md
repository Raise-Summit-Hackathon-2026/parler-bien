# Training PDF fixtures

Realistic corporate training documents for uploading in **Character Builder** (PDF mode). Each file is a fictional company's internal ops manual with procedures, approved phrases, scenarios, and escalation tables — the kind of content the character generator extracts for roleplay scenarios.

All PDFs are under 500 KB (well below the 4 MB upload limit).

## Catalog

| File | Company | Role / use case |
|------|---------|-----------------|
| [skybridge-cabin-de-escalation.pdf](./skybridge-cabin-de-escalation.pdf) | Skybridge Airways | Cabin crew — passenger de-escalation & reassurance |
| [meridian-retail-complaints.pdf](./meridian-retail-complaints.pdf) | Meridian Retail Co. | Store associate — customer complaint handling |
| [northgate-patient-intake.pdf](./northgate-patient-intake.pdf) | Northgate Medical Group | Front desk — patient intake & privacy |
| [harbor-hotel-check-in.pdf](./harbor-hotel-check-in.pdf) | Harbor Hotel Group | Front desk — check-in & VIP arrivals |
| [brightpath-fraud-verification.pdf](./brightpath-fraud-verification.pdf) | BrightPath Community Bank | Call center — fraud verification scripts |
| [freshfork-allergy-protocol.pdf](./freshfork-allergy-protocol.pdf) | FreshFork Restaurants | Server — allergy disclosure & cross-contamination |
| [summit-logistics-incident-report.pdf](./summit-logistics-incident-report.pdf) | Summit Logistics | Warehouse — safety incident reporting |
| [techflow-tier1-escalation.pdf](./techflow-tier1-escalation.pdf) | TechFlow SaaS | Support agent — tier-1 escalation playbook |
| [buildright-site-induction.pdf](./buildright-site-induction.pdf) | BuildRight Construction | Site supervisor — subcontractor safety induction |
| [carelink-home-visit.pdf](./carelink-home-visit.pdf) | CareLink Home Services | Care worker — in-home visit protocol |

## Usage

1. Open **Workspaces** → create or open a workspace → **New character**.
2. Switch to **Upload** mode and select any PDF from this folder.
3. Choose **English** (and a region/accent if desired) and generate.

Suggested pairing: use the **professional** category context; workspace description can name the company from the PDF for tighter scenarios.

## Regenerating PDFs

Sources live in [`source/`](./source/) as markdown. To rebuild after editing:

```bash
bun run generate:training-pdfs
```

Requires `pdfkit` (dev dependency). Commit both sources and generated PDFs so teammates do not need to run the script.
