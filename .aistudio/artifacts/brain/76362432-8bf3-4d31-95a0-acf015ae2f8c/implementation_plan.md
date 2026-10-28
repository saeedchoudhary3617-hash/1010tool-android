# Enforce 100% Production AdMob Ads (Remove Test Ad Fallbacks)

This plan removes all Google test ad unit IDs and fallback mechanisms from the codebase, ensuring that both debug and release APK builds exclusively request and display your genuine production AdMob ads.

### User Review & Critical Decisions

> [!IMPORTANT]
> Review the confirmed choices below and click **Proceed** to apply the changes.

- **Confirmed Decision 1**: Completely remove Google test ad unit IDs (`ca-app-pub-3940256099942544/...`) from `MainActivity.kt`.
- **Confirmed Decision 2**: Ensure that both Banner and Interstitial ads strictly and exclusively use your real AdMob IDs:
  - **AdMob App ID**: `ca-app-pub-5272800200175412~8920229976`
  - **Banner Ad Unit**: `ca-app-pub-5272800200175412/4688633088`
  - **Interstitial Ad Unit**: `ca-app-pub-5272800200175412/4141838179`
- **Behavior on No Fill**: If AdMob has not yet filled inventory or is reviewing the account, the app will log the event and retry when appropriate, but will never fall back to Google sample/test ads.

### 1. Overview & Core Concept

- **What It Does**:
  1. Strips out `FALLBACK_TEST_BANNER_AD_UNIT_ID` and `FALLBACK_TEST_INTERSTITIAL_AD_UNIT_ID` from `MainActivity.kt`.
  2. Simplifies `attachBannerAd()` and `loadInterstitialAd()` so they never substitute test ad units under any condition.
  3. Guarantees that any APK built (both locally and via GitHub Actions) only ever contacts your production AdMob unit endpoints.
- **Target Audience / Persona**: App publisher distributing the signed release APK to users or preparing for Google Play Store launch.
- **Key Value**: Guarantees genuine ad impressions and prevents confusing "Test Ad" badges from appearing on real devices.

### 2. User Experience & Visual Design

- **Ad Presentation**:
  - The Banner Ad container remains at the bottom of the screen (`Modifier.heightIn(min = 50.dp)`), above navigation safe insets, centered in its container.
  - Interstitial ads continue to trigger smoothly on successful tool operations without blocking JavaScript UI animations (via Async Yielding).
  - Only real AdMob advertisements will be shown.

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Complete Removal of Fallback Units**
  - *Chosen Approach*: Remove test fallback constants and conditional checks entirely rather than toggling via build flags.
  - *Why*: Eliminates any risk of test ads leaking into signed release APKs or debug APKs tested on physical devices.
  - *Note on AdMob Serving*: Note that brand-new ad units or unlinked apps may take some time for AdMob to serve 100% live inventory (AdMob often responds with `ERROR_CODE_NO_FILL` until account and app verification complete in the AdMob console).

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Ad Flow Diagram**:
```
┌────────────────────────────────────────────────────────┐
│                   MainActivity                         │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │  BANNER_AD_UNIT_ID    │  │INTERSTITIAL_AD_UNIT_ID│  │
│  │  .../4688633088       │  │  .../4141838179       │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  │
│              │                          │              │
│              ▼                          ▼              │
│      AdRequest.Builder          AdRequest.Builder      │
│              │                          │              │
│              ▼                          ▼              │
│   Google AdMob Production    Google AdMob Production   │
│       Ad Server                  Ad Server             │
└────────────────────────────────────────────────────────┘
```
- **Changes in `MainActivity.kt`**:
  - Delete `FALLBACK_TEST_BANNER_AD_UNIT_ID` and `FALLBACK_TEST_INTERSTITIAL_AD_UNIT_ID`.
  - In `loadInterstitialAd()`: Remove `useTestFallback` parameter and the `if (BuildConfig.DEBUG) loadInterstitialAd(true)` fallback call in `onAdFailedToLoad`.
  - In `attachBannerAd()`: Remove `useTestFallback` parameter and the `container.post { attachBannerAd(container, useTestFallback = true) }` fallback call in `onAdFailedToLoad`.
