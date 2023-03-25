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

router.post("/api/new_user",
  bodyParser(),
  async (ctx) => {
    console.log(ctx.request.headers);
    
    try {
      let shop = ctx.request.headers['x-shopify-shop-domain'];
      let hmac = ctx.request.headers['x-shopify-hmac-sha256'];
      let hash = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_KEY).update(ctx.request.rawBody, 'utf8', 'hex').digest('base64');

      if (hmac != hash) {
        ctx.status = 200;
        ctx.body = {
          success: false,
        };
        return
      }

      console.log("order data", ctx.request.body);

      let { id, email, source_name } = ctx.request.body;

      console.log("source_name", source_name);

      let license_key = "";

      if (source_name == "subscription_contract") {
        let user = await User.findOne({ "info.email": email });

        license_key = user.license_key

        let { shop } = user;

        await User.updateOne({ "info.email": email }, { expire_at: Math.floor(Date.now() / 1000) + (30 * 86400) })

        if (shop) {
          await Shop.updateOne({ shop }, { active: true });
        }

        console.log("here new")
      } else {
        let userInfo = {
          orderId: id,
          email
        };

        let licenseData = {
          info: userInfo, 
          prodCode: "LEN100120", 
          appVersion: "1.5", 
          osType: "IOS8"
        }

        let license = licenseKey.createLicense(licenseData);

        license_key = license.license;

        let user =  new User({
          info: userInfo,
          license_key,
          expire_at: 0
        })

        await user.save();
      }

      console.log("fulfill order");

      let accessToken = process.env.SOLODROP_API_SECRET

      let client = new Shopify.Clients.Rest(shop, accessToken);

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

      console.log(id);

      console.log(JSON.stringify(response3.data.order.note_attributes));

      let response1 = await axios({
        method: 'get',
        url: `https://solo-drop.myshopify.com/admin/api/2022-10/orders/${id}/fulfillment_orders.json`,
        headers: { 
          'X-Shopify-Access-Token': process.env.SOLODROP_API_SECRET
        },
      });

      // console.log('response1', response1);

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

      // console.log('fulfillment', fulfillment);

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

      // console.log('response2', response2);

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

router.post("/api/recharge_order_created",
  bodyParser(), 
  async (ctx) => {
    try {
      console.log("recharge_order_created", ctx.request.body);

      let { order } = ctx.request.body;

      let { note_attributes, status } = order;

      if (status != "SUCCESS") {
        ctx.status = 200;
        ctx.body = {
          success: false,
        };
      }

      let find_licese_key = note_attributes.find((attr) => {
        return attr.name == "license_key";
      });

      if (!find_licese_key || !find_licese_key.value) {
        ctx.status = 200;
        ctx.body = {
          success: true,
        };
        return;
      }

      let license_key = find_licese_key.value;

      await User.updateOne({ "license_key": license_key }, { expire_at: Math.floor(Date.now() / 1000) + (30 * 86400) });

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
    if (user.shop != "") {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: "License key activated for other store"
      };
      return;
    }
    user = await User.findOneAndUpdate({ license_key }, { shop }, {new: true});
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
  console.log("here");
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

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(port, () => {
	console.log(`> Ready on http://localhost:${port}`);
});