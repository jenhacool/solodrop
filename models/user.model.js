const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    shop: {
      type: "String",
      required: true,
    },
    info: {
      type: "Object",
      required: true,
      default: {},
    },
    license_key: {
      type: "Object",
      required: true,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
