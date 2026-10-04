const digits = (p: string) => p.replace(/[^\d]/g, '');

export const telUrl = (phone: string) => `tel:${phone}`;

/** 10-digit Indian numbers get the 91 country code; numbers that already have one are left alone. */
export const whatsappUrl = (phone: string) => {
  const d = digits(phone);
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}`;
};
