# Supporter insights: disclosure and release contract

Prepared 2 September 2026. This is implementation guidance, not a second privacy
policy. The canonical public documents remain `privacy.html` and `terms.html`.
This change prepares copy only: no new collection, retention, billing SDK,
entitlement, store declaration, or live deployment is enabled by it.

## Product boundary

The proposed supporter benefit is private aggregate usage trends, comparisons
with the member's own earlier weeks, pact consistency, weekday/weekend patterns,
and weekly reports with one optional suggested experiment. Start with a weekly
report and a 30-day view; 90-day and longer views are later candidates, not
promised features. Prices and one-time versus recurring access remain undecided.

Use “PhonePact Supporter,” “support,” or “supporter purchase” for a payment that
unlocks insights. Do not call that payment a charitable donation. State the
actual included features, price, duration, and renewal terms at purchase. Do not
promise lifetime access, automatic upgrades to every future feature, or a fixed
launch date. “Help keep the core service free” is the intended funding model;
the current launch disclosure remains true until a paid release ships.

## Data required and boundaries

| Proposed use | Minimum proposed inputs | Limits |
| --- | --- | --- |
| Trends and weekly comparisons | Dated aggregate minutes, phone identifier, valid-day coverage | Compare the same phone and consistent measurement scope; identify incomplete periods. |
| Pact consistency | Aggregate minutes and the pact point effective for that day | Do not evaluate old days against today's pact. A raise is not reduced usage. |
| Weekday/weekend patterns | Valid daily totals and local day context | Daily totals do not establish time-of-day habits. |
| Weekly experiment | Recorded aggregate patterns and a selected suggestion | Use simple rules initially; no medical claims or causal claims about PhonePact. |

Historical pact/measurement context is a requirement for the proposed feature,
not a claim that the current app already records it. A scope-change marker must
not encode or reveal app identities. App/site/category/package identifiers,
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

## RevenueCat and store disclosure preparation

The current free clients have no active RevenueCat purchase processing. A paid
release requires the native SDK, store products, an `insights` entitlement,
purchase and restore UI, and account-safe identity handling. Avoid recycling
the old `circles` entitlement to gate the free circle experience.

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

- [x] Prepare canonical privacy and terms copy with current/planned distinction.
- [x] Align website support, ethos, product explainer, privacy article, home copy,
  machine-readable product summary, and both clients' information pages.
- [ ] Implement and verify insights data, historical context, access boundaries,
  retention, missing-data handling, and deletion.
- [ ] Choose actual supporter product, benefits, access duration, and price.
- [ ] Integrate and verify RevenueCat and store purchases in a new native build.
- [ ] Replace planned language only when the actual implementation is ready;
  update onboarding, pricing, support/restore instructions, and this policy together.
- [ ] Reconcile native manifests and store-console disclosures for that build.
- [ ] Publish the policy and provide any required notice before changed processing.

## Sources checked

- [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple review guidelines: privacy and purchases](https://developer.apple.com/app-store/review/guidelines/)
- [RevenueCat Apple privacy disclosures](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy)
- [RevenueCat Google Play Data safety](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety)
- [RevenueCat privacy policy](https://www.revenuecat.com/privacy)

Recheck these against the release version and configuration; this checklist is
not a completed store declaration.
