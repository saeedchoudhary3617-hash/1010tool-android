# Fix GitHub Actions SDK Manager (`package 'tools'` Error) & Release Pipeline

This plan resolves the `Failed to find package 'tools' in sdkmanager` failure in GitHub Actions by removing the broken third-party `setup-android` action (which attempts to install the deprecated `tools` SDK package removed by Google) and using the pre-installed Android SDK and modern `cmdline-tools` bundled on GitHub's `ubuntu-latest` runners.

### User Review & Critical Decisions

> [!IMPORTANT]
> Review the workflow fix below and click **Proceed** to apply the updated GitHub Actions configuration.

- **Root Cause**: `android-actions/setup-android` internally invokes `sdkmanager "tools"`, which Google recently removed from the Android SDK repository in favor of `cmdline-tools;latest`.
- **Chosen Fix**: Remove `android-actions/setup-android` entirely and configure `ANDROID_HOME` / `ANDROID_SDK_ROOT` directly against the pre-installed `/usr/local/lib/android/sdk` on `ubuntu-latest`, using `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses` to accept SDK licenses cleanly.

### 1. Overview & Core Concept

- **What It Does**:
  1. Eliminates the `setup-android` action that triggers `Failed to find package 'tools' in sdkmanager`.
  2. Uses the native Android SDK and `cmdline-tools` already pre-installed on GitHub-hosted Ubuntu runners, ensuring fast and reliable license acceptance without downloading legacy SDK packages.
  3. Retains automatic keystore generation, Gradle 9.3.1 + JDK 21 compilation, workflow artifact upload, and automatic GitHub Release publishing (`v1.0.<run_number>`) with your production AdMob IDs.
- **Target Audience / Persona**: App owners pushing from AI Studio to GitHub who want a zero-error CI build that outputs direct-download `.apk` and `.aab` links.
- **Key Value**: Removes the broken legacy `sdkmanager tools` call so the workflow proceeds directly to compiling and publishing your APK.

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. Push the updated workflow to GitHub using AI Studio's **Push to GitHub** button.
  2. GitHub Actions skips legacy `tools` installation, accepts SDK licenses via `cmdline-tools`, builds `1010Tool-release-signed.apk`, `1010Tool-debug.apk`, and `1010Tool-release.aab`, and publishes them to the repository's **Releases** page.
- **Visual Identity & Theme**:
  - Preserves the existing **Minimal Vintage** theme (`#F4F1EA` light / `#141413` dark, `1px solid` ink borders, `Instrument Serif` + `JetBrains Mono`) and the **Release & APK Package** status card inside the app's **Settings** tab.
- **Interactive Feedback & Motion**: Unchanged tactile press states, haptic feedback, and clipboard copy toast in the Settings view.

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Use Pre-Installed Runner Android SDK Instead of `android-actions/setup-android`**
  - *Chosen Approach*: Point `ANDROID_HOME` and `ANDROID_SDK_ROOT` to `/usr/local/lib/android/sdk` (standard on `ubuntu-latest`) and invoke `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses` directly.
  - *Why*: Avoids third-party action breakage caused by Google removing the obsolete `tools` package from the SDK repository, and shaves ~30 seconds off every CI run.
  - *Alternatives Considered*: Pinning an older version of `setup-android`, which still fails because the upstream Google SDK repository itself removed the `tools` package.

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (ubuntu-latest)                       │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌────────────────┐  │
│  │ JDK 21 + Pre-built  │─▶│ cmdline-tools/latest │─▶│ Gradle 9.3.1   │  │
│  │ $ANDROID_HOME SDK   │  │ sdkmanager --licenses│  │ APK/AAB Build  │  │
│  └─────────────────────┘  └──────────────────────┘  └───────┬────────┘  │
└─────────────────────────────────────────────────────────────┼───────────┘
                                                              │
                                                              ▼
                                          ┌───────────────────────────────────┐
                                          │ GitHub Releases + Actions Artifact│
                                          │ • 1010Tool-release-signed.apk     │
                                          │ • 1010Tool-debug.apk              │
                                          │ • 1010Tool-release.aab            │
                                          └───────────────────────────────────┘
```
- **Data Model & State**: No changes required to the Android application data layer; only the CI/CD pipeline SDK setup step is updated.
- **Interactive Component & State Mapping**: The **Settings → Release & APK Package** card continues to display live package metadata and copy release details.
