import fs from 'fs';
import imageThumbnail from 'image-thumbnail';

/**
 * Generate thumbnails for a file
 * @param {str} localPath - path to file in local storage
 * @param {number[]} sizes - array of thumbnail sizes
 */
async function generateThumbnail(localPath, sizes = [100, 250, 500]) {
  // Check if file exists local storage
  if (!fs.existsSync(localPath)) throw (new Error('File not found'));

  // Create thumbnails
  const thumbnails = sizes
    .map((thumbnailSize) => imageThumbnail(localPath, { width: thumbnailSize }));
  await Promise.all(thumbnails);

  // Store thumbnails in local storage
  thumbnails.forEach((thumbnail, index) => {
    fs.writeFileSync(`${localPath}_${sizes[index]}`, thumbnail);
  });
}

export default generateThumbnail;