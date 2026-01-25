/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as checkout from "../checkout.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as orders from "../orders.js";
import type * as payment from "../payment.js";
import type * as products from "../products.js";
import type * as seed from "../seed.js";
import type * as stock from "../stock.js";
import type * as stockHelpers from "../stockHelpers.js";
import type * as views from "../views.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  checkout: typeof checkout;
  crons: typeof crons;
  http: typeof http;
  orders: typeof orders;
  payment: typeof payment;
  products: typeof products;
  seed: typeof seed;
  stock: typeof stock;
  stockHelpers: typeof stockHelpers;
  views: typeof views;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
