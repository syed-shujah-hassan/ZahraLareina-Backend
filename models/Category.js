import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    image: {
      type: String,
    },
    showInMenu: {
      type: Boolean,
      default: true,
    },
    showOnHome: {
      type: Boolean,
      default: false,
    },
    subcategories: {
      type: [subcategorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
