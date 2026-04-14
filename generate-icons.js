import { createCanvas } from 'canvas';
import fs from 'fs';

/**
 * Generate a simple camera icon with the specified size
 * @param {number} size - The size of the icon (width and height)
 * @param {boolean} noTransparency - If true, use white background instead of transparent
 * @returns {Buffer} PNG buffer
 */
function generateCameraIcon(size, noTransparency = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  if (noTransparency) {
    ctx.fillStyle = '#1976d2'; // Theme color from manifest
    ctx.fillRect(0, 0, size, size);
  }

  // Calculate proportional sizes
  const padding = size * 0.15;
  const cameraWidth = size - (padding * 2);
  const cameraHeight = cameraWidth * 0.65;
  const cameraX = padding;
  const cameraY = (size - cameraHeight) / 2;

  // Camera body
  ctx.fillStyle = noTransparency ? '#ffffff' : '#1976d2';
  ctx.fillRect(cameraX, cameraY, cameraWidth, cameraHeight);

  // Camera lens (circle)
  const lensRadius = cameraHeight * 0.35;
  const lensX = cameraX + cameraWidth * 0.4;
  const lensY = cameraY + cameraHeight / 2;
  
  ctx.beginPath();
  ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2);
  ctx.fillStyle = noTransparency ? '#1976d2' : '#ffffff';
  ctx.fill();

  // Lens inner circle
  ctx.beginPath();
  ctx.arc(lensX, lensY, lensRadius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = noTransparency ? '#ffffff' : '#1976d2';
  ctx.fill();

  // Flash/viewfinder on top
  const flashWidth = cameraWidth * 0.2;
  const flashHeight = cameraHeight * 0.25;
  const flashX = cameraX + cameraWidth * 0.75;
  const flashY = cameraY + cameraHeight * 0.15;
  
  ctx.fillStyle = noTransparency ? '#ffffff' : '#1976d2';
  ctx.fillRect(flashX, flashY, flashWidth, flashHeight);

  return canvas.toBuffer('image/png');
}

// Generate icons
console.log('Generating app icons...');

// 192x192 for manifest
const icon192 = generateCameraIcon(192);
fs.writeFileSync('icons/icon-192.png', icon192);
console.log('✓ Generated icons/icon-192.png');

// 512x512 for manifest
const icon512 = generateCameraIcon(512);
fs.writeFileSync('icons/icon-512.png', icon512);
console.log('✓ Generated icons/icon-512.png');

// 180x180 apple-touch-icon (no transparency, square)
const appleIcon = generateCameraIcon(180, true);
fs.writeFileSync('icons/apple-touch-icon.png', appleIcon);
console.log('✓ Generated icons/apple-touch-icon.png');

console.log('\nAll icons generated successfully!');
