# Supporter insights: disclosure and release contract

## 9 September 2026 — expanded edition supersedes the initial scope below

The owner approved all proposed Deeper Insights except personal experiments.
Both client repositories now contain the new implementation and
`docs/DEEPER-INSIGHTS-2026-09-09.md`, the current feature/retention/test contract.
The older seven-record average/lightest-day scope below is historical, not the
current feature specification.

The new edition uses protected iPhone reports and explicitly enabled, private
Android summaries. Usage summaries can accumulate up to 365 days after fresh
v2 consent. Separately opted-in notification counts retain a rolling 28-day
local window, with pruning when code next runs,
no Android backup, and sign-out cleanup. A separate 28-day/300-entry pact
journal is private to each account/phone and prunes on access. Detailed
collection is not added to Firebase or RevenueCat. Server seven-record
aggregate retention is unchanged.

Policy, terms, support, product, ethos, privacy-architecture and machine-readable
copy are included in the consolidated 9 September tester-release publication.
The expanded retention is explicitly labeled as the updated tester edition,
not a capability already shipped to every public-store user. Store processing,
physical-device checks and purchase/receipt validation remain release gates.
Neither source implementation nor passing local tests is proof of a completed
native-app rollout. Record publication and build outcomes in the client release notes.

## Historical initial-edition notes (8 September)

Updated 8 September 2026. This is implementation guidance, not a second privacy
policy. The canonical public documents remain `privacy.html` and `terms.html`.
The first supporter implementation uses existing seven-record aggregate history;
it does not add longer retention or new Screen Time collection.

## Product boundary

The initial supporter benefit is a private view of the member's average across
recorded days and their lightest recorded day. It uses
the existing recent aggregate ledger. Longer comparisons and reports remain
later candidates and are not promised features.

Use “PhonePact Supporter,” “support,” or “supporter purchase” for a payment that
unlocks insights. Do not call that payment a charitable donation. State the
actual included features, price, duration, and renewal terms at purchase. Do not
promise automatic upgrades to every future feature. “Help keep PhonePact free”
is the intended funding model. Monthly choices renew; Single choices are
non-consumable one-time purchases that grant ongoing access to current insights.

## Data required and boundaries

| Proposed use | Minimum proposed inputs | Limits |
| --- | --- | --- |
| Recent average | Dated aggregate minutes and valid-day coverage | Ignore missing days rather than treating them as zero. |
| Lightest recent day | Dated aggregate minutes and valid-day coverage | Describe the recorded window without causal or medical claims. |

Longer comparisons will require historical pact/measurement context before they
can ship. A future scope-change marker must not encode or reveal app identities.
App/site/category/package identifiers,
selection tokens, raw activity events, and exact per-app durations remain local.
Keep histories separate across accounts and physical phones. Missing or
incomplete data must not become a zero-usage day.

Private aggregate records and generated reports belong behind owner-only client
access rules, with authorized service-provider processing disclosed. “Private”
does not mean end-to-end encrypted or inaccessible to service operators. Do not
copy these inputs or outputs into circle documents, shared check-ins, push
payloads, crash logs, RevenueCat attributes, or other members' reports.

Initial scope excludes chat/message analysis, optional reflection tags,
time-of-day activity history, an external AI service, automatic report sharing,
public comparisons, and circle discovery. Those require separate design and
disclosure decisions; this copy does not authorize them. A member may of course
choose what to write in their own message.

## Current retention versus the proposed feature

Both clients currently use `DAY_TOTALS_KEPT = 7` and a rules entry limit of 14.
The pruning implementation keeps the newest seven recorded dates; it is not a
seven-calendar-day TTL. Account deletion removes the private device records.
The account-local cache and native histories must be reviewed alongside server
retention when implementing insights. Source pact events are kept until account
deletion, separately from expiring shared room rows; these coarse events cannot
reconstruct complete daily totals or establish that no check-in means no usage.

Before longer retention starts, choose and implement an explicit time limit,
storage location, pruning for inactive accounts, and deletion behavior for raw
aggregates, derived reports, and any stored baseline. A 30-day display does not
by itself define retention. Do not replace today's seven-record statement with
a made-up 30/90-day retention promise. Disclose the implemented period and
controls in the policy and app, provide material-change notice, and obtain any
required consent before new collection or longer retention begins.

Revoking measurement permission stops new measurement; it does not erase old
records. Cancellation, entitlement expiry, uninstall, and account deletion are
different events. Decide and disclose what happens to longer history after
expiry and test the deletion paths before shipping. Store transaction records
may remain under provider/legal obligations; account deletion must not falsely
promise to cancel billing or erase all transaction records.

## RevenueCat and store disclosure

The supporter clients use the native RevenueCat SDK, nine store products, the
`supporter` entitlement, purchase and restore UI, and the Firebase uid as the
RevenueCat app user id. The old `circles` entitlement is not used, and purchase
state never gates the free circle experience.

Use an account-linked purchase identifier; treat purchase data as linked rather
than anonymous when it maps to the PhonePact account. Disclose product and
transaction records, purchase dates, entitlement/subscription status, and the
actual SDK's app/device information. Do not send usage history, pact data,
reports, chat text, contact details, or selection identities as custom purchase
attributes. Review automatically collected data in the exact SDK/configuration
that ships. Configure only required purchase processing and reporting.

- Apple: reconcile the fresh archive Privacy Report, host/extension manifests,
  SDK manifests, and App Store Connect answers. RevenueCat requires Purchase
  History disclosure. Reassess Identifiers and all other actual SDK collection.
  Aggregate usage is already linked Other Usage Data; reassess its purposes
  against the implemented insights instead of assuming the old nine-row free
  manifest or App Functionality-only answers cover a paid build. Personalization
  is not automatically cross-app advertising tracking.
- Google Play: reconcile Data safety against the actual app and SDK. RevenueCat
  requires Purchase history disclosure; assess User IDs, Device or other IDs,
  purposes, and service-provider treatment from actual configuration.
- Exercise purchase, restore, cancellation/expiry, refunds, account switching,
  account deletion, and the provider deletion/support workflow. Explain any
  retained purchase records. Keep the current free-build store answers unchanged
  until the submitted binary's behavior changes.

## Release checklist

- [x] Update canonical privacy and terms copy for the implemented first insights.
- [x] Align website support, ethos, product explainer, privacy article, home copy,
  machine-readable product summary, and both clients' information pages.
- [x] Implement current insights from the existing seven-record ledger, with
  private access and missing days excluded from the average.
- [x] Choose supporter benefits, monthly and one-time access, and price tiers.
- [x] Integrate RevenueCat purchase and restore code for a new native build.
- [x] Replace planned language for the implemented feature;
  update onboarding, pricing, support/restore instructions, and this policy together.
- [x] Update the iOS host privacy manifest and Android billing permission.
- [ ] Create the nine products and `supporter` entitlement in both stores and RevenueCat.
- [ ] Reconcile store-console disclosures against final native archives.
- [ ] Publish the policy and provide any required notice before changed processing.

## Sources checked

- [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple review guidelines: privacy and purchases](https://developer.apple.com/app-store/review/guidelines/)
- [RevenueCat Apple privacy disclosures](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy)
- [RevenueCat Google Play Data safety](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety)
- [RevenueCat privacy policy](https://www.revenuecat.com/privacy)

Recheck these against the release version and configuration; this checklist is
not a completed store declaration.
