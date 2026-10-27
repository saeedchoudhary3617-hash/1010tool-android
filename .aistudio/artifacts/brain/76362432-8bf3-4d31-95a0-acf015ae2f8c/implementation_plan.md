# Automated APK & AAB Release Pipeline with Production AdMob

This plan establishes an automated GitHub Actions build-and-release pipeline that compiles signed installable APK and Google Play AAB packages with your production AdMob IDs on every push or tag, alongside an in-app Build & Release Center inside the Settings view so you can inspect package metadata and copy release commands at any time.

### User Review & Critical Decisions

> [!IMPORTANT]
> Review the confirmed choices below and click **Proceed** to generate the automated GitHub Actions release workflow and in-app Build & Release status card.

- **Confirmed Decision 1 — Distribution Pipeline**: Automate APK and AAB package builds and direct GitHub Release asset publishing via GitHub Actions whenever you push your project from AI Studio to GitHub.
- **Confirmed Decision 2 — Production AdMob Configuration**: Keep your live production AdMob App ID (`ca-app-pub-5272800200175412~8920229976`), Banner Unit (`ca-app-pub-5272800200175412/4688633088`), and Interstitial Unit (`ca-app-pub-5272800200175412/4141838179`) active in release builds while preserving safe preview fallback in debug builds.

### 1. Overview & Core Concept

- **What It Does**:
  1. Adds a complete GitHub Actions CI/CD workflow that automatically syncs web assets, provisions the signing keystore (either from repository secrets or an automatic self-signed upload keystore fallback so builds never fail out-of-the-box), compiles both a direct-installable APK and a Google Play Store AAB, uploads them as downloadable workflow artifacts, and publishes direct-download links on GitHub Releases.
  2. Adds a dedicated **Build & Release Package** section inside the app's **Settings** tab (styled in the app's Minimal Vintage aesthetic) displaying the active Application ID, Version Code/Name, Production AdMob status, and quick-copy instructions for downloading the APK from AI Studio's top-right Export menu or GitHub Releases.
- **Target Audience / Persona**: App owners and testers who want one-click downloadable APK links from GitHub Releases and immediate visibility into build and monetization configuration.
- **Key Value**: Eliminates manual local Android Studio setup by turning every GitHub push into a ready-to-download signed APK and Play Store AAB bundle.

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Direct Export in AI Studio**: User clicks the top-right **Export / Settings** menu in AI Studio to either download the project or push directly to a GitHub repository.
  2. **Automated GitHub Release APK Link**: Upon pushing to GitHub, the automated workflow builds `1010Tool-release.apk`, `1010Tool-debug.apk`, and `1010Tool-release.aab`, and attaches them directly to the repository's **Releases** page with permanent direct-download URLs.
  3. **In-App Build & Release Inspector**: Opening **Settings** in the bottom navigation bar displays a new **Release & APK Package** card showing the live Package ID (`com.aistudio.tententool.utility`), AdMob Production status badge, and a one-tap **Copy Release Info** action.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Minimal Vintage / Tactile Editorial utility aesthetic matching `1010Tool`.
  - *Color Palette & Mood*: Warm archival paper surfaces (`--bg: #F4F1EA`, `--surface: #FAF8F5`) paired with deep ink borders (`--text: #171614`), terracotta accents (`--accent: #B94F37`), and full dark-mode parity (`#141413` / `#1E1E1C`).
  - *Typography & Hierarchy*: `Instrument Serif` section headers, `Plus Jakarta Sans` descriptions, and `JetBrains Mono` uppercase badges and package identifiers.
  - *Component Styling & Layout*: Crisp `1px solid` borders, tactile offset hard shadows (`2px 2px 0px`), and responsive card rows that clear the bottom navigation bar and 50dp AdMob banner container.
- **Interactive Feedback & Motion**: Tactile button press states (`translate(2px, 2px)`), haptic vibration via `AndroidBridge`, and confirmation toasts when copying package or AdMob release details.

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Self-Healing Keystore Provisioning in CI**
  - *Chosen Approach*: The GitHub Actions workflow checks if custom signing secrets (`KEYSTORE_BASE64`, `STORE_PASSWORD`, `KEY_PASSWORD`) are configured in the GitHub repository; if not yet added, it automatically generates a valid `my-upload-key.jks` keystore during the CI run so the release APK and AAB build succeeds immediately on the very first push.
  - *Why*: Prevents broken first-time CI runs while still supporting custom production keystores when secrets are provided.
  - *Alternatives Considered*: Failing the build when secrets are missing, which blocks immediate APK downloads after pushing from AI Studio.
- **Decision 2: Strict Production AdMob in Release Builds**
  - *Chosen Approach*: Release builds strictly load only your production Banner (`ca-app-pub-5272800200175412/4688633088`) and Interstitial (`ca-app-pub-5272800200175412/4141838179`) units (`BuildConfig.DEBUG == false`), while debug/preview builds retain the `No Fill` preview fallback.
  - *Why*: Guarantees 100% real ad impressions in your distributed APK/AAB while keeping the AI Studio preview testable.

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI Studio Push to GitHub                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD Pipeline                        │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌────────────────┐  │
│  │ JDK 17 + Android SDK│─▶│ Keystore Provisioner │─▶│ Gradle Builder │  │
│  └─────────────────────┘  └──────────────────────┘  └───────┬────────┘  │
└─────────────────────────────────────────────────────────────┼───────────┘
                                                              │
                   ┌──────────────────────────────────────────┴──────────┐
                   ▼                                                     ▼
┌─────────────────────────────────────┐               ┌─────────────────────────────────────┐
│   Direct Download Release Assets    │               │     Android App Runtime (1010Tool)  │
│ • 1010Tool-release-signed.apk       │               │ • Production AdMob App & Unit IDs   │
│ • 1010Tool-debug.apk                │               │ • Native Bridge Build Info API      │
│ • 1010Tool-release.aab (Play Store) │               │ • Settings Release & APK Status UI  │
└─────────────────────────────────────┘               └─────────────────────────────────────┘
```
- **Data Model & State**:
  - `WebAppInterface.getBuildReleaseInfo()` exposes a JSON payload containing `applicationId`, `versionName`, `versionCode`, `buildType`, and `adMobProductionReady` to the WebView Settings panel.
- **Interactive Component & State Mapping**:
  - Opening the **Settings** tab calls `syncSettingsUIState()`, which queries `AndroidBridge.getBuildReleaseInfo()` (when running inside the native Android app) and populates the **Release & APK Package** status badges.
  - Tapping **Copy Build & AdMob Summary** copies the structured package ID, version, and production AdMob unit configuration to the clipboard with haptic feedback and a confirmation toast.
