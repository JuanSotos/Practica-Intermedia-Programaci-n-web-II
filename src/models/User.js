import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    nif: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'guest'],
      default: 'admin',
    },
    status: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
      index: true,
    },
    verificationCode: {
      type: String,
    },
    verificationAttempts: {
      type: Number,
      default: 3,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    address: {
      street: { type: String, trim: true },
      number: { type: String, trim: true },
      postal: { type: String, trim: true },
      city: { type: String, trim: true },
      province: { type: String, trim: true },
    },
    refreshToken: {
      type: String,
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('fullName').get(function () {
  if (this.name && this.lastName) {
    return `${this.name} ${this.lastName}`;
  }
  return this.name || '';
});

userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

export default User;
