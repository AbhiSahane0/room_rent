import { Linking } from 'react-native';

const digits = (p: string) => p.replace(/[^\d]/g, '');

export const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);

/** 10-digit Indian numbers get the 91 country code; numbers with a country code are left alone. */
export const openWhatsApp = (phone: string) => {
  const d = digits(phone);
  const full = d.length === 10 ? `91${d}` : d;
  return Linking.openURL(`https://wa.me/${full}`);
};
