import { toBrasiliaDateKey } from "../../../lib/brasiliaTime";
import { calcTotal, type AdminOrder } from "../AdminShell";

const calcDiscount = (order: AdminOrder) => Number(order.discount_amount || 0);

export type FaturamentoAnalytics = {
  totalRevenue: number;
  ticketMedio: number;
  todayRevenue: number;
  totalDiscount: number;
  orderCount: number;
  uniqueCustomers: number;
  revenueByDay: Record<string, number>;
  paymentTotals: Record<string, number>;
  couponTotals: Record<string, number>;
  topItems: { name: string; quantity: number; revenue: number }[];
  topCustomers: { phone: string; name: string; orders: number; revenue: number }[];
};

export function buildFaturamentoAnalytics(orders: AdminOrder[]): FaturamentoAnalytics {
  const totalRevenue = orders.reduce((sum, order) => sum + calcTotal(order), 0);
  const orderCount = orders.length;
  const ticketMedio = orderCount > 0 ? totalRevenue / orderCount : 0;
  const todayKey = toBrasiliaDateKey(new Date());
  const todayRevenue = orders
    .filter((order) => toBrasiliaDateKey(order.created_at) === todayKey)
    .reduce((sum, order) => sum + calcTotal(order), 0);
  const totalDiscount = orders.reduce((sum, order) => sum + calcDiscount(order), 0);

  const revenueByDay = orders.reduce((acc, order) => {
    const day = toBrasiliaDateKey(order.created_at);
    acc[day] = (acc[day] || 0) + calcTotal(order);
    return acc;
  }, {} as Record<string, number>);

  const paymentTotals = orders.reduce((acc, order) => {
    const payment = order.payment_method || "outros";
    acc[payment] = (acc[payment] || 0) + calcTotal(order);
    return acc;
  }, {} as Record<string, number>);

  const couponTotals = orders.reduce((acc, order) => {
    if (!order.coupon_code) return acc;
    acc[order.coupon_code] = (acc[order.coupon_code] || 0) + calcDiscount(order);
    return acc;
  }, {} as Record<string, number>);

  const topItems = Array.from(
    orders
      .flatMap((order) => order.items || [])
      .reduce((acc, item) => {
        const current = acc.get(item.name) || { quantity: 0, revenue: 0 };
        const quantity = item.quantity ?? 1;
        current.quantity += quantity;
        current.revenue += Number(item.price || 0) * quantity;
        acc.set(item.name, current);
        return acc;
      }, new Map<string, { quantity: number; revenue: number }>())
      .entries()
  )
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5);

  const topCustomers = Array.from(
    orders
      .reduce((acc, order) => {
        const phone = (order.phone || "Sem telefone").trim();
        const name = order.name || "Cliente";
        const current = acc.get(phone) || { name, orders: 0, revenue: 0 };
        current.orders += 1;
        current.revenue += calcTotal(order);
        acc.set(phone, current);
        return acc;
      }, new Map<string, { name: string; orders: number; revenue: number }>())
      .entries()
  )
    .map(([phone, value]) => ({ phone, ...value }))
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
    .slice(0, 5);

  const uniqueCustomers = new Set(
    orders.map((order) => (order.phone || "Sem telefone").trim())
  ).size;

  return {
    totalRevenue,
    ticketMedio,
    todayRevenue,
    totalDiscount,
    orderCount,
    uniqueCustomers,
    revenueByDay,
    paymentTotals,
    couponTotals,
    topItems,
    topCustomers,
  };
}
