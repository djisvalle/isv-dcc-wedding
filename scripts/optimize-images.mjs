import sharp from 'sharp';

const conversions = [
  { input: 'public/men-attire.svg', output: 'public/men-attire.webp' },
  { input: 'public/women-attire.svg', output: 'public/women-attire.webp' },
];

for (const { input, output } of conversions) {
  const info = await sharp(input, { density: 300 })
    .resize(320, 427, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${input} -> ${output} (${(info.size / 1024).toFixed(1)} KB)`);
}
