import { onRequestPost as __api_admin_categories_reorder_ts_onRequestPost } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\categories\\reorder.ts"
import { onRequestPost as __api_admin_items_reorder_ts_onRequestPost } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\items\\reorder.ts"
import { onRequestDelete as __api_admin_categories__id__ts_onRequestDelete } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\categories\\[id].ts"
import { onRequestPut as __api_admin_categories__id__ts_onRequestPut } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\categories\\[id].ts"
import { onRequestDelete as __api_admin_items__id__ts_onRequestDelete } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\items\\[id].ts"
import { onRequestPut as __api_admin_items__id__ts_onRequestPut } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\items\\[id].ts"
import { onRequestGet as __api_admin_categories_index_ts_onRequestGet } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\categories\\index.ts"
import { onRequestPost as __api_admin_categories_index_ts_onRequestPost } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\categories\\index.ts"
import { onRequestGet as __api_admin_items_index_ts_onRequestGet } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\items\\index.ts"
import { onRequestPost as __api_admin_items_index_ts_onRequestPost } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\items\\index.ts"
import { onRequestPost as __api_admin_upload_ts_onRequestPost } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\admin\\upload.ts"
import { onRequestGet as __api_images__key__ts_onRequestGet } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\images\\[key].ts"
import { onRequestGet as __api_menu_ts_onRequestGet } from "C:\\Users\\DC\\Documents\\alive_bistro\\functions\\api\\menu.ts"

export const routes = [
    {
      routePath: "/api/admin/categories/reorder",
      mountPath: "/api/admin/categories",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_categories_reorder_ts_onRequestPost],
    },
  {
      routePath: "/api/admin/items/reorder",
      mountPath: "/api/admin/items",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_items_reorder_ts_onRequestPost],
    },
  {
      routePath: "/api/admin/categories/:id",
      mountPath: "/api/admin/categories",
      method: "DELETE",
      middlewares: [],
      modules: [__api_admin_categories__id__ts_onRequestDelete],
    },
  {
      routePath: "/api/admin/categories/:id",
      mountPath: "/api/admin/categories",
      method: "PUT",
      middlewares: [],
      modules: [__api_admin_categories__id__ts_onRequestPut],
    },
  {
      routePath: "/api/admin/items/:id",
      mountPath: "/api/admin/items",
      method: "DELETE",
      middlewares: [],
      modules: [__api_admin_items__id__ts_onRequestDelete],
    },
  {
      routePath: "/api/admin/items/:id",
      mountPath: "/api/admin/items",
      method: "PUT",
      middlewares: [],
      modules: [__api_admin_items__id__ts_onRequestPut],
    },
  {
      routePath: "/api/admin/categories",
      mountPath: "/api/admin/categories",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_categories_index_ts_onRequestGet],
    },
  {
      routePath: "/api/admin/categories",
      mountPath: "/api/admin/categories",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_categories_index_ts_onRequestPost],
    },
  {
      routePath: "/api/admin/items",
      mountPath: "/api/admin/items",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_items_index_ts_onRequestGet],
    },
  {
      routePath: "/api/admin/items",
      mountPath: "/api/admin/items",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_items_index_ts_onRequestPost],
    },
  {
      routePath: "/api/admin/upload",
      mountPath: "/api/admin",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_upload_ts_onRequestPost],
    },
  {
      routePath: "/api/images/:key",
      mountPath: "/api/images",
      method: "GET",
      middlewares: [],
      modules: [__api_images__key__ts_onRequestGet],
    },
  {
      routePath: "/api/menu",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_menu_ts_onRequestGet],
    },
  ]