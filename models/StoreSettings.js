import mongoose from 'mongoose';

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
      default: 'ZahraLareina',
      trim: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'PKR',
    },
    themeIndex: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 10,
    },
  },
  { timestamps: true }
);

export default mongoose.model('StoreSettings', storeSettingsSchema);
