import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';

const conversions = [
  { input: 'public/men-attire.svg', output: 'public/men-attire.webp' },
  { input: 'public/women-attire.svg', output: 'public/women-attire.webp' },
];

for (const { input, output } of conversions) {
  if (!existsSync(input)) {
    console.log(`Skipping ${input} - file not found`);
    continue;
  }
  const info = await sharp(input, { density: 300 })
    .resize(320, 427, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

mkdirSync('src/assets/gallery', { recursive: true });

const landingSource = 'source-images/gallery/landing-page/landing-1.jpg';

const heroConversions = [
  { input: landingSource, output: 'src/assets/gallery/landing-1.webp' },
];

for (const { input, output } of heroConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

// Art-directed crops: the source is a wide frame with empty sky up top (the
// couple stands well below the archway/treeline, centered horizontally), so
// object-cover alone can't frame them well on tall/narrow viewports (the
// full image height already fits, wasting space on sky). We pre-crop a
// sky-trimmed portrait region for each breakpoint band and keep the full
// frame for desktop, where it's wide enough to show uncropped.
const artDirectedCrops = [
  // Mobile phones (<768px wide): tight portrait crop.
  { extract: { left: 1961, top: 420, width: 1874, height: 3444 }, resize: [900, 1600], output: 'src/assets/gallery/landing-1-mobile.webp' },
  // Tablets (768-1023px wide, e.g. iPad Mini at 768x1024): wider portrait crop.
  { extract: { left: 1607, top: 420, width: 2583, height: 3444 }, resize: [1200, 1600], output: 'src/assets/gallery/landing-1-tablet.webp' },
];

for (const { extract, resize, output } of artDirectedCrops) {
  const info = await sharp(landingSource)
    .rotate()
    .extract(extract)
    .resize(resize[0], resize[1], { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${landingSource} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

const midPhotoConversions = [
  { input: 'source-images/gallery/portrait-mid-center.jpg', output: 'src/assets/gallery/portrait-mid-center.webp', width: 900 },
  { input: 'source-images/gallery/portrait-mid-side-1.jpg', output: 'src/assets/gallery/portrait-mid-side-1.webp', width: 700 },
  { input: 'source-images/gallery/portrait-mid-side-2.jpg', output: 'src/assets/gallery/portrait-mid-side-2.webp', width: 700 },
];

for (const { input, output, width } of midPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

const endPhotoConversions = [
  { input: 'source-images/gallery/end-photo.jpg', output: 'src/assets/gallery/end-photo.webp', width: 2400 },
];

for (const { input, output, width } of endPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

const firstPhotoConversions = [
  { input: 'source-images/gallery/first-section-desktop.jpg', output: 'src/assets/gallery/first-section-desktop.webp', width: 2400 },
  { input: 'source-images/gallery/first-section-mobile.jpg', output: 'src/assets/gallery/first-section-mobile.webp', width: 1200 },
];

for (const { input, output, width } of firstPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

const secondPhotoConversions = [
  { input: 'source-images/gallery/second-section.jpg', output: 'src/assets/gallery/second-section.webp', width: 2400 },
];

for (const { input, output, width } of secondPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

const thirdPhotoConversions = [
  { input: 'source-images/gallery/third-section.jpg', output: 'src/assets/gallery/third-section.webp', width: 1800 },
];

for (const { input, output, width } of thirdPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

const sixthPhotoConversions = [
  { input: 'source-images/gallery/sixth-section.jpg', output: 'src/assets/gallery/sixth-section.webp', width: 2400 },
];

for (const { input, output, width } of sixthPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

const seventhPhotoConversions = [
  { input: 'source-images/gallery/seventh-section.jpg', output: 'src/assets/gallery/seventh-section.webp', width: 2400 },
];

for (const { input, output, width } of seventhPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

const eighthPhotoConversions = [
  { input: 'source-images/gallery/eighth-section.jpg', output: 'src/assets/gallery/eighth-section.webp', width: 2400 },
];

for (const { input, output, width } of eighthPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

const rsvpPhotoConversions = [
  { input: 'source-images/gallery/rsvp-section.jpg', output: 'src/assets/gallery/rsvp-section.webp', width: 2400 },
];

for (const { input, output, width } of rsvpPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}
