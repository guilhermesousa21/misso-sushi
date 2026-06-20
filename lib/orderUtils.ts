import type { MenuItem } from "../types";

export const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const isItemOrderable = (item?: MenuItem) =>
  Boolean(item) &&
  item?.active !== false &&
  item?.available !== false &&
  item?.unavailable !== true &&
  item?.availability_status !== "inativo" &&
  item?.availability_status !== "esgotado" &&
  (item?.stock_quantity === null ||
    item?.stock_quantity === undefined ||
    Number(item.stock_quantity) > 0);
