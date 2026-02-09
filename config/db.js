import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined in .env');
  }

  await mongoose.connect(uri, {
    dbName: 'zahralareina',
  });

  console.log('MongoDB connected');
};
