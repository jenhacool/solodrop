const mongoose = require("mongoose");

const ThemeSchema = mongoose.Schema(
  {
    latesVersion: {
      type: "String",
      required: false,
    },
    url: {
      type: "String",
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Theme", ThemeSchema);
