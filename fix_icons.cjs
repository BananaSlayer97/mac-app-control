const Jimp = require('jimp');
const path = require('path');

const iconPath = path.join(__dirname, 'src-tauri/icons/icon.png');
const outputDir = path.join(__dirname, 'src-tauri/icons');

const sizes = [
    { name: '32x32.png', w: 32, h: 32 },
    { name: '128x128.png', w: 128, h: 128 },
    { name: '128x128@2x.png', w: 256, h: 256 },
    { name: 'icon.png', w: 1024, h: 1024 }, // Ensure main icon is also ok
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
    console.log('Reading source icon...');
    const image = await Jimp.read(iconPath);

    // Ensure it has alpha channel
    image.rgba(true);

    for (const size of sizes) {
        console.log(`Generating ${size.name}...`);
        const resized = image.clone().resize(size.w, size.h);
        await resized.writeAsync(path.join(outputDir, size.name));
    }
    console.log('Done!');
}

process().catch(console.error);
