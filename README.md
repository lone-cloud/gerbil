# Friendly Kobold

A koboldcpp manager. <!-- markdownlint-disable MD033 -->
<img src="assets/icon.png" alt="FriendlyKobold Icon" width="32" height="32">

<!-- markdownlint-enable MD033 -->

## Core Features

- modern UI for [koboldcpp](https://github.com/LostRuins/koboldcpp) with full support for Linux Wayland
- download and keep up-to-date your [koboldcpp](https://github.com/LostRuins/koboldcpp/releases) binary
- better surface the ROCm-specific builds of koboldcpp from YellowRoseCx and from [koboldai.org](https://koboldai.org/cpplinuxrocm)
- manage the koboldcpp binary to prevent it from running in the background indefinitely
- automatically unpack all downloaded koboldcpp binaries for significantly faster operation and reduced RAM+HDD utilization (up to ~4GB less RAM usage for ROCm)
- adding presets for a basic flux or chroma image generation setup

### Prerequisites

- **[Volta](https://volta.sh/)** - JavaScript tool manager (installs correct Node.js + Yarn versions automatically)

### Setup

1. **Install Volta** (if not already installed):

   ```bash
   curl https://get.volta.sh | bash
   ```

2. Clone the repository
3. Install dependencies (Volta will auto-install the correct Node.js and Yarn versions):

   ```bash
   yarn
   ```

4. Start the development server:

   ```bash
   yarn dev
   ```

### Windows ROCm Support

There is ROCm Windows support maintained by YellowRoseCx in a separate fork.
Unfortunately it does not properly support unpacking, which would greatly diminish its performance and provide a poor UX when used alongside this app.
For Friendly Kobold to work with this fork, this issue must be fixed first: https://github.com/YellowRoseCx/koboldcpp-rocm/issues/129

### Future features

Not all koboldcpp features have currently been ported over the UI. As a workaround one may use the "Additional arguments" on the "Advanced" tab of the launcher to provide additional command line arguments if you know them.

### Future considerations

It would make a lot of sense to transition this project to Tauri from Electron. The app size should drop from ~110MB to ~10MB; however, users on obsolete OSes (with outdated WebViews) will very likely encounter issues. In addition, I would need to learn Rust to rewrite the BE (Electron main code), but at least we can re-use all the React code. The app would be much smaller, faster and memory efficient, but not work for some users. I think it's a worthy tradeoff.

### Dev notes

- Maximum compression doesn't work well on Linux and causes the app start time to be over 30 secs. Reducing compression for Linux's AppImage builds, which increases file size by ~20MB, but makes its start up time reasonable again.

## License

AGPL v3 License - see LICENSE file for details
