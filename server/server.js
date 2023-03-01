import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import Shopify, { ApiVersion, DataType } from "@shopify/shopify-api";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import Shop from "../models/shop.model";
import Setting from "../models/theme.model";
import Theme from "../models/theme.model";
import User from "../models/user.model";
import {
  storeCallback,
  loadCallback,
  deleteCallback,
} from "../utilities/redis-store";

const _ = require("lodash");
const mongoose = require("mongoose");
const bodyParser = require("koa-bodyparser");
const cors = require("@koa/cors");
const fs = require('fs');
const axios = require('axios');
dotenv.config();

mongoose
  .connect(process.env.MONGODB_URL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => {
    if (process.env.NODE_ENV !== "test") {
      console.log(
        "Connected to %s",
        "mongodb://127.0.0.1:27017/solodrop"
      );
    }
  });


const getSubscriptionUrl = require("./getSubscriptionUrl");
const getSubscriptionUrlDev = require("./getSubscriptionUrlDev");
const cancelSubscription = require("./cancelSubscription");
const path = require("path");
const serve = require("koa-static");
const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();
const morgan = require("koa-morgan");
const licenseKey = require('license-key-gen');
const crypto = require('crypto');

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES
    ? process.env.SCOPES.split(",")
    : "read_content,write_content,read_script_tags,write_script_tags,read_products,read_themes",
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
  API_VERSION: "2022-04",
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.CustomSessionStorage(
    storeCallback,
    loadCallback,
    deleteCallback
  ),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS = {};

if (process.env.NODE_ENV == "development") {
  ACTIVE_SHOPIFY_SHOPS["chienvu-store.myshopify.com"] = "access_token";
}

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  server.use(morgan("dev"));
  server.keys = [Shopify.Context.API_SECRET_KEY];
  server.use(
    createShopifyAuth({
      accessMode: "offline",
      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { shop, accessToken, scope } = ctx.state.shopify;
        const host = ctx.query.host;
        ACTIVE_SHOPIFY_SHOPS[shop] = scope;

        await Shop.findOneAndUpdate(
          { shop: shop },
          {
            shop: shop,
            token: accessToken,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Redirect to app with shop parameter upon auth
        ctx.redirect(`/?shop=${shop}&host=${host}`);
      },
    })
  );
  server.use((ctx, next) => {
    const shop = ctx.query.shop;
    if (Shopify.Context.IS_EMBEDDED_APP && shop) {
      ctx.set(
        "Content-Security-Policy",
        `frame-ancestors https://${shop} https://admin.shopify.com;`
      );
    } else {
      ctx.set("Content-Security-Policy", `frame-ancestors 'none';`);
    }
    return next();
  });
  const handleRequest = async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  };

  const verifyIfActiveShopifyShop = async (ctx, next) => {
    let { shop } = ctx.query;
    const shopData = await Shop.findOne({ shop });

    // This shop hasn't been seen yet, go through OAuth to create a session
    if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined || !shopData) {
      ctx.redirect(`/auth?shop=${shop}`);
      return;
    }

    return next();
  };

  router.get("/", verifyIfActiveShopifyShop, async (ctx) => {
    await handleRequest(ctx);
    return;
  });

  router.post("/webhooks", async (ctx) => {
    try {
      await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
    }
  });

  const verifyWebhook = (ctx) => {
    try {
      let shop = ctx.request.headers['x-shopify-shop-domain'];
      let hmac = ctx.request.headers['x-shopify-hmac-sha256'];
      let hash = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET)
        .update(ctx.request.rawBody, 'utf8', 'hex')
        .digest('base64');

      if (hash === hmac) {
        return true;
      }

      return false;
    } catch (error) {
      console.log(error);
      return false
    }
  }

  router.post("/webhooks/customers/redact", async (ctx) => {
    let verify = verifyWebhook(ctx);
    if (!verify) {
      ctx.status = 401;
      return;
    }

    ctx.status = 200;
  });

  router.post("/webhooks/shop/redact", async (ctx) => {
    let verify = verifyWebhook(ctx);
    if (!verify) {
      ctx.status = 401;
      return;
    }

    ctx.status = 200;
  });

  router.post("/webhooks/customers/data_request", async (ctx) => {
    let verify = verifyWebhook(ctx);
    if (!verify) {
      ctx.status = 401;
      return;
    }

    ctx.status = 200;
  });

  router.post(
    "/graphql",
    verifyRequest({ returnHeader: true }),
    async (ctx, next) => {
      await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
    }
  );

  const verifyAPI = async (ctx, next) => {
    if (process.env.NODE_ENV == "development") {
      return next();
    }
    return next();
    verifyRequest({ accessMode: "offline" });
  };

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

        let { id, email } = ctx.request.body;

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

        let license_key = license.license;

        let user =  new User({
          info: userInfo,
          license_key,
          expire_at: 0
        })

        await user.save();

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

  router.post("/api/new_subscription",
    bodyParser(),
    async (ctx) => {
      try {
        console.log(ctx.request.body);

        let { subscription } = ctx.request.body;

        let { email } = subscription;

        await User.updateOne({ "info.email": email }, { expire_at: Math.floor(Date.now() / 1000) + (30 * 86400) })

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

  router.post("/api/update_subscription",
    bodyParser(),
    async (ctx) => {
      try {
        console.log(ctx.request.body);

        let { subscription } = ctx.request.body;

        let { email } = subscription;

        let user = await User.findOne({ "info.email": email });

        let { shop } = user;

        await User.updateOne({ "info.email": email }, { expire_at: Math.floor(Date.now() / 1000) })

        if (shop) {
          await Shop.updateOne({ shop }, { active: true });
        }

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

  router.post("/api/get_shop",
    verifyRequest({ accessMode: "offline" }),
    bodyParser(), async (ctx) => {
    let { shop } = ctx.request.body;

    try {
      let shopData = await Shop.findOne({ shop });
      let theme_installed = true;
      let theme_deleted = true;
      if (theme_installed) {
        let client = new Shopify.Clients.Rest(shop, shopData.token);
        let themesResponse = await client.get({
          path: "themes",
          query: {
            fields: "id"
          }
        });
        let themeIds = themesResponse.body.themes.map((theme) => {
          return theme.id
        });
        // console.log(themeIds);
        let themeSettings = await Promise.all(themeIds.map(async (themeId) => {
          let themeSettingResponse = await axios({
            method: "get",
            url: `https://${shop}/admin/api/${process.env.SHOPIFY_API_VERSION}/themes/${themeId}/assets.json`,
            headers: { 
              'X-Shopify-Access-Token': shopData.token
            },
            params: {
              "asset[key]": "config/settings_schema.json"
            }
          });
          return JSON.parse(themeSettingResponse.data.asset.value);
        }));
        let themeAuthors = themeSettings.map((setting) => {
          let object = setting.find((s) => {
            return s.hasOwnProperty("theme_author");
          });
          return object.theme_author;
        });
        console.log(themeAuthors);
        let find = themeAuthors.find((author) => {
          return author == "Solodrop"
        });
        if (find) {
          let versions = [];
          themeAuthors.forEach((author, index) => {
            if (author == "Solodrop") {
              let settings = themeSettings[index];
              let object = settings.find((s) => {
                return s.hasOwnProperty("theme_version");
              });
              versions.push(object.theme_version);
            }
          })
          if (versions.length) {
            shopData.detail.theme_version = _.max(versions);
          }
          theme_deleted = false;
        }
      }
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: {
          shopData: shopData ? {...shopData.toObject(), detail: {theme_installed: true,theme_installing: false, theme_version: shopData.detail.theme_version}, theme_deleted} : {},
        },
      };
    } catch (error) {
      console.log(error);
      ctx.status = 400;
      ctx.body = {
        success: false,
      };
    }
  });

  router.post("/api/get_info", verifyRequest({ accessMode: "offline" }), bodyParser(), async (ctx) => {
    let { shop } = ctx.request.body;

    try {
      let userInfo = await User.findOne({ shop });
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: {
          userInfo,
        },
      };
    } catch (error) {
      console.log(error);
      ctx.status = 400;
      ctx.body = {
        success: false,
      };
    }
  });

  router.post("/api/check_theme", verifyRequest({ accessMode: "offline" }), bodyParser(), async (ctx) => {
    try {
      let theme = await Theme.findOne();
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: {
          version: theme.latestVersion,
        },
      };
    } catch (error) {
      console.log(error);
      ctx.status = 400;
      ctx.body = {
        success: false,
      };
    }
  });

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
      await Shop.updateOne({ shop }, { active: true });
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

  const installTheme = async (shop) => {
    try {
      let shopData = await Shop.findOne({ shop });
      if (!shopData) {
        return false;
      }
      let restClient = new Shopify.Clients.Rest(
        shopData.shop,
        shopData.token
      );
      let theme = await Theme.findOne();
      if (!theme) {
        return false;
      }
      let install = await restClient.post({
        path: "themes",
        data: {
          "theme": {
            "name": `Solodrop ${theme.latestVersion}`,
            "src": theme.url,
            "role": "unpublished"
          }
        },
        type: "application/json",
      });
      if (!install) {
        return false;
      }
      let newShop = await Shop.findOneAndUpdate({shop}, {detail: {
        theme_installed: true,
        theme_installing: true,
        theme_version: theme.latestVersion
      }});
      return newShop;
    } catch(error) {
      console.log(error);
      return false;
    }
  }

  router.post("/api/install_theme", verifyRequest({ accessMode: "offline" }), bodyParser(), async (ctx) => {
    let { shop } = ctx.request.body;

    let shopData = await installTheme(shop);

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {
        shopData
      },
    };
  });

  router.post("/api/update_theme", verifyRequest({ accessMode: "offline" }), async () => {
    let { shop } = ctx.request.body;

    await installTheme(shop);

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {},
    };
  });

  router.post("/api/check_theme_license", cors(), bodyParser(), async (ctx) => {
    console.log("here");
    let { shop } = ctx.request.body;

    console.log(ctx.request);

    console.log(ctx.request.body);

    try {
      let data = {
        "theme_license_valid": false,
        "theme_installed_version": ""
      }
      let user = await User.findOne({ shop });
      if (user ) {
        data.theme_license_valid = true;
      }
      let shopData = await Shop.findOne({ shop });
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

  router.get("(/_next/static/.*)", handleRequest); // Static content is clear
  router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear
  router.get("(.*)", verifyIfActiveShopifyShop, handleRequest);

  const staticDirPath = path.join(process.cwd(), "public");
  server.use(serve(staticDirPath));
  server.use(router.allowedMethods());
  server.use(router.routes());
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});

var CronJob = require("cron").CronJob;

var job = new CronJob("0 0 * * *", async function() {
	try {
		let timestamp = Math.round(Date.now() / 1000);
    let users = await User.find();
    users = users.filter((user) => {
      return user.expire_at > 0 && timestamp >= user.expire_at && user.shop;
    });
    await Promise.all(users.map(async (user) => {
      let { shop } = user;
      await Shop.updateOne({ shop }, { active: false });
    }));
  } catch(error) {
    console.log(error);
  }
}, null, true);

job.start();