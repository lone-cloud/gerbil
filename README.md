# FriendlyKobold

A koboldcpp manager.

## Core Features

- modern UI with full support for Linux Wayland
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

### Linux Wayland support

Additional configurations have been written to help with ideal Wayland support, but as per current Electron guidelines, the user should set `ELECTRON_OZONE_PLATFORM_HINT` to `wayland` in their environment variable according to the [Electron Environment Variables documentation](https://www.electronjs.org/docs/latest/api/environment-variables#electron_ozone_platform_hint-linux).

### Future features

Not all koboldcpp features have currently been ported over the UI. As a workaround one may use the "Additional arguments" on the "Advanced" tab of the launcher to provide additional command line arguments if you know them.

### Future considerations

It would make a lot of sense to transition this project to Tauri from Electron. The app size should drop from ~80MB to ~10MB; however, users on obsolete OSes (with outdated WebViews) will very likely encounter issues. In addition, I would need to learn Rust to rewrite the BE (Electron main code), but at least we can re-use all the React code. The app would be much smaller, faster and memory efficient, but not work for some users. I think it's a worthy tradeoff.

## License

AGPL v3 License - see LICENSE file for details
