const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    province: { type: String, required: true },
    district: { type: String, required: true },
    deliveryLocation: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Customer", customerSchema);
