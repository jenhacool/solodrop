const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("./models/user.model");
const Shop = require("./models/shop.model");
const _ = require("lodash");

dotenv.config();

mongoose.connect(process.env.MONGODB_URL, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
}).then(async () => {
  if (process.env.NODE_ENV !== "test") {
    console.log(
      "Connected to %s",
      "mongodb://127.0.0.1:27017/solodrop"
    );
  }
  let users = await User.find({
    shop: "tien-store-theme-2.myshopify.com"
  }).sort("-createdAt").lean();
  users = _.uniqBy(users, "shop");
  console.log(users);
});