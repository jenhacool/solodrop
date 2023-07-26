const Router = require("koa-router");
const Koa = require("koa");
const _ = require("lodash");
const app = new Koa();
const router = new Router();

const morgan = require("koa-morgan");
app.use(morgan("dev"));

const bodyParser = require("koa-bodyparser");
const dotenv = require("dotenv");
const axios = require("axios");
const cors = require("@koa/cors");
const licenseKey = require('license-key-gen');
const crypto = require('crypto');
const mongoose = require("mongoose");
const User = require("./models/user.model");
const Shop = require("./models/shop.model");

app.use(bodyParser());
dotenv.config();

mongoose.connect(process.env.MONGODB_URL, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
}).then(() => {
  if (process.env.NODE_ENV !== "test") {
    console.log(
      "Connected to %s",
      "mongodb://127.0.0.1:27017/solodrop"
    );
  }
});

const port = parseInt(process.env.PORT, 10) || 8081;

router.get("/", (ctx) => {
  ctx.status = 200;
  ctx.body = "Hello World";
})

const fulfillOrder = async (id, license_key) => {
  try {
    console.log("fulfill order");

    let response3 = await axios({
      method: 'put',
      url: `https://solo-drop.myshopify.com/admin/api/2022-10/orders/${id}.json`,
      headers: {
        'X-Shopify-Access-Token': process.env.SOLODROP_API_SECRET
      },
      data: {
        "order": {
          "id": id,
          "note_attributes": [
            {
              "name": "license_key",
              "value": license_key,
            }
          ]
        }
      }
    });

    console.log("response3", response3)

    let response1 = await axios({
      method: 'get',
      url: `https://solo-drop.myshopify.com/admin/api/2022-10/orders/${id}/fulfillment_orders.json`,
      headers: { 
        'X-Shopify-Access-Token': process.env.SOLODROP_API_SECRET
      },
    });

    console.log('response1', response1);

    let fulfillment_order = response1.data.fulfillment_orders[0];

    let line_items_by_fulfillment_order = fulfillment_order.line_items.map((line_item) => {
      return {
        "fulfillment_order_id": line_item.fulfillment_order_id,
        "fulfillment_order_line_items": [
          {
            "id": line_item.id,
            "quantity": line_item.quantity
          }
        ]
      }
    });

    let fulfillment = {
      notify_customer: true,
      line_items_by_fulfillment_order
    }

    console.log('fulfillment', fulfillment);

    let response2 = await axios({
      method: 'post',
      url: 'https://solo-drop.myshopify.com/admin/api/2022-10/fulfillments.json',
      headers: { 
        'X-Shopify-Access-Token': process.env.SOLODROP_API_SECRET
      },
      data : {
        fulfillment
      }
    })

    console.log('response2', response2);
  } catch (err) {
    console.log(err);
  }
}

const generateLicenseKey = async (userInfo) => {
  try {
    console.log("userInfo", userInfo);

    let license_key = "";

    let licenseData = {
      info: userInfo, 
      prodCode: "LEN100120", 
      appVersion: "1.5", 
      osType: "IOS8"
    }

    let license = licenseKey.createLicense(licenseData);

    license_key = license.license;

    console.log("license_key", license_key);

    return license_key;
  } catch (err) {
    console.log(err);
    return "";
  }
}

router.post("/api/new_user",
  bodyParser(),
  async (ctx) => {
    console.log(ctx.request.headers);
    
    try {
      let shop = ctx.request.headers['x-shopify-shop-domain'];
      let hmac = ctx.request.headers['x-shopify-hmac-sha256'];
      let hash = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_KEY).update(ctx.request.rawBody, 'utf8', 'hex').digest('base64');

      // if (hmac != hash) {
      //   ctx.status = 200;
      //   ctx.body = {
      //     success: false,
      //   };
      //   return
      // }

      console.log("order data", ctx.request.body);

      let { id, email, source_name, line_items } = ctx.request.body;

      if (!line_items || line_items.length != 1) {
        ctx.status = 200;
        return;
      }

      let product = line_items[0];

      if (product.product_id != process.env.LIFETIME_PRODUCT_ID) {
        ctx.status = 200;
        return;
      }

      if (source_name == "subscription_contract") {
        ctx.status = 200;
        return;
      }

      let userInfo = {
        orderId: id,
        email
      };

      let license_key = await generateLicenseKey(userInfo)

      if (!license_key) {
        ctx.status = 200;
        return;
      }

      let user =  new User({
        info: userInfo,
        license_key,
        expire_at: 0
      })

      await user.save();

      await fulfillOrder(id, license_key);

      ctx.status = 200;
      ctx.body = {
        success: true,
      };
    } catch (error) {
      console.log(error);
      ctx.status = 200;
      ctx.body = {
        success: false,
      };
    }
  }
);

const shopify = axios.create({
  baseURL: `https://${process.env.SHOP}/admin/api/${process.env.SHOPIFY_API_VERSION}`,
  headers: { 
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
  },
  validateStatus: false
})

const recharge = axios.create({
  baseURL: process.env.RECHARGE_API_ENDPOINT,
  headers: {
    "X-Recharge-Access-Token": process.env.RECHARGE_API_ACCESS_TOKEN,
  },
  validateStatus: false
});

const findLicenseKey = async (subscription_id) => {
  try {
    let response = await recharge.get(`/orders?subscription_id=${subscription_id}`);

    let orders = response.data.orders;

    console.log(orders);

    if (!orders.length) {
      ctx.status = 200;
      return;
    }

    let firstOrder = orders.find((order) => {
      return order.type === "CHECKOUT"
    });

    console.log(firstOrder);

    if (!firstOrder) {
      return null;
    }

    let orderId = firstOrder.shopify_order_id;

    let shopifyResponse = await shopify.get(`/orders/${orderId}.json`);

    console.log("shopifyResponse", shopifyResponse)

    let order = shopifyResponse.data.order;

    let { note_attributes, status } = order;

    let find_licese_key = note_attributes.find((attr) => {
      return attr.name == "license_key";
    });

    console.log("find_licese_key", find_licese_key)

    if (!find_licese_key || !find_licese_key.value) {
      return null;
    }

    let license_key = find_licese_key.value;

    return license_key;
  } catch (error) {
    console.log(error);
    return null;
  }
}

router.post("/api/new_subscription",
  bodyParser(),
  async (ctx) => {
    try {
      console.log("new_subscription", ctx.request.body);

      let { subscription } = ctx.request.body;

      let { id, email } = subscription;

      let response = await recharge.get(`/orders?subscription_id=${id}`);

      let orders = response.data.orders;

      console.log(orders);

      if (!orders.length) {
        ctx.status = 200;
        return;
      }

      let firstOrder = orders.find((order) => {
        return order.type === "CHECKOUT"
      });

      console.log(firstOrder);

      if (!firstOrder) {
        ctx.status = 200;
        return;
      }

      let orderId = firstOrder.shopify_order_id;

      let userInfo = {
        orderId: orderId,
        email
      };

      console.log("userInfo", userInfo);

      let license_key = await generateLicenseKey(userInfo);

      if (!license_key) {
        ctx.status = 200;
        return;
      }

      let user =  new User({
        info: userInfo,
        license_key,
        expire_at: Math.floor(Date.now() / 1000) + (31 * 86400)
      })

      await user.save();

      await fulfillOrder(orderId, license_key);

      ctx.status = 200;
      ctx.body = {
        success: true,
      };
    } catch (error) {
      console.log(error);
      ctx.status = 200;
      ctx.body = {
        success: false,
      };
    }
  }
)

// router.post("/api/update_subscription",
//   bodyParser(),
//   async (ctx) => {
//     try {
//       console.log("update_subscription", ctx.request.body);

//       let { subscription } = ctx.request.body;

//       let { id } = subscription;

//       let license_key = await findLicenseKey(id);

//       if (!license_key) {
//         ctx.status = 200;
//         return;
//       }

//       let user = await User.findOne({ "license_key": license_key });

//       let { shop } = user;

//       await User.updateOne({ "license_key": license_key }, { expire_at: Math.floor(Date.now() / 1000) + (30 * 86400) })

//       if (shop) {
//         await Shop.updateOne({ shop }, { active: true });
//       }

//       ctx.status = 200;
//       ctx.body = {
//         success: true,
//       };
//     } catch (error) {
//       console.log(error);
//       ctx.status = 200;
//       ctx.body = {
//         success: false,
//       };
//     }
//   }
// )

router.post("/api/recharge_order_created",
  bodyParser(), 
  async (ctx) => {
    try {
      console.log("recharge_order_created", ctx.request.body);

      let { order } = ctx.request.body;

      let { type, status, line_items, shopify_order_id } = order;

      if (status != "SUCCESS" || type != "RECURRING" || !line_items) {
        ctx.status = 200;
      }

      let subscription_id = line_items[0].subscription_id;

      if (!subscription_id) {
        ctx.status = 200;
      }

      let license_key = await findLicenseKey(subscription_id);

      if (!license_key) {
        ctx.status = 200;
        return;
      }

      let user = await User.findOne({ "license_key": license_key });

      let { shop } = user;

      await User.updateOne({ "license_key": license_key }, { expire_at: Math.floor(Date.now() / 1000) + (31 * 86400) })

      if (shop) {
        await Shop.updateOne({ shop }, { active: true });
      }

      await fulfillOrder(shopify_order_id, license_key);

      ctx.status = 200;
      ctx.body = {
        success: true,
      };
    } catch (error) {
      console.log(error);
      ctx.status = 200;
      ctx.body = {
        success: false,
      };
    }
  }
);

router.post("/api/activate_license", cors(), bodyParser(), async (ctx) => {
  let { shop, license_key } = ctx.request.body;

  try {
    let user = await User.findOne({ license_key });
    if (!user) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: "Wrong license key"
      };
      return
    }
    let currentShop = user.shop;
    if (currentShop) {
      await Shop.findOneAndUpdate({ shop: currentShop }, { active: false });
    }
    user = await User.findOneAndUpdate({ license_key }, { shop }, {new: true});
    await Shop.deleteMany({ shop, active: false });
    await Shop.findOneAndUpdate({ shop }, { active: true }, { upsert: true, new: true, setDefaultsOnInsert: true });
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {
        userInfo: user
      }
    };
  } catch (error) {
    ctx.status = 400;
    ctx.body = {
      success: false,
    };
  }
});

router.post("/api/check_theme_license", cors(), bodyParser(), async (ctx) => {
  let { shop } = ctx.request.body;

  try {
    let shopData = await Shop.findOne({ shop });
    if (!shopData || !shopData.active) {
      ctx.status = 400;
      ctx.body = {
        success: false,
      };
      return;
    }
    let data = {
      "theme_license_valid": false,
      "theme_installed_version": ""
    }
    let user = await User.findOne({ shop });
    if (user ) {
      data.theme_license_valid = true;
    }
    if (shopData && shopData.detail.theme_installed && shopData.detail.theme_version) {
      data.theme_installed_version = shopData.detail.theme_version;
    }
    ctx.status = 200;
    ctx.body = {
      success: true,
      data
    };
  } catch (error) {
    console.log(error);
    ctx.status = 400;
    ctx.body = {
      success: false,
    };
  }
});

var CronJob = require("cron").CronJob;

var job = new CronJob("0 0 * * *", async function() {
	try {
    console.log("cron run");
		let timestamp = Math.round(Date.now() / 1000);
    let users = await User.find().sort("-createdAt").lean();
    users = _.uniqBy(users, "shop");
    users = users.filter((user) => {
      return user.expire_at > 0 && timestamp >= user.expire_at && user.shop;
    });
    // console.log("expire", users);
    await Promise.all(users.map(async (user) => {
      let { shop } = user;
      await Shop.updateOne({ shop }, { active: false });
    }));
  } catch(error) {
    console.log(error);
  }
}, null, true);

job.start();

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(port, () => {
	console.log(`> Ready on http://localhost:${port}`);
});