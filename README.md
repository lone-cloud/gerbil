# FriendlyKobold

A koboldcpp manager.

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

### Linux Wayland support

Additional configurations have been written to help with ideal Wayland support, but as per current Electron guidelines, the user should set `ELECTRON_OZONE_PLATFORM_HINT` to `wayland` in their environment variable according to the [Electron Environment Variables documentation](https://www.electronjs.org/docs/latest/api/environment-variables#electron_ozone_platform_hint-linux).

### Future considerations

It would make a lot of sense to transition this project to Tauri from Electron. The app size should drop from ~80MB to ~10MB; however, users on obsolete OSes (with outdated WebViews) will very likely encounter issues. In addition, I would need to learn Rust to rewrite the BE (Electron main code), but at least we can re-use all the React code. The app would be much smaller, faster and memory efficient, but not work for some users. I think it's a worthy tradeoff.

## License

AGPL v3 License - see LICENSE file for details
