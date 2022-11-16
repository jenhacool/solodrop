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

  router.post("/webhooks/customers/redact", async (ctx) => {
    ctx.status = 200;
  });

  router.post("/webhooks/shop/redact", async (ctx) => {
    ctx.status = 200;
  });

  router.post("/webhooks/customers/data_request", async (ctx) => {
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
    // verifyAPI,
    async (ctx) => {
      // let shop = ctx.request.headers['x-shopify-shop-domain'];
      // compare hmac to our own hash
      // let hmac = ctx.request.headers['x-shopify-hmac-sha256'];
      // let hash = crypto.createHmac('sha256', process.env.SHOPIFY_APP_SECRET).update(ctx.request.rawBody, 'utf8', 'hex').digest('base64');

      let { email } = ctx.request.body;
      
      try {
        // if (ctx.request.hostname == process.env.IP_ADDRESS) {
          let response = await axios.post("", {}, {
            headers: {
              "accept": "application/json",
              "revision": "2022-10-17",
              "content-type": "application/json",
              "Authorization": "pk_ef64b4b1f554e49c6016394c81ea56846d"
            }
          })
          const userInfo = await new User(body);
          userInfo.save();

          ctx.status = 200;
          ctx.body = {
            success: true,
          };
          return;
        // }

        ctx.status = 400;
        ctx.body = {
          success: false,
        };
      } catch (error) {
        ctx.status = 400;
        ctx.body = {
          success: false,
        };
      }
    }
  );

  router.post("/api/get_shop", verifyAPI, bodyParser(), async (ctx) => {
    let { shop } = ctx.request.body;

    try {
      let shopData = await Shop.findOne({ shop });
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: {
          shopData: shopData ? shopData : {},
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

  router.post("/api/get_info", verifyAPI, bodyParser(), async (ctx) => {
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

  router.post("/api/check_theme", verifyAPI, bodyParser(), async (ctx) => {
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

  router.post("/api/activate_license", verifyAPI, bodyParser(), async (ctx) => {
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
        console.log("here 1");
        return false;
      }
      let restClient = new Shopify.Clients.Rest(
        shopData.shop,
        shopData.token
      );
      let theme = await Theme.findOne();
      if (!theme) {
        console.log("here 2");
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
      console.log(install);
      if (!install) {
        return false;
      }
      await Shop.updateOne({shop}, {detail: {
        theme_installed: true,
        theme_installing: true,
        theme_version: theme.latestVersion
      }})
      let graphQL = new Shopify.Clients.Graphql(shopData.shop, shopData.token);
      let appInstallation = await graphQL.query({
        data: {
          query: `{
            appInstallation {
              id
            } 
          }`
        }
      });
      let appId = appInstallation?.body?.data?.appInstallation?.id
      const queryWithVariables = {
        query: `
          mutation CreateAppOwnedMetafield($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                namespace
                key
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          metafields: [
						{
							key: 'test_key',
							namespace: 'solodrop',
							ownerId: appId,
							type: 'single_line_text_field',
							value: 'test_value',
						},
					],
        },
      };
      let metafield = await graphQL.query({
        data: queryWithVariables
      })
      console.log(metafield.body.data.metafieldsSet);
      return true;
      // Call Shopify API to install theme
      // Call Shopify API to add metafields
    } catch(error) {
      console.log(error);
      return false;
    }
  }

  router.post("/api/install_theme", bodyParser(), async (ctx) => {
    let { shop } = ctx.request.body;

    let success = await installTheme(shop);

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {

      },
    };
  });

  router.post("/api/update_theme", async () => {

  });

  router.post("/api/settings/save",
    bodyParser(),
    verifyAPI,
    async (ctx) => {
      let { shop, settings } = ctx.request.body;

      try {
        await Setting.findOneAndUpdate({ shop }, { settings }, { new: true, upsert: true });
        ctx.status = 200;
        ctx.body = {
          success: true,
          data: {
            settings,
          },
        };
      } catch (error) {
        console.log(error);
        ctx.status = 400;
        ctx.body = {
          success: false,
        };
      }
    }
  );

  router.put(
    "/api/settings/:id",
    bodyParser(),
    verifyRequest({ accessMode: "offline" }),
    async (ctx) => {
      let { shop, config } = ctx.request.body;
      let { id } = ctx.params;

      try {
        let settings = await Setting.findByIdAndUpdate(
          id,
          { $set: { config: config } },
          { new: true }
        );
        ctx.status = 200;
        ctx.body = {
          success: true,
          data: {
            settings,
          },
        };
      } catch (error) {
        console.log(error);
        ctx.status = 400;
        ctx.body = {
          success: false,
        };
      }
    }
  );

  router.delete(
    "/api/setting-product/:id",
    bodyParser(),
    verifyRequest({ accessMode: "offline" }),
    async (ctx) => {
      let { shop } = ctx.request.body;
      let { id } = ctx.params;

      try {
        await Setting.deleteOne({ _id: id });
        ctx.status = 200;
        ctx.body = {
          success: true,
        };
      } catch (error) {
        console.log(error);
        ctx.status = 400;
        ctx.body = {
          success: false,
        };
      }
    }
  );

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
