import fs from 'fs';
import path from 'path';

const filesToDelete = [
  'c:\\Users\\HP\\OneDrive\\Desktop\\ep2\\EventPulse\\src\\components\\FavoriteButton.jsx',
  'c:\\Users\\HP\\OneDrive\\Desktop\\ep2\\EventPulse\\server\\routes\\favorites.js',
  'c:\\Users\\HP\\OneDrive\\Desktop\\ep2\\EventPulse\\server\\models\\Favorite.js',
  'c:\\Users\\HP\\OneDrive\\Desktop\\ep2\\EventPulse\\test-favorites.js',
  'c:\\Users\\HP\\OneDrive\\Desktop\\ep2\\EventPulse\\debug-favorites-sequelize.log'
];

filesToDelete.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Deleted: ${file}`);
    } else {
      console.log(`Not found: ${file}`);
    }
  } catch (err) {
    console.error(`Error deleting ${file}: ${err.message}`);
  }
});
