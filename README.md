# Sentinel Access Control

Sentinel is a browser-based facility access administration console. It lets an administrator register people with face photos, run face matching against an ESP32-CAM image, review access events, and manage local data and device settings.

> **Hardware note:** Face scans send access status and lock commands to Firebase Realtime Database. The ESP32 firmware polls `/lock`; GPIO 2 controls the lock, GPIO 5 controls a relay in sync with the lock, and a denied status sounds the buzzer on GPIO 4 for two seconds. A “door unlocked” message or device indicator in the interface is not confirmation that hardware has operated.

## What the system does

### Administrator sign-in

- Presents a PIN screen before showing the administration console.
- The default PIN is `1234`; it can be changed in **Settings**.
- Sign out returns to the PIN screen.
- This is a client-side UI gate, not server-side authentication. The PIN and application data are stored in the browser and should not be treated as secure credentials.

### Dashboard

- Shows the total number of registered members and how many are active.
- Counts granted and denied access events recorded today.
- Displays the ten most recent events and up to ten recent denied attempts.

### Member management

- Registers members with a name, unique ID/student number, and one of four roles: Student, Staff, Lecturer, or Visitor.
- Requires at least three face images for registration and for saving edits.
- Captures face images from a computer camera, an ESP32-CAM, or an uploaded image.
- Searches members by name or ID.
- Supports editing member details and photos, activating/deactivating members, and deleting members.
- A deactivated member remains enrolled but will be denied during face recognition.

### Face recognition and access attempts

- Loads the face-detection, landmark, and recognition models bundled in `public/models/` and runs matching in the browser.
- Offers separate face scans for Entry and Exit, plus a manual Exit push-button action.
- For a scan, obtains a JPEG frame from the configured ESP32-CAM capture endpoint, detects a face, and compares it with enrolled member photos. The best match is accepted when its Euclidean distance is at most `0.5`.
- Grants a recognized active member, denies an unknown face, and denies a recognized but deactivated member. If no face is found, it reports that result without recording an access event.
- Records successful and denied scan attempts, including the direction, time, member (or Unknown), authorization result, and reason.
- The manual Exit action records a granted event named “Manual exit.”
- Shows transient result text and device indicators. The buzzer is operated by the ESP32 firmware; the interface's lock and LED indicators are display-only.

### Access monitoring

- Lists recorded activity with date, time, name, ID, Entry/Exit direction, status, authorization, and reason.
- Filters by name or ID, Granted/Denied status, Entry/Exit direction, and date range.
- Exports the currently filtered events to `access-logs.csv`.
- Can clear all access logs after confirmation.

### Settings and data portability

- Saves the ESP32-CAM stream URL and administrator PIN.
- Requires a PIN of at least four characters.
- Exports members, face photos, access logs, and settings to `access-control-data.json`.
- Imports a JSON file if it contains member and log arrays. Import replaces the stored application data; when the imported file has no settings, the current settings are retained.

## Data storage and privacy

- Member, log, and settings state is kept in the browser's `localStorage` under the key `face-access-control-v1`. The ESP32-CAM address used by the member photo-capture form is stored separately as `espCamUrl`.
- Member photos and face descriptors are processed client-side; descriptors are cached in memory while the page is running. No application server is used. Firebase Realtime Database `/lock` carries device commands and the latest access status.
- Data is local to the browser profile and origin. Clearing browser storage removes it. Use JSON export for backups and before changing browsers or devices.
- Treat exported JSON files as sensitive: they contain member details and face images.

## Run locally

Requirements: Node.js and npm.

```sh
cd access-admin
npm install
npm run dev
```

Open the local URL printed by Vite. Sign in with `1234` the first time, then set a new PIN in **Settings**.

Available commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check the project and create a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run Oxlint. |

## ESP32-CAM and access-device setup

1. Connect the browser's computer to a network that can reach the ESP32-CAM.
2. In **Members**, enter the camera's base address (for example, `http://192.168.4.1`) and connect to capture enrollment photos.
3. In **Settings**, enter the stream URL (for example, `http://192.168.4.1:81/stream`) and save.
4. Open **Face Recognition** and run an Entry or Exit scan.
5. Configure the ESP32 firmware's Wi-Fi, Firebase URL, and (if required) the same Firebase auth token used in **Settings**. Upload `firmware/firmware.ino`; connect the lock control input to GPIO 2, the relay input to GPIO 5, and the buzzer input to GPIO 4. GPIO 2 and GPIO 5 switch together when the lock opens and closes. The firmware sounds the buzzer for two seconds when `/lock/status` is `Denied`; it records the handled event in `/lock/buzzedAt` to prevent repeated buzzing.

If a browser request returns HTTP 401 or 403, Firebase rejected the write to `/lock`. Check the token in **Settings** and the Realtime Database rules for both the browser and ESP32 clients. Do not enable unauthenticated public writes as a permanent fix.

The lock and relay must use suitable drivers and external power; do not power them directly from ESP32 GPIOs. The buzzer should also be driven through an appropriate transistor/driver if its current exceeds the ESP32 GPIO rating. The firmware uses active-high outputs; set `ACTIVE_HIGH` to `false` for active-low modules. GPIO 5 is an ESP32 boot-strapping pin, so make sure the relay module does not force an incompatible level while the board resets.

The capture implementation expects the standard ESP32 CameraWebServer-style endpoints: a live stream at `:81/stream` and a single JPEG at `/capture`. The browser must be able to load the stream and fetch the capture endpoint. Network access, browser security policy, or camera firmware configuration may prevent this; the application does not configure the camera.

For enrollment, the browser camera requires camera permission and a secure context (localhost or HTTPS). Photo upload is also available.

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | PIN gate, navigation, and screen selection. |
| `src/store.ts` | Application state, member/log operations, and localStorage persistence. |
| `src/face.ts` | Face model loading, descriptor extraction, and member matching. |
| `src/CameraCapture.tsx` | Enrollment photo capture from a browser camera or ESP32-CAM, and image upload. |
| `src/pages/Dashboard.tsx` | Summary counts and recent activity. |
| `src/pages/Members.tsx` | Member registration, editing, search, activation, and deletion. |
| `src/pages/FaceRecognition.tsx` | Camera scans, access-event recording, and simulated device feedback. |
| `src/pages/Logs.tsx` | Access-event filtering, CSV export, and log clearing. |
| `src/pages/Settings.tsx` | Camera URL, administrator PIN, and JSON import/export. |
| `public/models/` | Face detection, landmark, and recognition model files used by the browser. |
