export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const normalizeCustomerPhone = (value?: string | null) => {
  const digits = onlyDigits(value || "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

export const formatCustomerPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const isValidCustomerPhone = (value: string) => {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
};

export const phoneLookupKeys = (value?: string | null) => {
  const digits = onlyDigits(value || "");
  if (!digits) return [] as string[];

  const keys = new Set<string>([digits, formatCustomerPhone(digits)]);
  if (digits.length === 10 || digits.length === 11) {
    keys.add(formatCustomerPhone(digits));
    keys.add(normalizeCustomerPhone(digits));
  }
  if (digits.startsWith("55") && digits.length >= 12) {
    keys.add(digits.slice(2));
    keys.add(formatCustomerPhone(digits.slice(2)));
  }

  return Array.from(keys).filter(Boolean);
};
