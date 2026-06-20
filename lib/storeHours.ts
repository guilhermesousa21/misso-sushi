export type BusinessDay = {
  label: string;
  open: string;
  close: string;
};

export type BusinessHours = Record<number, BusinessDay>;

export const weeklyBusinessHours: BusinessHours = {
  0: { label: "domingo", open: "12:00", close: "23:00" },
  1: { label: "segunda-feira", open: "12:00", close: "23:00" },
  2: { label: "terca-feira", open: "12:00", close: "23:00" },
  3: { label: "quarta-feira", open: "12:00", close: "23:00" },
  4: { label: "quinta-feira", open: "12:00", close: "23:00" },
  5: { label: "sexta-feira", open: "12:00", close: "00:00" },
  6: { label: "sabado", open: "12:00", close: "00:00" },
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export const getBusinessHours = (value?: unknown): BusinessHours => {
  if (!value || typeof value !== "object") return weeklyBusinessHours;

  const source = value as Record<string, Partial<BusinessDay>>;
  return Object.fromEntries(
    Object.entries(weeklyBusinessHours).map(([day, fallback]) => {
      const saved = source[day];
      return [
        Number(day),
        {
          label: saved?.label || fallback.label,
          open: saved?.open || fallback.open,
          close: saved?.close || fallback.close,
        },
      ];
    })
  ) as BusinessHours;
};

export const isWithinBusinessHours = (
  date = new Date(),
  businessHours: BusinessHours = weeklyBusinessHours
) => {
  const today = businessHours[date.getDay()];
  const yesterday = businessHours[(date.getDay() + 6) % 7];
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  const todayOpen = timeToMinutes(today.open);
  const todayClose = timeToMinutes(today.close);
  const todayCloseAdjusted = todayClose <= todayOpen ? todayClose + 24 * 60 : todayClose;
  const currentAdjusted =
    todayClose <= todayOpen && currentMinutes < todayOpen
      ? currentMinutes + 24 * 60
      : currentMinutes;

  if (currentAdjusted >= todayOpen && currentAdjusted < todayCloseAdjusted) {
    return true;
  }

  const yesterdayOpen = timeToMinutes(yesterday.open);
  const yesterdayClose = timeToMinutes(yesterday.close);
  if (yesterdayClose <= yesterdayOpen) {
    return currentMinutes < yesterdayClose;
  }

  return false;
};

export const formatWeeklyBusinessHours = (
  businessHours: BusinessHours = weeklyBusinessHours
) =>
  [2, 3, 4, 5, 6, 0, 1]
    .map((day) => {
      const hours = businessHours[day];
      return `${hours.label}: ${hours.open}-${hours.close}`;
    })
    .join("\n");

export const getTodayBusinessHoursLabel = (
  date = new Date(),
  businessHours: BusinessHours = weeklyBusinessHours
) => {
  const today = businessHours[date.getDay()];
  return `${today.label}: ${today.open}-${today.close}`;
};

export const isStoreAcceptingOrders = (
  manuallyOpen: boolean,
  date = new Date(),
  businessHours: BusinessHours = weeklyBusinessHours
) => manuallyOpen && isWithinBusinessHours(date, businessHours);

export const getNextOpeningLabel = (
  date = new Date(),
  businessHours: BusinessHours = weeklyBusinessHours
) => {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  for (let offset = 0; offset < 7; offset += 1) {
    const day = (date.getDay() + offset) % 7;
    const hours = businessHours[day];
    const openMinutes = timeToMinutes(hours.open);

    if (offset === 0 && currentMinutes < openMinutes) {
      return `abre hoje as ${hours.open}`;
    }

    if (offset > 0) {
      return `abre ${hours.label} as ${hours.open}`;
    }
  }

  return "abre em breve";
};
