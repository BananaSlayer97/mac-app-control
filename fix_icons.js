import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// We use the original backup that we know is good, or the one we copied
const iconPath = path.join(__dirname, 'src-tauri/icons/icon.png.bak');
const outputDir = path.join(__dirname, 'src-tauri/icons');

const sizes = [
    { name: '32x32.png', w: 32, h: 32 },
    { name: '128x128.png', w: 128, h: 128 },
    { name: '128x128@2x.png', w: 256, h: 256 },
    { name: 'icon.png', w: 1024, h: 1024 },
    { name: 'StoreLogo.png', w: 512, h: 512 },
    { name: 'Square30x30Logo.png', w: 30, h: 30 },
    { name: 'Square44x44Logo.png', w: 44, h: 44 },
    { name: 'Square71x71Logo.png', w: 71, h: 71 },
    { name: 'Square89x89Logo.png', w: 89, h: 89 },
    { name: 'Square107x107Logo.png', w: 107, h: 107 },
    { name: 'Square142x142Logo.png', w: 142, h: 142 },
    { name: 'Square150x150Logo.png', w: 150, h: 150 },
    { name: 'Square284x284Logo.png', w: 284, h: 284 },
    { name: 'Square310x310Logo.png', w: 310, h: 310 },
];

async function process() {
    console.log(`Reading source icon from ${iconPath}...`);

    try {
        const image = await Jimp.read(iconPath);

        // Force alpha channel to be present by manipulating opacity slightly or ensuring output has alpha
        // Jimp images are RGBA by default.
        // We can iterate pixels if needed, but usually just saving as PNG works.

        for (const size of sizes) {
            console.log(`Generating ${size.name}...`);
            const resized = image.clone();
            resized.resize({ w: size.w, h: size.h });
            await resized.write(path.join(outputDir, size.name));
        }
        console.log('Done!');
    } catch (err) {
        console.error("Error processing icons:", err);
    }
}

process();
