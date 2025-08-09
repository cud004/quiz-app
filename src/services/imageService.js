const imagekit = require('../config/imagekit');

class ImageService {
    /**
     * Upload image to ImageKit
     * @param {Buffer} fileBuffer - Image buffer
     * @param {string} fileName - Original file name
     * @param {string} folder - Folder path in ImageKit
     * @returns {Promise<Object>} Upload result
     */
    static async uploadImage(fileBuffer, fileName, folder = 'users') {
        try {
            const result = await imagekit.upload({
                file: fileBuffer,
                fileName: fileName,
                folder: folder,
                useUniqueFileName: true,
                responseFields: ['url', 'thumbnailUrl', 'fileId']
            });

            return {
                url: result.url,
                thumbnailUrl: result.thumbnailUrl,
                fileId: result.fileId
            };
        } catch (error) {
            const err = new Error('Error uploading image to ImageKit');
            err.name = 'ImageUploadError';
            err.statusCode = 500;
            throw err;
        }
    }

    /**
     * Delete image from ImageKit
     * @param {string} fileId - ImageKit file ID
     * @returns {Promise<boolean>} Delete result
     */
    static async deleteImage(fileId) {
        try {
            await imagekit.deleteFile(fileId);
            return true;
        } catch (error) {
            const err = new Error('Error deleting image from ImageKit');
            err.name = 'ImageDeleteError';
            err.statusCode = 500;
            throw err;
        }
    }

    /**
     * Get image URL with transformations
     * @param {string} fileId - ImageKit file ID
     * @param {Object} options - Transformation options
     * @returns {string} Transformed image URL
     */
    static getImageUrl(fileId, options = {}) {
        try {
            return imagekit.url({
                path: fileId,
                transformation: [{
                    height: options.height || 300,
                    width: options.width || 300,
                    crop: options.crop || 'at_max',
                    quality: options.quality || 80
                }]
            });
        } catch (error) {
            const err = new Error('Error generating image URL');
            err.name = 'ImageUrlError';
            err.statusCode = 500;
            throw err;
        }
    }
}

module.exports = ImageService; 