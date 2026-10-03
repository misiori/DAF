# 🐜 Ant Farm (Dangerous Ant Farm)

A rhythm-based precision ant dodging game created by **misiori**. Dodge swarming ants, survive intense rhythmic soundtracks, unlock custom skins, create your own custom chambers, and discover levels created by the community!

---

## 🚀 How to Download & Play

### 🌐 Play in Browser
Open the live web app in any modern browser on desktop or mobile:
- Controls: **Mouse cursor** or **Touch screen** to guide your ant.
- Avoid colliding with enemy ants, use obstacles for cover, collect sugar cubes, and survive until the track finishes!

---

## 💻 Desktop Binaries (GitHub Releases & Artifacts)

Pre-built binaries are available for **Windows** and **Linux**:

- **Windows**:
  - `AntFarm-Setup-1.0.0.exe` (Installer with Start Menu & Desktop shortcuts)
  - `AntFarm-1.0.0-portable.exe` (Portable version, no install needed)
  - `AntFarm-Windows.zip` (Direct executable archive)
- **Linux**:
  - `AntFarm-1.0.0.AppImage` (Standalone executable)
  - `AntFarm-Linux.zip`

---

## 🛡️ "Chrome says it's a dangerous file" / SmartScreen Warning: Why & How to Fix

### Why does Chrome or Windows flag the download?
1. **The Word "Dangerous" in the Filename**:
   Previously, GitHub Actions named the downloaded zip file `dangerous-ant-farm-appimage.zip`. Google Chrome's Safe Browsing heuristic scanner literally flags files containing the word `"dangerous"` in their name as high-risk. We have renamed all artifacts and releases to `AntFarm-*` to eliminate this keyword trigger.
2. **New Release & Unsigned Open-Source Binary**:
   Google Chrome and Microsoft SmartScreen flag **all newly released `.exe` and binary downloads** from GitHub that don't have thousands of historical download statistics or an expensive corporate EV Code Signing Certificate ($400+/year). This is a standard false-positive for indie and open-source games.

### How to unblock in Google Chrome:
1. In Google Chrome, open your Downloads list by pressing **`Ctrl + J`** (or **`Cmd + Shift + J`** on Mac), or click the download icon in the top right.
2. Locate the file in the download bar.
3. Click **"Keep"** or **"Download suspicious file"** -> select **"Keep anyway"**.
4. Chrome will immediately complete the download.

### How to run on Windows:
1. If Windows SmartScreen displays *"Windows protected your PC"*:
2. Click **"More info"**.
3. Click **"Run anyway"**.

### How to run on Linux:
1. Make the AppImage executable:
   ```bash
   chmod +x AntFarm-*.AppImage
   ```
2. Run it:
   ```bash
   ./AntFarm-*.AppImage
   ```
   *(Note: Discord Rich Presence on Linux connects automatically to your local `/run/user/1000/discord-ipc-0` socket).*

---

## 🛠️ Building From Source

### Prerequisites
- Node.js 20+ / 22+
- npm

### Install Dependencies
```bash
npm install
```

### Run Locally (Web)
```bash
npm run dev
```

### Run Electron Desktop Locally
```bash
npm run electron:dev
```

### Build Desktop Binaries
- **Linux AppImage & Zip**:
  ```bash
  npm run electron:build:linux
  ```
- **Windows Installer & Portable**:
  ```bash
  npm run electron:build:win
  ```
- **Both**:
  ```bash
  npm run electron:build:all
  ```
Output files will be generated in the `release/` folder.
