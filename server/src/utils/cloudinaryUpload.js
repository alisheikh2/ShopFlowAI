const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = async (fileData, folder) => {
  const result = await cloudinary.uploader.upload(fileData, {
    folder,
    resource_type: "image",
  });

  return result;
};

const deleteFromCloudinary = async (publicId) => {
  const result = await cloudinary.uploader.destroy(publicId);

  return result;
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};