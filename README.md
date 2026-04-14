# Traffic Camera Finder PWA

A Progressive Web App that displays traffic enforcement cameras (speed cameras and red-light cameras) in Oakland and San Francisco on an interactive map.

## Features

- 📍 Interactive map with your current location
- 📷 Camera markers showing speed and red-light cameras
- 🏙️ Filter cameras by city (Oakland, San Francisco, or All)
- 📱 Installable on iOS and Android devices
- 🔌 Works offline with cached app shell
- 🗺️ Powered by Leaflet and OpenStreetMap

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start local server:**
   ```bash
   python3 -m http.server 8000
   ```
   Or use any static file server.

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

## Testing

Run the test suite:
```bash
npm test
```

## Deployment to GitHub Pages

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from branch `main`
   - Folder: `/ (root)`
   - Save

3. **Update manifest.json:**
   - Change `start_url` to match your GitHub Pages URL:
     ```json
     "start_url": "/your-repo-name/"
     ```

4. **Access your app:**
   ```
   https://your-username.github.io/your-repo-name/
   ```

## Installing on iOS

1. Open the app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. The app will now launch in standalone mode from your home screen

## Project Structure

```
traffic-camera-finder/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── css/
│   └── styles.css         # App styles
├── js/
│   ├── app.js             # Main application logic
│   ├── CameraService.js   # Camera data fetching and caching
│   ├── GeolocationService.js  # User location detection
│   ├── MapView.js         # Map rendering with Leaflet
│   ├── FilterController.js    # City filter UI
│   └── StatusDisplay.js   # Loading/error messages
├── api/
│   └── cameras.json       # Sample camera data
└── icons/
    ├── icon-192.png       # PWA icon (192x192)
    ├── icon-512.png       # PWA icon (512x512)
    └── apple-touch-icon.png  # iOS home screen icon (180x180)
```

## Technologies Used

- **Leaflet** - Interactive maps
- **OpenStreetMap** - Map tiles
- **Service Worker** - Offline support
- **localStorage** - Camera data caching
- **Geolocation API** - User positioning

## Requirements

- Modern browser with Service Worker support
- HTTPS (required for Service Worker and Geolocation)
- Location permission (optional, falls back to San Francisco)

## License

MIT
