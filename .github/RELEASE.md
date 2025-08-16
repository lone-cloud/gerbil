# Release Workflow

This GitHub Action workflow automatically builds and releases FriendlyKobold for macOS, Windows, and Linux.

## How to Create a Release

### Method 1: Tag-based Release (Recommended)

1. Create and push a new tag:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. The workflow will automatically:
   - Build the app for all platforms
   - Run type checking and linting
   - Create a GitHub release
   - Upload the built files as release assets

### Method 2: Manual Release

1. Go to the "Actions" tab in your GitHub repository
2. Select the "Release" workflow
3. Click "Run workflow"
4. Enter the tag version (e.g., `v1.0.0`)
5. Click "Run workflow"

## Generated Files

The workflow creates the following files:

- **macOS**: `FriendlyKobold-{version}.dmg`
- **Windows**: `FriendlyKobold Setup {version}.exe`
- **Linux**: `FriendlyKobold-{version}.AppImage`

## Requirements

- The repository must have a `GITHUB_TOKEN` (automatically provided by GitHub)
- Node.js 22 and Yarn for building
- All dependencies must be properly defined in `package.json`

## Troubleshooting

If the build fails:

1. Check that all dependencies are installed correctly
2. Ensure the build script works locally: `yarn build`
3. Check the workflow logs for specific error messages
4. Verify that the version tag follows semantic versioning (e.g., `v1.0.0`)

## Adding Icons

To customize the app icon:

1. Replace `assets/icon_512.png` with your custom 512x512 PNG icon
2. Electron Builder automatically converts this single PNG to the appropriate format for each platform:
   - macOS: Converts to `.icns` format
   - Windows: Converts to `.ico` format
   - Linux: Uses PNG directly

The icon is already configured in `package.json` under the `build.icon` property.

## Customizing the Release

You can customize the release by editing `.github/workflows/release.yml`:

- Change the supported platforms in the `matrix.os` array
- Modify the release notes template
- Add additional build steps or checks
- Change the artifact upload logic
