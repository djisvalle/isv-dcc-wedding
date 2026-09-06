import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('src/assets/gallery', { recursive: true });

const landingSource = 'source-images/gallery/landing-1.jpg';

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
  { input: 'source-images/gallery/end-photo.jpg', output: 'src/assets/gallery/end-photo-mobile.webp', width: 1200 },
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
  { input: 'source-images/gallery/second-section.jpg', output: 'src/assets/gallery/second-section-mobile.webp', width: 1200 },
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
  { input: 'source-images/gallery/third-section.jpg', output: 'src/assets/gallery/third-section-mobile.webp', width: 1200 },
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
  { input: 'source-images/gallery/sixth-section.jpg', output: 'src/assets/gallery/sixth-section-mobile.webp', width: 1200 },
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
  { input: 'source-images/gallery/seventh-section.jpg', output: 'src/assets/gallery/seventh-section-mobile.webp', width: 1200 },
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
  { input: 'source-images/gallery/eighth-section.jpg', output: 'src/assets/gallery/eighth-section-mobile.webp', width: 1200 },
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
  { input: 'source-images/gallery/rsvp-section.jpg', output: 'src/assets/gallery/rsvp-section-mobile.webp', width: 1200 },
];

for (const { input, output, width } of rsvpPhotoConversions) {
  const info = await sharp(input)
    .rotate()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

// Wedding-party dress code illustrations. `.trim()` strips each source's
// margins first (they aren't symmetric), which otherwise renders as the
// artwork looking off-center in its box.
const weddingPartyAttireConversions = [
  { input: 'source-images/gallery/groomsmen-outfit.png', output: 'public/groomsmen-outfit.webp', width: 480 },
  // Client-supplied crop with all four hems already flush and a plain white
  // background (no alpha, unlike the original PNG source).
  { input: 'source-images/gallery/bridesmaids-outfit-1-final.jpg', output: 'public/bridesmaids-outfit-1.webp', width: 480 },
];

for (const { input, output, width } of weddingPartyAttireConversions) {
  const info = await sharp(input)
    .trim()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

// Wax seal on the invitation cover. Alpha is preserved (the scalloped wax
// edge sits on transparency), and it renders at 216px at most, so 3x covers
// high-density screens — the engraved wreath needs the pixels.
const sealConversions = [
  { input: 'source-images/seal.png', output: 'src/assets/seal.webp', width: 660 },
];

for (const { input, output, width } of sealConversions) {
  const info = await sharp(input)
    .trim()
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}

// Embossed paper stock for the invitation cover. Stretching the source to
// cover a tall phone flap blows the motif up to two flowers across, so it wants
// tiling at a smaller scale instead — but the source is a photograph, not a
// seamless tile (its opposite edges match no better than two unrelated interior
// columns). Mirroring it into a 2x2 block makes the edges agree by
// construction, so it repeats without a seam at any scale.
{
  const input = 'source-images/paper.jpg';
  const output = 'src/assets/paper.webp';
  // Flatten the relief toward a tone-on-tone emboss before tiling. The source
  // is a bold, high-contrast photograph; softening it both matches how printed
  // stock actually reads and keeps the mirror seams from announcing themselves
  // as kaleidoscope symmetry.
  const quadrant = await sharp(input)
    .resize(1024, null, { withoutEnlargement: true })
    .linear(0.42, 240 * (1 - 0.42))
    .toBuffer();
  const { width: qw, height: qh } = await sharp(quadrant).metadata();

  const info = await sharp({
    create: { width: qw * 2, height: qh * 2, channels: 3, background: '#f5ede0' },
  })
    .composite([
      { input: quadrant, left: 0, top: 0 },
      { input: await sharp(quadrant).flop().toBuffer(), left: qw, top: 0 },
      { input: await sharp(quadrant).flip().toBuffer(), left: 0, top: qh },
      { input: await sharp(quadrant).flip().flop().toBuffer(), left: qw, top: qh },
    ])
    .webp({ quality: 84 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB, ${info.width}x${info.height})`);
}

// General guest dress code illustrations, sized by height since the gallery
// displays them at a fixed height with width flexing to fit.
const guestAttireConversions = [
  { input: 'source-images/gallery/guest-male-outfit.png', output: 'public/men-attire.webp', height: 480 },
  { input: 'source-images/gallery/guest-female-outfit.png', output: 'public/women-attire.webp', height: 480 },
];

for (const { input, output, height } of guestAttireConversions) {
  const info = await sharp(input)
    .trim()
    .resize(null, height, { withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}
