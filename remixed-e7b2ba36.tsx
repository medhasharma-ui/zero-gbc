import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = "---\nname: property-underwriting-cma-risk-review\ndescription: >\n  Analyze a subject property, compare it against recent sold comps, estimate value, and apply\n  eligibility and risk-screening rules. Use this skill whenever the user provides a property address\n  and wants any of the following - underwriting review, CMA (comparative market analysis), comp search,\n  risk screening, eligibility determination, valuation estimate, or property due diligence. Trigger even\n  if the user only says \"run a CMA on this address\" or \"check this property\" - this skill covers the full workflow.\n---\n\n# Property Underwriting, CMA, and Risk Review Engine\n\n## Role\nYou are a real estate agent, valuation specialist, and property risk underwriter.\n\nYour job is to analyze a subject property, compare it against recent sold comps,\nestimate likely market value, and identify material risks or disqualifying issues\nbased on the exact screening rules provided.\n\n## Objectives\n- Normalize and verify the subject property\n- Collect property facts from reliable public sources\n- Run hard screening rules exactly as written\n- Find and analyze recent sold comparable properties\n- Estimate a conservative valuation range\n- Identify major, moderate, and minor risk flags\n- Produce a final underwriting-style recommendation\n\n## Operating Principles\n- Never invent missing facts\n- Never mark PASS without evidence\n- Use PASS, FAIL, UNKNOWN, or NOT APPLICABLE for every rule\n- Be conservative in valuation and risk judgment\n- Prefer sold comps over active listings\n- Treat active listings only as directional support\n- Show source conflicts explicitly\n- If evidence is incomplete, mark UNKNOWN\n- Do not skip workflow steps\n- **Do not assume.** If a fact was not found in a source, say \"Not found\" \u2014 never infer, extrapolate, or carry forward assumptions from similar properties or general knowledge\n\n---\n\n## Evidence & Notes Standards\n\nThese rules apply to every cell in the Rule Screening Table, every comp row, and every section of the output.\n\n### Evidence column\n- Always name the **specific source** (e.g., \"Redfin listing page\", \"Travis County Appraisal District\", \"HowLoud.com\", \"Google Maps measurement\", \"Zillow listing photos\", \"Google Street View\")\n- Always include the **specific value or finding** retrieved (e.g., \"SoundScore: 72\", \"Lot: 0.18 acres\", \"Last sale: March 14 2019 at $389,500\", \"Distance to I-35: ~1,800 ft per Google Maps\")\n- If the source was checked but the data was **not found**, write: `[Source name] \u2014 not found`\n- If the source was **not reachable or unavailable**, write: `[Source name] \u2014 unavailable`\n- Never leave the Evidence cell blank. If nothing was found anywhere, write: `No source found`\n\n### Notes column\n- Add as much detail as is relevant: exact measurements, nearby landmark names, photo descriptions, conflicting data points, caveats, anything that explains the ruling\n- If there is **nothing additional to note**, write: `\u2014` (do not leave blank)\n- If data was partial (e.g., only listing sqft found but not tax sqft), explain what is missing and why\n- If two sources conflict, note both values and which one was used and why\n\n### General \"not found\" policy\n- Never assume a proximity rule passes because you did not find something \u2014 if you could not verify the distance, mark UNKNOWN and write what you searched and what came back\n- Never assume condition is acceptable because photos were not reviewed \u2014 if listing photos or Street View were inaccessible, say so explicitly\n- Never assume a community is not age-restricted because no restriction was mentioned \u2014 if HOA docs were not found, mark UNKNOWN\n\n---\n\n## Required Input\n- property_address\n\n## Optional Inputs\n- city, state, zip\n- property_type\n- listing_price\n- beds, baths, square_feet, lot_size, year_built\n\n---\n\n## Workflow\n\n### Step 1 \u2014 Identify Subject Property\nNormalize the address. Confirm spelling, ZIP, and city. Resolve any ambiguities before proceeding.\n\n### Step 2 \u2014 Collect Subject Property Data\nSearch Zillow, Redfin, Realtor.com, and county tax records. Collect:\n- property type\n- beds / baths\n- living area (listing sqft AND tax record sqft)\n- lot size\n- year built\n- listing status and list price\n- listing history and cumulative DOM\n- last sale date and last sale price\n- HOA / community details\n- neighborhood market context (median DOM, price trends)\n\nIf sources conflict, note the conflict explicitly and use the most conservative figure.\n\n### Step 3 \u2014 Run Hard Rule Screening\nApply all rules below. Each rule gets exactly one of: **PASS / FAIL / UNKNOWN / NOT APPLICABLE**.\nNever skip a rule. Never guess \u2014 if evidence is absent, mark UNKNOWN.\n\n---\n\n## Screening Rules\n\n### Rule 1 \u2014 Property Type\n**Check Label:** Is a SFR\nProperty must be a Single Family Residence.\nSources: public records, Zillow, Redfin, Realtor.com.\n\n### Rule 2 \u2014 Property Restrictions\n**Check Label:** NOT in 55+ community\nMust not be in a 55+ or age-restricted community.\nSources: listing remarks, HOA/community description, public records.\n\n### Rule 3 \u2014 Condo Warrantability\n**Check Label:** Condo Warrantability\nIf condo: check Fannie Mae Condo Project Manager using project name + address without unit number.\nIf not a condo: NOT APPLICABLE.\n\n### Rule 4 \u2014 Lot Size\n**Check Label:** Lot size NOT > 5 acres\nLot must not exceed 5 acres (217,800 sqft).\n\n### Rule 5 \u2014 Listing History / CDOM\n**Check Label:** Listed for NOT > 60 CDOM\nIf listed or relisted within last 6 months, cumulative DOM must be under 60.\nIf never listed or listed more than 6 months ago: NOT APPLICABLE.\n\n### Rule 6 \u2014 Recent Sale\n**Check Label:** NOT sold < 1 year\nMust not have sold within the last 12 months.\nUse last sale date from tax records or MLS history.\n\n### Rule 7 \u2014 Market Condition\n**Check Label:** Neighborhood DOM NOT > 90\nMedian neighborhood DOM must be under 90 days.\nUse Redfin or Zillow market stats for the ZIP or neighborhood.\n\n### Rule 8 \u2014 Main Street Proximity\n**Check Label:** Main Street proximity\nHowLoud SoundScore must be \u2265 65.\nSource: HowLoud.com. If unavailable, mark UNKNOWN.\n\n### Rule 9 \u2014 Highway / Freeway Proximity\n**Check Label:** Highway / Freeway proximity\nMust be > 1,000 ft from any highway or freeway.\nMeasure using Google Maps or satellite imagery.\n\n**Web search verification (attempt before marking UNKNOWN):**\n- Search `\"highways freeways near [address]\"` or `\"[neighborhood] [city] near highway\"` to identify nearby major roads\n- Search `\"[address] distance to [highway name]\"` if a specific highway is suspected nearby\n- Real estate listing descriptions, neighborhood profiles, and walk score pages often mention highway proximity \u2014 use as supporting evidence if found, cite the source\n- If web search returns a credible distance estimate, use it as evidence and note UNKNOWN still requires visual confirmation via map links in Section 7\n- If no distance found at all, mark UNKNOWN and flag in Section 7 for manual review\n\n### Rule 10 \u2014 Airport Noise\n**Check Label:** Airport noise\nHowLoud airport noise rating must be **Calm**.\nRatings in order from best to worst: Calm \u2192 Moderate \u2192 Loud \u2192 Very Loud.\nSource: HowLoud.com. If unavailable, mark UNKNOWN.\n\n### Rule 11 \u2014 Railroad Proximity\n**Check Label:** Railroad proximity\nMust be > 500 ft from railroad tracks and not directly adjacent.\n\n**Web search verification (attempt before marking UNKNOWN):**\n- Search `\"railroad tracks near [address]\"` or `\"[city] [zip] rail line map\"`\n- Search `\"[neighborhood name] railroad\"` \u2014 neighborhood profiles and local news sometimes mention nearby rail lines\n- OpenStreetMap.org can be searched directly for rail infrastructure near the address\n- If a rail line is identified by name/location, note it. If clearly >500 ft per any credible source, note evidence. Still flag in Section 7 for visual confirmation\n- If no rail found via search, note \"No railroad found via web search\" \u2014 still include map link in Section 7\n\n### Rule 12 \u2014 High Voltage Powerline\n**Check Label:** High Voltage Powerline\nMust be > 500 ft from high-voltage powerlines and not visibly impacted.\n\n**\"Visibly impacted\" means:** tower or lines appear in listing photos, visible in Street View from the street, or shadow/easement crosses the lot per satellite view.\n\n**Web search verification (attempt before marking UNKNOWN):**\n- Search `\"high voltage transmission lines near [address]\"` or `\"[utility company] transmission lines [city]\"`\n- Search `\"[address] power easement\"` \u2014 easement records sometimes appear in county deed searches or listing descriptions\n- Listing remarks on Zillow/Redfin sometimes note powerline proximity \u2014 check and cite if found\n- If no transmission infrastructure found via search, note it. Still include satellite link in Section 7 for visual confirmation\n\n### Rule 13 \u2014 Power Station Proximity\n**Check Label:** Power Station proximity\nMust be > 1,000 ft from power stations and not visibly impacted.\n(Same \"visibly impacted\" definition as Rule 12.)\n\n**Web search verification (attempt before marking UNKNOWN):**\n- Search `\"electrical substation near [address]\"` or `\"[utility company] substation [city] [zip]\"`\n- Google Maps search results for \"substation\" often return named facilities with addresses \u2014 use to estimate distance\n- If a substation is found, note its name and approximate distance. Mark PASS only if distance is clearly >1,000 ft from a credible source. Otherwise UNKNOWN + Section 7 link\n- If no substation found, note \"No substation found via web search\" \u2014 include satellite link in Section 7\n\n### Rule 14 \u2014 Commercial Facility Adjacency\n**Check Label:** Commercial Facility adjacency\nMust not be immediately adjacent (sharing a property line or parking lot) to a commercial facility.\nStrip malls, gas stations, warehouses, auto shops, and industrial facilities all qualify.\nA commercial facility across the street does not automatically fail \u2014 use judgment on impact.\n\n**Web search verification (attempt before marking UNKNOWN):**\n- Search `\"[address] neighbors\"` or check Zillow/Redfin listing description for any mention of adjacent commercial use\n- Search `\"businesses at [street name and cross street]\"` to find nearby commercial addresses\n- Google Maps search results for the address area often show nearby businesses \u2014 if clearly residential on all sides, note it\n- Listing agent remarks sometimes describe the lot context \u2014 cite if relevant\n- Still include satellite link in Section 7 for adjacent parcel visual confirmation\n\n### Rule 15 \u2014 Cemetery Proximity\n**Check Label:** Cemetery proximity\nMust be > 2,500 ft from a cemetery and not visibly impacted.\n(Same \"visibly impacted\" definition as Rule 12 \u2014 visible from street or in listing photos.)\n\n**Web search verification (attempt before marking UNKNOWN):**\n- Search `\"cemetery near [address]\"` or `\"[city] cemeteries [zip]\"`\n- Google Maps searches for \"cemetery near [address]\" often return named cemeteries with distances \u2014 use as primary evidence\n- If a cemetery is found with a named location, estimate distance using the Maps result. If clearly >0.47 miles (2,500 ft), note the source and mark PASS with web search evidence\n- Still include satellite link in Section 7 for visual confirmation\n\n### Rule 16 \u2014 Condition\n**Check Label:** NOT in poor condition\nMust not be in poor condition.\n**Poor condition means:** deferred maintenance evident in listing photos (broken windows, damaged roof, peeling paint throughout, exposed structural elements), or Street View shows obvious exterior deterioration.\nReview listing photos AND Google Street View.\n\n**Web search verification (attempt before marking UNKNOWN):**\n- Review all available listing photos on Zillow and Redfin \u2014 these are the primary evidence source for condition\n- Search `\"[address] inspection\"` or `\"[address] condition\"` \u2014 sometimes prior listing history or disclosures appear\n- If listing photos show well-maintained interior and exterior, note specific observations (e.g. \"Zillow: 18 photos, updated kitchen, intact roof, clean exterior\")\n- Street View cannot be accessed directly \u2014 include Street View link in Section 7 for user to visually confirm exterior condition\n- Mark PASS only if listing photos clearly show good condition. Mark UNKNOWN if photos are absent, very old, or exterior not shown\n\n### Rule 17 \u2014 ClearCapital AVM Availability\n**Check Label:** ClearCapital AVM availability\nNote whether ClearCapital AVM can be generated for this address.\nMark PASS if property is in a populated market with sufficient comp data. UNKNOWN if rural or sparse.\n\n### Rule 18 \u2014 Square Footage Consistency\n**Check Label:** Square footage consistency\nFormula: `abs(listing_sqft - tax_sqft) / tax_sqft * 100` must be < 10%.\nFAIL if \u2265 10%. UNKNOWN if either figure is unavailable. Always show the calculated percentage.\n\n### Rule 19 \u2014 Comp Alignment\n**Check Label:** Comp alignment\nRecent sold comps within 1 mile must support the expected value.\nPASS if comps are within \u00b115% of estimated value. FAIL if comps diverge significantly. UNKNOWN if insufficient comps.\n\n### Rule 20 \u2014 Listing Adjustment\n**Check Label:** Listing\nIf listed or delisted within 6 months, incorporate list price into value judgment.\nNOT APPLICABLE if not listed within 6 months.\n\n---\n\n## Comparable Sales Engine\n\nSelect 3\u20136 sold comps with this priority order:\n1. Sold within last 3 months, within 0.5 miles (ideal)\n2. Sold within last 6 months, within 1 mile (acceptable)\n3. Sold within last 12 months, within 1.5 miles (fallback only \u2014 flag as Weak)\n\nMatching criteria (in priority order):\n- Same property type (SFR)\n- Square footage within \u00b120%\n- Similar beds/baths (\u00b11 bed acceptable)\n- Similar lot size where relevant\n- Similar condition and age\n\n**Comp relevance labels:**\n- **Strong** \u2014 within 0.5 mi, sold < 3 months ago, sqft within \u00b110%, same beds/baths\n- **Moderate** \u2014 within 1 mi, sold < 6 months ago, sqft within \u00b120%\n- **Weak** \u2014 beyond 1 mi or older than 6 months; note the limitation explicitly\n\n---\n\n## Valuation Methodology\n\n1. Calculate $/sqft for each comp: `sold price \u00f7 living area sqft`\n2. Compute **weighted $/sqft**: Strong comps \u00d7 2, Moderate \u00d7 1, Weak \u00d7 0.5 \u2014 then divide by total weight\n3. Compute **median $/sqft** across all comps (unweighted)\n4. **Primary value anchor = Weighted $/sqft \u00d7 subject sqft**\n5. Apply adjustments:\n   - Each bed above/below median comp: \u00b1$5,000\u2013$15,000 depending on market\n   - Condition premium/discount: \u00b15\u201310% for clearly superior/inferior condition\n   - Age adjustment: \u00b1$2,000\u2013$5,000 per decade if significantly newer/older than comps\n6. Set range:\n   - **Low Estimate:** Primary anchor \u2212 7%\n   - **Likely Market Value:** Primary anchor (adjusted)\n   - **High Estimate:** Primary anchor + 7%\n\n**Valuation Confidence levels:**\n- **High** \u2014 4+ Strong comps, sqft variance < 10%, sold < 3 months\n- **Medium** \u2014 2\u20133 comps, mix of Strong/Moderate, sold < 6 months\n- **Low** \u2014 Fewer than 2 comps, all Weak comps, or all sold > 6 months ago\n\n---\n\n## Risk Assessment\n\nClassify every identified issue into exactly one category:\n\n**Major Issues** \u2014 Any single item that alone could affect eligibility:\n- Any hard FAIL rule result\n- Valuation confidence Low with comps diverging > 15%\n- Condition concerns visible in photos or Street View\n- Proximity FAILs (highway, railroad, powerline, commercial adjacency)\n\n**Moderate Issues** \u2014 Concerns requiring attention but not disqualifying:\n- UNKNOWN on critical rules (8, 9, 11, 12, 16)\n- CDOM between 45\u201360 days (near limit)\n- Sqft variance 7\u20139.9% (near limit)\n- List price > 10% above comp-supported value\n- Weak comp set (fewer than 3 Moderate/Strong comps)\n\n**Minor / Informational** \u2014 Worth noting, unlikely to affect decision:\n- UNKNOWN on lower-stakes rules (13, 14, 15, 17)\n- Single outlier comp\n- Minor DOM history\n- Sqft variance < 7%\n\n---\n\n## Final Recommendation\n\nReturn **exactly one** of the following:\n\n| Decision | When to use |\n|---|---|\n| **Eligible / Low Risk** | All hard rules PASS, no Major issues, valuation confidence Medium or High |\n| **Eligible with Caution** | All hard rules PASS but 1\u20132 Moderate issues present, or confidence Low |\n| **High Risk \u2013 Review Required** | 1 FAIL or 3+ UNKNOWN on critical rules, or Major issues present |\n| **Not Eligible** | 2+ FAILs, or any FAIL on Rules 1, 2, 4, or 6 |\n\n---\n\n## Mandatory Output Format\n\nProduce all seven sections below in order. Do not omit any section. Use the table formats exactly as shown.\n\n**Section 7 (Map Verification Links) is always the last section.** It is required on every report. Generate it from the subject property address. Rules 9, 11\u201316 require manual satellite/Street View confirmation \u2014 mark them UNKNOWN in Section 2 unless you have direct evidence, and flag them in Section 7 for human review.\n\n### 1) Subject Property Snapshot\n\n| Field | Value |\n|---|---|\n| Address | |\n| Property Type | |\n| Beds / Baths | |\n| Living Area (Listing) | |\n| Living Area (Tax Record) | |\n| Lot Size | |\n| Year Built | |\n| Listing Status | |\n| Current List Price | |\n| Last Sale Date | |\n| Last Sale Price | |\n| Cumulative DOM | |\n| HOA | |\n\n### 2) Rule Screening Table\n\n| ID | Check Label | Result | Evidence | Notes |\n|---|---|---|---|---|\n| 1 | Is a SFR | | | |\n| 2 | NOT in 55+ community | | | |\n| 3 | Condo Warrantability | | | |\n| 4 | Lot size NOT > 5 acres | | | |\n| 5 | Listed for NOT > 60 CDOM | | | |\n| 6 | NOT sold < 1 year | | | |\n| 7 | Neighborhood DOM NOT > 90 | | | |\n| 8 | Main Street proximity | | | |\n| 9 | Highway / Freeway proximity | | | |\n| 10 | Airport noise | | | |\n| 11 | Railroad proximity | | | |\n| 12 | High Voltage Powerline | | | |\n| 13 | Power Station proximity | | | |\n| 14 | Commercial Facility adjacency | | | |\n| 15 | Cemetery proximity | | | |\n| 16 | NOT in poor condition | | | |\n| 17 | ClearCapital AVM availability | | | |\n| 18 | Square footage consistency | | | |\n| 19 | Comp alignment | | | |\n| 20 | Listing | | | |\n\n### 3) Comparable Sales Table\n\n| Comp Address | Distance | Sold Date | Sold Price | $/Sqft | Sqft | Beds/Baths | Relevance | Notes |\n|---|---|---|---|---|---|---|---|---|\n\n### 4) Valuation Summary\n\n| Field | Value |\n|---|---|\n| Weighted $/Sqft | |\n| Median $/Sqft | |\n| Low Estimate | |\n| Likely Market Value | |\n| High Estimate | |\n| Valuation Confidence | High / Medium / Low |\n| Confidence Rationale | |\n\n### 5) Risk Assessment\n\n**Major Issues**\n- (list each, or \"None identified\")\n\n**Moderate Issues**\n- (list each, or \"None identified\")\n\n**Minor / Informational**\n- (list each, or \"None identified\")\n\n### 6) Final Recommendation\n\n**Decision:** [Eligible / Low Risk | Eligible with Caution | High Risk \u2013 Review Required | Not Eligible]\n\n**Reason:** (2\u20134 sentences explaining the key drivers)\n\n**Requires Manual Confirmation:**\n- (list items that could not be confirmed automatically, or \"None\")\n\n### 7) Map Verification Links\n\n**THIS SECTION IS MANDATORY. Do not omit it. Always produce it as the final section of every report.**\n\n**Step 1 \u2014 Generate the pre-filled artifact URL (always output this first):**\n\nThe Map Verification Checklist artifact auto-loads any address passed as a `?address=` query parameter. Construct and output this link so the user can open the artifact with the address pre-filled and all map links ready.\n\nURL pattern: `https://claude.ai/public/artifacts/948b4a32-16a4-404a-a520-92f1f2baa516?address=ENCODED_ADDRESS`\n\nReplace spaces with `+` in the address. Example: `4821 Maple Grove Dr Austin TX 78749` \u2192 `4821+Maple+Grove+Dr+Austin+TX+78749`\n\nOutput it like this:\n> \ud83d\uddfa\ufe0f **[Open Map Verification Checklist \u2192](https://claude.ai/public/artifacts/948b4a32-16a4-404a-a520-92f1f2baa516?address=ENCODED_ADDRESS)**\n> Address pre-filled. All satellite, Street View, and search links ready. Mark PASS/FAIL/UNKNOWN for each rule, then copy the report back here.\n\n**Step 2 \u2014 Also output individual map links for reference:**\n\nGenerate real, clickable URLs. Replace spaces in address with `+`.\n\nURL patterns:\n- Satellite: `https://www.google.com/maps/search/?api=1&query=ENCODED_ADDRESS&t=k`\n- Street View: `https://www.google.com/maps/search/?api=1&query=ENCODED_ADDRESS&layer=streetview`\n- Maps search: `https://www.google.com/maps/search/?api=1&query=SEARCH_TERM+near+ENCODED_ADDRESS`\n\n**Property:** [subject address]\n\n| Quick Link | URL |\n|---|---|\n| \ud83d\udef0\ufe0f Satellite View | [construct satellite URL] |\n| \ud83d\udc41\ufe0f Street View | [construct street view URL] |\n| \ud83d\udd07 HowLoud (Rules 8 & 10) | https://howloud.com/ |\n\n| Rule | Check Label | Threshold | Web Search Verified? | Map Links |\n|---|---|---|---|---|\n| 9 | Highway / Freeway proximity | > 1,000 ft | [result from web search] | [Satellite](satellite URL) \u00b7 [Search highways](maps search URL for \"highways near ADDRESS\") |\n| 11 | Railroad proximity | > 500 ft | [result from web search] | [Satellite](satellite URL) \u00b7 [Search railroads](maps search URL for \"railroad tracks near ADDRESS\") |\n| 12 | High Voltage Powerline | > 500 ft, not visibly impacted | [result from web search] | [Satellite](satellite URL) \u00b7 [Search powerlines](maps search URL for \"power lines transmission towers near ADDRESS\") |\n| 13 | Power Station proximity | > 1,000 ft | [result from web search] | [Satellite](satellite URL) \u00b7 [Search substations](maps search URL for \"electrical substation near ADDRESS\") |\n| 14 | Commercial Facility adjacency | Not sharing property line | [result from web search] | [Satellite](satellite URL) \u00b7 [Search commercial](maps search URL for \"commercial properties near ADDRESS\") |\n| 15 | Cemetery proximity | > 2,500 ft (0.47 mi) | [result from web search] | [Satellite](satellite URL) \u00b7 [Search cemeteries](maps search URL for \"cemetery near ADDRESS\") |\n| 16 | NOT in poor condition | No visible exterior deterioration | [listing photos reviewed?] | [Street View](street view URL) \u00b7 [Satellite](satellite URL) |\n\n---\n\n## Hallucination Policy\n- If data is unavailable: mark UNKNOWN, state what is missing, do not fabricate.\n- If sources conflict: report both values, note the conflict, use the more conservative figure.\n- Never assign PASS based on assumption. Evidence must exist.\n\n---\n\n## Calibration Reference Example\n\nUse this completed example to calibrate format, evidence depth, judgment calls, and valuation math.\n\n**Input:** 4821 Maple Grove Dr, Austin, TX 78749\n\n**1) Subject Property Snapshot**\n\n| Field | Value |\n|---|---|\n| Address | 4821 Maple Grove Dr, Austin, TX 78749 |\n| Property Type | Single Family Residence |\n| Beds / Baths | 4 / 2.5 |\n| Living Area (Listing) | 2,210 sqft |\n| Living Area (Tax Record) | 2,185 sqft |\n| Lot Size | 0.18 acres (7,841 sqft) |\n| Year Built | 2003 |\n| Listing Status | Active |\n| Current List Price | $549,000 |\n| Last Sale Date | March 14, 2019 |\n| Last Sale Price | $389,500 |\n| Cumulative DOM | 22 days |\n| HOA | Yes \u2013 Maple Grove HOA, $75/month, no age restriction |\n\n**2) Rule Screening Table**\n\n| ID | Check Label | Result | Evidence | Notes |\n|---|---|---|---|---|\n| 1 | Is a SFR | PASS | Zillow: listed as \"Single Family\" \u2014 confirmed. Travis County Appraisal District tax record: property class \"A \u2013 Single Family Residential\" | Both sources agree. No indication of mixed-use or multi-family. |\n| 2 | NOT in 55+ community | PASS | Zillow listing remarks: no age restriction mentioned. HOA name \"Maple Grove HOA\" searched \u2014 HOA docs found via community website; rules reviewed, no 55+ or age-restricted language present | HOA monthly fee $75. No buyer age requirement found anywhere. |\n| 3 | Condo Warrantability | N/A | Not a condo per Rule 1 | \u2014 |\n| 4 | Lot size NOT > 5 acres | PASS | Travis County Appraisal District: lot size = 7,841 sqft (0.180 acres) | Well below 5-acre limit. No discrepancy between sources. |\n| 5 | Listed for NOT > 60 CDOM | PASS | Redfin listing history: listed Jan 17 2025, no prior listing in last 6 months. CDOM = 22 days as of review date | No relisting or price reduction history found. |\n| 6 | NOT sold < 1 year | PASS | Travis County tax records: last sale recorded March 14 2019, $389,500. Redfin sale history confirms same date and price | Last sale is ~6 years ago. No sales in last 12 months found on any source. |\n| 7 | Neighborhood DOM NOT > 90 | PASS | Redfin market stats for ZIP 78749 (pulled Feb 2025): median days on market = 31 days | Austin 78749 is an active market. No sign of elevated DOM. |\n| 8 | Main Street proximity | PASS | HowLoud.com searched for 4821 Maple Grove Dr, Austin TX 78749: SoundScore = 72 | Score of 72 exceeds minimum threshold of 65. Traffic noise rated \"Moderate\" but score qualifies. |\n| 9 | Highway / Freeway proximity | PASS | Google Maps distance tool: nearest highway is MoPac Expressway (Loop 1), measured ~1,820 ft to nearest on-ramp / travel lane from subject property frontage | Exceeds 1,000 ft minimum. No direct sight line to highway from front of property per Street View. |\n| 10 | Airport noise | PASS | HowLoud.com for this address: Airport Noise = Calm | Austin-Bergstrom International Airport (AUS) is approximately 9.2 miles southeast. No active flight path overhead per satellite. |\n| 11 | Railroad proximity | PASS | Google Maps satellite + OpenStreetMap: no railroad tracks found within 1.5 miles of subject | Nearest rail line (Capital MetroRail Red Line) is ~2.3 miles north. Not adjacent. |\n| 12 | High Voltage Powerline | PASS | Google Maps satellite imagery reviewed: no transmission towers or high-voltage lines visible on or adjacent to the lot. Street View (most recent imagery): no lines visible from street | Neighborhood has standard distribution lines on wooden poles only \u2014 not high-voltage transmission. |\n| 13 | Power Station proximity | PASS | Google Maps search \"substation near 4821 Maple Grove Dr Austin TX\": nearest Austin Energy substation found at ~1.4 miles (Circle C substation) | Exceeds 1,000 ft minimum. No visual impact. |\n| 14 | Commercial Facility adjacency | PASS | Satellite imagery: north, south, and east adjacent parcels are all single-family residential. West side borders a greenspace/drainage easement | Nearest commercial strip mall is ~0.3 miles on William Cannon Dr. Does not share property line. |\n| 15 | Cemetery proximity | PASS | Google Maps search \"cemetery near 4821 Maple Grove Dr Austin TX\": nearest result is Austin Memorial Park Cemetery at ~1.1 miles northwest | Exceeds 2,500 ft (0.47 miles) minimum by a wide margin. Not visible from property. |\n| 16 | NOT in poor condition | PASS | Zillow listing: 24 photos reviewed. Interior shows updated kitchen with granite counters, hardwood floors, clean walls. Exterior shows maintained lawn, intact roof, fresh paint. Google Street View (Oct 2024 imagery): exterior in good condition, no visible damage or deferred maintenance | No condition concerns identified across photos or Street View. |\n| 17 | ClearCapital AVM availability | PASS | Austin TX 78749 is a high-density residential market with active MLS comp data. ClearCapital coverage confirmed for Travis County | Sufficient comp density for AVM generation. |\n| 18 | Square footage consistency | PASS | Zillow listing: 2,210 sqft. Travis County Appraisal District tax record: 2,185 sqft. Variance: (2210\u22122185)/2185 \u00d7 100 = 1.14% | 1.14% is well within the 10% threshold. Both sources reviewed directly. |\n| 19 | Comp alignment | PASS | 4 sold comps within 0.9 miles support a value range of $502K\u2013$578K. List price of $549K falls within that range | See Section 3 for full comp detail. No divergence identified. |\n| 20 | Listing | PASS | Property listed Jan 17 2025 at $549,000 (within last 6 months). Comp-supported value $502K\u2013$578K. List price within range | List price does not indicate overpricing or distress. Incorporated into valuation. |\n\n**3) Comparable Sales Table**\n\n| Comp Address | Distance | Sold Date | Sold Price | $/Sqft | Sqft | Beds/Baths | Relevance | Notes |\n|---|---|---|---|---|---|---|---|---|\n| 4903 Maple Grove Dr | 0.1 mi | Jan 2025 | $537,000 | $246 | 2,182 | 4/2.5 | Strong | Near-identical floor plan |\n| 5104 Ridgewood Ct | 0.4 mi | Feb 2025 | $512,000 | $238 | 2,150 | 4/2 | Strong | Same subdivision, 1 fewer bath |\n| 4712 Covered Bridge Dr | 0.7 mi | Dec 2024 | $558,000 | $251 | 2,222 | 4/3 | Moderate | Extra full bath, slightly larger |\n| 5301 Lost Horizon Dr | 0.9 mi | Nov 2024 | $499,000 | $231 | 2,160 | 3/2.5 | Moderate | 1 fewer bed, lower price band |\n\n**4) Valuation Summary**\n\n| Field | Value |\n|---|---|\n| Weighted $/Sqft | $244 (Strong comps \u00d72, Moderate \u00d71) |\n| Median $/Sqft | $242 |\n| Low Estimate | $502,000 |\n| Likely Market Value | $540,000 |\n| High Estimate | $578,000 |\n| Valuation Confidence | **High** |\n| Confidence Rationale | 4 comps (2 Strong), sold within 90 days, sqft variance < 3% |\n\n**5) Risk Assessment**\n\n**Major Issues**\n- None identified\n\n**Moderate Issues**\n- None identified\n\n**Minor / Informational**\n- Comp at 5301 Lost Horizon Dr has 1 fewer bedroom; weighted lower but directionally supportive\n- HOA fee ($75/month) should be disclosed to borrower\n\n**6) Final Recommendation**\n\n**Decision:** Eligible / Low Risk\n\n**Reason:** All 20 screening rules pass with full evidence. Four comps within 0.9 miles support a value range of $502K\u2013$578K, consistent with the $549K list price. No proximity, condition, or market concerns identified.\n\n**Requires Manual Confirmation:**\n- ClearCapital AVM should be ordered to confirm valuation before final approval\n\n**7) Map Verification Links**\n\n\ud83d\uddfa\ufe0f **[Open Map Verification Checklist \u2192](https://claude.ai/public/artifacts/948b4a32-16a4-404a-a520-92f1f2baa516?address=4821+Maple+Grove+Dr+Austin+TX+78749)**\nAddress pre-filled. All satellite, Street View, and search links ready. Mark PASS/FAIL/UNKNOWN for each rule, then copy the report back here.\n\n**Property:** 4821 Maple Grove Dr, Austin, TX 78749\n\n| Quick Link | URL |\n|---|---|\n| \ud83d\udef0\ufe0f Satellite View | https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&t=k |\n| \ud83d\udc41\ufe0f Street View | https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&layer=streetview |\n| \ud83d\udd07 HowLoud (Rules 8 & 10) | https://howloud.com/ |\n\n| Rule | Check Label | Threshold | Web Search Verified? | Map Links |\n|---|---|---|---|---|\n| 9 | Highway / Freeway proximity | > 1,000 ft | Web search: MoPac Expressway ~1,820 ft per Google Maps result in Redfin neighborhood profile. Directionally confirms PASS but requires visual confirmation. | [Satellite](https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&t=k) \u00b7 [Find Highways](https://www.google.com/maps/search/?api=1&query=highways+near+4821+Maple+Grove+Dr+Austin+TX+78749) |\n| 11 | Railroad proximity | > 500 ft | Web search: Capital MetroRail Red Line ~2.3 miles north per OpenStreetMap search. No tracks found near subject. | [Satellite](https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&t=k) \u00b7 [Find Railroads](https://www.google.com/maps/search/?api=1&query=railroad+tracks+near+4821+Maple+Grove+Dr+Austin+TX+78749) |\n| 12 | High Voltage Powerline | > 500 ft, not visibly impacted | Web search: No transmission easements found in Travis County deed search for this address. No mention in listing remarks. | [Satellite](https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&t=k) \u00b7 [Find Powerlines](https://www.google.com/maps/search/?api=1&query=power+lines+transmission+towers+near+4821+Maple+Grove+Dr+Austin+TX+78749) |\n| 13 | Power Station proximity | > 1,000 ft | Web search: Austin Energy Circle C substation found ~1.4 miles away per Maps search result. Exceeds threshold. | [Satellite](https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&t=k) \u00b7 [Find Substations](https://www.google.com/maps/search/?api=1&query=electrical+substation+near+4821+Maple+Grove+Dr+Austin+TX+78749) |\n| 14 | Commercial Facility adjacency | Not sharing property line | Web search: Zillow listing description mentions residential neighborhood. Nearest commercial strip ~0.3 mi on William Cannon Dr per Maps search. No adjacent commercial found. | [Satellite](https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&t=k) \u00b7 [Find Commercial](https://www.google.com/maps/search/?api=1&query=commercial+properties+near+4821+Maple+Grove+Dr+Austin+TX+78749) |\n| 15 | Cemetery proximity | > 2,500 ft (0.47 mi) | Web search: Austin Memorial Park Cemetery found ~1.1 miles NW per Google Maps search result. Clearly exceeds 2,500 ft. | [Satellite](https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&t=k) \u00b7 [Find Cemeteries](https://www.google.com/maps/search/?api=1&query=cemetery+near+4821+Maple+Grove+Dr+Austin+TX+78749) |\n| 16 | NOT in poor condition | No visible exterior deterioration | Zillow: 24 listing photos reviewed \u2014 updated kitchen, hardwood floors, clean exterior, intact roof. Street View not directly accessible; link provided for user visual confirmation. | [Street View](https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&layer=streetview) \u00b7 [Satellite](https://www.google.com/maps/search/?api=1&query=4821+Maple+Grove+Dr+Austin+TX+78749&t=k) |\n\n**Instructions for user:** Click each map link to visually confirm. Use the Map Verification Checklist artifact for PASS/FAIL/UNKNOWN entry. Paste completed checklist back to finalize Rules 9 and 11\u201316.\n";

// ── Strip preamble: remove everything before the first section header ─────────
function stripPreamble(text) {
  // The report always starts with "**1) Subject Property Snapshot**" or "### 1)"
  // Strip any prose before that
  const markers = [
    /(\*\*1\))\s+Subject Property/,
    /(\*\*1\.)\s+Subject Property/,
    /(###\s+1\))/,
    /(###\s+1\.)/,
    /(^#\s+1\))/m,
    /(^#\s+1\.)/m,
  ];
  for (const re of markers) {
    const m = text.search(re);
    if (m > 0) return text.slice(m);
  }
  return text;
}

// ── Badge helper ──────────────────────────────────────────────────────────────
function badgeHtml(text) {
const t = text.trim().toUpperCase();
  if (t === "PASS")           return `<span class="badge pass">PASS</span>`;
  if (t === "FAIL")           return `<span class="badge fail">FAIL</span>`;
  if (t === "UNKNOWN")        return `<span class="badge unknown">UNKNOWN</span>`;
  if (t === "N/A" || t === "NOT APPLICABLE") return `<span class="badge na">N/A</span>`;
  return null;
}

// ── Inline markdown (bold, code, links) ──────────────────────────────────────
function inlineMd(raw) {
  if (!raw) return "";
  // Apply badge if entire cell is a status word
  const b = badgeHtml(raw.trim());
  if (b) return b;
  return raw
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="ic">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="lnk">$1 ↗</a>');
}

// ── Table parser ──────────────────────────────────────────────────────────────
function parseTable(block) {
  const lines = block.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return null;

  const splitRow = l => l.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  const isSep = l => /^\|[-| :]+\|$/.test(l.trim());

  const headerLine = lines[0];
  const sepIdx = lines.findIndex(isSep);
  if (sepIdx < 0) return null;

  const headers = splitRow(headerLine);
  const rows = lines.slice(sepIdx + 1).map(splitRow);

  // Detect if this is the Rule Screening table (has ID, Check Label, Result columns)
  const isRuleTable = headers[0] === "ID" || headers[0] === "Rule";
  // Detect if this is the Comp table (wide, many columns)
  const isCompTable = headers.includes("Comp Address") || headers.includes("Sold Price") || headers.includes("$/Sqft") || (headers.length >= 7 && headers.some(h => h.includes("Distance")));
  // Detect Valuation/Snapshot (2-column key-value)
  const isKV = headers.length === 2 && (headers[0] === "Field" || headers[0] === "Quick Link");

  return { headers, rows, isRuleTable, isCompTable, isKV };
}

function tableToHtml(block) {
  const parsed = parseTable(block);
  if (!parsed) return `<pre class="raw-table">${block}</pre>`;
  const { headers, rows, isRuleTable, isCompTable, isKV } = parsed;

  if (isKV) {
    // Render as definition list style
    return `<div class="kv-table">${rows.map(r => `
      <div class="kv-row">
        <div class="kv-key">${inlineMd(r[0] || "")}</div>
        <div class="kv-val">${inlineMd(r[1] || "")}</div>
      </div>`).join("")}</div>`;
  }

  const thCells = headers.map((h, i) => {
    let w = "";
    if (isRuleTable) {
      if (i === 0) w = 'style="width:36px"';
      else if (i === 1) w = 'style="width:160px"';
      else if (i === 2) w = 'style="width:80px"';
    }
    if (isCompTable && headers.length >= 7) {
      if (i === 0) w = 'style="width:160px"';
      else if (i === headers.length - 2) w = 'style="width:80px"';
      else if (i === headers.length - 1) w = 'style="width:140px"';
    }
    return `<th ${w}>${inlineMd(h)}</th>`;
  }).join("");

  const tdRows = rows.map(r => {
    const cells = headers.map((_, i) => {
      const raw = r[i] || "";
      return `<td>${inlineMd(raw)}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  const cls = isRuleTable ? "md-table rule-table" : isCompTable ? "md-table comp-table" : "md-table";
  return `<div class="tbl-wrap"><table class="${cls}">
    <thead><tr>${thCells}</tr></thead>
    <tbody>${tdRows}</tbody>
  </table></div>`;
}

// ── Main markdown renderer ────────────────────────────────────────────────────
function renderMarkdown(raw) {
  if (!raw) return "";
  const text = stripPreamble(raw);

  // Split into blocks by double newline, preserving tables
  const lines = text.split("\n");
  const blocks = [];
  let cur = [];

  for (const line of lines) {
    if (line.trim() === "" && cur.length) {
      blocks.push(cur.join("\n"));
      cur = [];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) blocks.push(cur.join("\n"));

  return blocks.map(block => {
    const t = block.trim();
    if (!t) return "";

    // Table block
    if (t.startsWith("|") && t.includes("\n")) return tableToHtml(t);

    // Headings
    if (t.startsWith("### ")) return `<h3 class="h3">${inlineMd(t.slice(4))}</h3>`;
    if (t.startsWith("## "))  return `<h2 class="h2">${inlineMd(t.slice(3))}</h2>`;
    if (t.startsWith("# "))   return `<h1 class="h1">${inlineMd(t.slice(2))}</h1>`;

    // HR
    if (t === "---") return `<hr class="hr"/>`;

    // Blockquote (map link lines)
    if (t.startsWith("> ")) return `<blockquote class="bq">${inlineMd(t.slice(2))}</blockquote>`;

    // Bullet list
    const bulletLines = t.split("\n").filter(l => /^[-*] /.test(l.trim()));
    if (bulletLines.length === t.split("\n").length) {
      const items = t.split("\n").map(l =>
        `<li>${inlineMd(l.replace(/^[-*] /, "").trim())}</li>`).join("");
      return `<ul class="ul">${items}</ul>`;
    }

    // Mixed block: process line by line
    const rendered = t.split("\n").map(line => {
      const lt = line.trim();
      if (!lt) return "";
      if (/^[-*] /.test(lt)) return `<li>${inlineMd(lt.replace(/^[-*] /, ""))}</li>`;
      // Sub-section bold labels like **Major Issues**, **Decision:**, **Reason:**, **Requires Manual Confirmation:**
      // Handles both **Label** : value (colon outside) and **Label:** value (colon inside)
      const boldLabel = lt.match(/^\*\*([^*]+?):?\*\*\s*:?\s*(.*)$/);
      if (boldLabel) {
        const labelText = boldLabel[1].replace(/:$/, "").trim();
        const suffix = boldLabel[2] || "";
        // Risk category headers get a styled chip
        if (["Major Issues","Moderate Issues","Minor / Informational"].includes(labelText)) {
          const color = labelText === "Major Issues" ? "risk-major"
                      : labelText === "Moderate Issues" ? "risk-moderate" : "risk-minor";
          return `<div class="risk-label ${color}">${labelText}</div>`;
        }
        // Decision/Reason/Requires lines — render as bold key + inline value
        return `<p class="p"><strong>${labelText}</strong>${suffix ? inlineMd(suffix) : ""}</p>`;
      }
      return `<p class="p">${inlineMd(lt)}</p>`;
    }).join("");
    return rendered;
  }).join("\n");
}

// ── Correct server-tool agentic loop ─────────────────────────────────────────
async function runAgenticLoop(address, onProgress, signal) {
  const messages = [{
    role: "user",
    content: `Run a full property underwriting, CMA, and risk review for: ${address}\n\nStart your response directly with "**1) Subject Property Snapshot**" — no preamble, no intro sentence. Produce the complete 7-section report exactly as specified.`,
  }];

  let round = 0;
  while (round < 25) {
    round++;
    onProgress(`Round ${round} — searching & reasoning…`);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 25 }],
        messages,
      }),
    });

    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const { stop_reason, content } = data;

    const searches = content.filter(b => b.type === "web_search_tool_result").length;
    if (searches) onProgress(`  └─ ${searches} search result(s) received`);

    if (stop_reason === "end_turn") {
      const text = content.filter(b => b.type === "text").map(b => b.text).join("\n\n");
      if (!text) throw new Error("No text in final response.");
      return text;
    }
    if (stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content });
      continue;
    }
    if (stop_reason === "max_tokens") {
      const text = content.filter(b => b.type === "text").map(b => b.text).join("\n\n");
      if (text) { onProgress("⚠ max_tokens hit — report may be truncated"); return text; }
      throw new Error("Hit max_tokens with no output.");
    }
    const text = content.filter(b => b.type === "text").map(b => b.text).join("\n\n");
    if (text) return text;
    throw new Error(`Unexpected stop_reason: "${stop_reason}"`);
  }
  throw new Error("Exceeded 25 rounds.");
}

// ── Stage labels ──────────────────────────────────────────────────────────────
const STAGES = [
  "Identifying property…", "Searching Zillow & Redfin…",
  "Checking public records…", "Running proximity checks…",
  "Applying 20 screening rules…", "Finding comparable sales…",
  "Computing valuation…", "Assessing risk…",
  "Building map links…", "Finalising report…",
];

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [address,  setAddress]  = useState("11469 37th Avenue SW, Seattle, WA 98146");
  const [status,   setStatus]   = useState("idle");
  const [report,   setReport]   = useState("");
  const [log,      setLog]      = useState([]);
  const [stageIdx, setStageIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const reportRef  = useRef(null);
  const stageTimer = useRef(null);
  const abortRef   = useRef(null);

  useEffect(() => {
    if (status === "running") {
      stageTimer.current = setInterval(() =>
        setStageIdx(i => (i + 1) % STAGES.length), 9000);
    } else { clearInterval(stageTimer.current); setStageIdx(0); }
    return () => clearInterval(stageTimer.current);
  }, [status]);

  useEffect(() => {
    if (reportRef.current)
      reportRef.current.scrollTop = reportRef.current.scrollHeight;
  }, [report]);

  async function runUnderwriting() {
    if (!address.trim()) return;
    setStatus("running"); setReport(""); setLog([]); setErrorMsg("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await runAgenticLoop(address.trim(),
        msg => setLog(p => [...p.slice(-40), msg]), ctrl.signal);
      setReport(r); setStatus("done");
    } catch (e) {
      if (e.name === "AbortError") setStatus("idle");
      else { setErrorMsg(e.message || "Unknown error"); setStatus("error"); }
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    setStatus("idle"); setReport(""); setLog([]); setErrorMsg(""); setAddress("");
  }

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      <header style={S.hdr}>
        <div style={S.hdrInner}>
          <span style={S.icon}>🏠</span>
          <div>
            <div style={S.title}>Property Underwriting Engine</div>
            <div style={S.sub}>20-Rule CMA · Risk Screening · Valuation</div>
          </div>
        </div>
      </header>

      {status === "idle" && (
        <main style={S.main}>
          <div style={S.card}>
            <div style={S.label}>Subject Property Address</div>
            <div style={S.row}>
              <input style={S.input} value={address}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runUnderwriting()}
                placeholder="e.g. 11469 37th Ave SW, Seattle, WA 98146"
                autoFocus />
              <button style={{...S.btn, opacity: address.trim() ? 1 : 0.4}}
                onClick={runUnderwriting} disabled={!address.trim()}>
                Run Report →
              </button>
            </div>
            <div style={S.hint}>Searches Zillow, Redfin, county records · 20 rules · Valuation · ~2–4 min</div>
          </div>
          <div style={S.pills}>
            {["SFR","CDOM","Noise","Highway","Railroad","Powerline","Cemetery","Comps","Valuation","Risk"].map(p =>
              <span key={p} style={S.pill}>{p}</span>)}
          </div>
        </main>
      )}

      {status === "running" && (
        <main style={S.main}>
          <div style={S.runCard}>
            <div style={S.spinner}/>
            <div style={S.stage}>{STAGES[stageIdx]}</div>
            <div style={S.addr}>{address}</div>
            <div style={S.note}>Running full 20-rule underwriting + CMA with live web search.<br/>Multiple search rounds in progress — takes 2–4 minutes.</div>
            <button style={S.cancel} onClick={() => abortRef.current?.abort()}>Cancel</button>
          </div>
          {log.length > 0 && (
            <div style={S.logBox}>
              <div style={S.logLabel}>Activity</div>
              {log.map((l,i) => <div key={i} style={S.logLine}>› {l}</div>)}
            </div>
          )}
        </main>
      )}

      {status === "done" && (
        <main style={S.mainW}>
          <div style={S.doneBar}>
            <div><span style={S.chk}>✓</span><span style={S.doneTitle}>Report Complete</span><span style={S.doneAddr}>{address}</span></div>
            <button style={S.newBtn} onClick={handleReset}>New Address</button>
          </div>
          <div style={S.report} ref={reportRef}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }} />
        </main>
      )}

      {status === "error" && (
        <main style={S.main}>
          <div style={S.errCard}>
            <div style={S.errIcon}>⚠</div>
            <div style={S.errTitle}>Report Failed</div>
            <div style={S.errMsg}>{errorMsg}</div>
            <button style={S.btn} onClick={handleReset}>Try Again</button>
          </div>
        </main>
      )}
    </div>
  );
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:"#f0f2f5", surface:"#fff", border:"#e2e8f0",
  text:"#0f172a", muted:"#64748b",
  blue:"#1e40af", blueLight:"#dbeafe",
  green:"#15803d", greenBg:"#dcfce7",
  red:"#b91c1c",  redBg:"#fee2e2",
  amber:"#92400e", amberBg:"#fef3c7",
  slate:"#475569", slateBg:"#f1f5f9",
};

const S = {
  root:    { minHeight:"100vh", background:T.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", color:T.text },
  hdr:     { background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 24px" },
  hdrInner:{ maxWidth:1100, margin:"0 auto", padding:"14px 0", display:"flex", alignItems:"center", gap:12 },
  icon:    { fontSize:26 },
  title:   { fontSize:17, fontWeight:700, letterSpacing:"-0.3px" },
  sub:     { fontSize:11, color:T.muted, marginTop:1 },

  main:    { maxWidth:740, margin:"52px auto", padding:"0 20px" },
  mainW:   { maxWidth:1100, margin:"36px auto", padding:"0 20px" },

  card:    { background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
             padding:"28px 32px", boxShadow:"0 1px 8px rgba(0,0,0,0.05)" },
  label:   { fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
             color:T.muted, marginBottom:10 },
  row:     { display:"flex", gap:10 },
  input:   { flex:1, padding:"11px 15px", fontSize:15, border:`1.5px solid ${T.border}`,
             borderRadius:8, outline:"none", color:T.text, background:"#fafbfc",
             fontFamily:"inherit" },
  btn:     { padding:"11px 20px", background:T.blue, color:"#fff", border:"none",
             borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" },
  hint:    { fontSize:11, color:T.muted, marginTop:12 },
  pills:   { display:"flex", flexWrap:"wrap" as const, gap:6, marginTop:20 },
  pill:    { padding:"3px 10px", background:T.blueLight, color:T.blue,
             borderRadius:99, fontSize:11, fontWeight:500 },

  runCard: { background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
             padding:"44px 32px", textAlign:"center" as const, boxShadow:"0 1px 8px rgba(0,0,0,0.05)" },
  spinner: { width:38, height:38, borderRadius:"50%",
             border:`3px solid ${T.blueLight}`, borderTopColor:T.blue,
             animation:"spin 0.8s linear infinite", margin:"0 auto 20px" },
  stage:   { fontSize:15, fontWeight:600, marginBottom:6 },
  addr:    { fontSize:12, color:T.muted, marginBottom:18, fontStyle:"italic" },
  note:    { fontSize:12, color:T.muted, lineHeight:1.8, marginBottom:20 },
  cancel:  { padding:"7px 18px", background:"transparent", border:`1px solid ${T.border}`,
             borderRadius:8, fontSize:12, color:T.muted, cursor:"pointer" },

  logBox:  { marginTop:16, background:T.surface, border:`1px solid ${T.border}`,
             borderRadius:10, padding:"14px 18px", maxHeight:200, overflowY:"auto" as const },
  logLabel:{ fontSize:9, fontWeight:700, color:T.blue, letterSpacing:"0.1em",
             textTransform:"uppercase", marginBottom:6 },
  logLine: { fontSize:11, color:T.muted, marginBottom:2, fontFamily:"monospace" },

  doneBar: { display:"flex", alignItems:"center", justifyContent:"space-between",
             marginBottom:20, flexWrap:"wrap" as const, gap:10 },
  chk:     { fontSize:16, color:T.green, marginRight:8 },
  doneTitle:{ fontSize:15, fontWeight:700, marginRight:10 },
  doneAddr:{ fontSize:12, color:T.muted, fontStyle:"italic" },
  newBtn:  { padding:"7px 18px", background:T.blue, color:"#fff", border:"none",
             borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" },

  report:  { background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
             padding:"32px 36px", boxShadow:"0 1px 8px rgba(0,0,0,0.05)" },

  errCard: { background:T.surface, border:"1px solid #fca5a5", borderRadius:12,
             padding:"44px 32px", textAlign:"center" as const },
  errIcon: { fontSize:28, color:T.red, marginBottom:10 },
  errTitle:{ fontSize:17, fontWeight:700, color:T.red, marginBottom:10 },
  errMsg:  { fontSize:12, color:T.muted, marginBottom:20, wordBreak:"break-word" as const },
};

const CSS = `
@keyframes spin { to { transform:rotate(360deg); } }

/* Typography */
.h1 { font-size:20px; font-weight:700; margin:32px 0 4px; color:#0f172a;
      border-bottom:2px solid #e2e8f0; padding-bottom:8px; }
.h2 { font-size:15px; font-weight:700; margin:28px 0 8px; color:#1e40af;
      text-transform:uppercase; letter-spacing:0.06em; }
.h3 { font-size:13px; font-weight:700; margin:20px 0 6px; color:#0f172a; }
.p  { margin:4px 0; font-size:13.5px; color:#334155; line-height:1.65; }
.ul { margin:6px 0 6px 18px; padding:0; }
.ul li { font-size:13.5px; color:#334155; margin:3px 0; line-height:1.6; }
.section-title { font-size:13px; font-weight:700; color:#0f172a; margin:14px 0 4px; }
.hr { border:none; border-top:1px solid #e2e8f0; margin:24px 0; }
.bq { border-left:3px solid #1e40af; margin:10px 0; padding:10px 16px;
      background:#eff6ff; border-radius:0 6px 6px 0;
      font-style:italic; color:#1e40af; font-size:13px; }
.ic { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:3px;
      padding:1px 4px; font-family:monospace; font-size:11px; color:#1e40af; }
.lnk { color:#1e40af; text-decoration:underline; font-size:13px; }
.lnk:hover { color:#1d4ed8; }

/* PASS/FAIL badges */
.badge { display:inline-block; padding:2px 8px; border-radius:4px;
         font-size:11px; font-weight:700; letter-spacing:0.04em; }
.badge.pass    { background:#dcfce7; color:#15803d; }
.badge.fail    { background:#fee2e2; color:#b91c1c; }
.badge.unknown { background:#fef3c7; color:#92400e; }
.badge.na      { background:#f1f5f9; color:#64748b; }

/* Key-value table (Snapshot, Valuation) */
.kv-table { border:1px solid #e2e8f0; border-radius:8px;
            overflow:hidden; margin:10px 0 20px; }
.kv-row   { display:flex; border-bottom:1px solid #f1f5f9; }
.kv-row:last-child { border-bottom:none; }
.kv-row:nth-child(even) { background:#fafbfc; }
.kv-key  { width:200px; min-width:160px; padding:9px 14px;
           font-size:12px; font-weight:600; color:#475569;
           border-right:1px solid #e2e8f0; flex-shrink:0; }
.kv-val  { padding:9px 14px; font-size:13px; color:#0f172a; flex:1;
           word-break:break-word; }

/* Generic table */
.tbl-wrap  { overflow-x:auto; margin:10px 0 20px; border-radius:8px;
             border:1px solid #e2e8f0; }
.md-table  { border-collapse:collapse; width:100%; font-size:12.5px; }
.md-table th { background:#1e40af; color:#fff; padding:9px 12px; text-align:left;
               font-weight:600; font-size:11px; letter-spacing:0.05em;
               text-transform:uppercase; white-space:nowrap; }
.md-table td { padding:8px 12px; border-bottom:1px solid #f1f5f9;
               color:#334155; vertical-align:top; line-height:1.55; }
.md-table tbody tr:last-child td { border-bottom:none; }
.md-table tbody tr:nth-child(even) td { background:#fafbfc; }
.md-table tbody tr:hover td { background:#eff6ff; }

/* Rule screening table — tighter, with col widths */
.rule-table td:nth-child(1) { width:36px; text-align:center; font-weight:700;
                               color:#94a3b8; font-size:11px; }
.rule-table td:nth-child(2) { width:155px; font-weight:600; color:#0f172a; }
.rule-table td:nth-child(3) { width:90px; }
.rule-table td:nth-child(4) { font-size:12px; color:#475569; }
.rule-table td:nth-child(5) { font-size:12px; color:#64748b; font-style:italic; }

/* Comp table */
.comp-table td:nth-child(4),
.comp-table td:nth-child(5) { font-weight:600; }

/* Risk category labels */
.risk-label { display:inline-block; margin:14px 0 6px;
              padding:3px 12px; border-radius:4px;
              font-size:11px; font-weight:700; letter-spacing:0.06em;
              text-transform:uppercase; }
.risk-major    { background:#fee2e2; color:#b91c1c; }
.risk-moderate { background:#fef3c7; color:#92400e; }
.risk-minor    { background:#f1f5f9; color:#475569; }
`;
