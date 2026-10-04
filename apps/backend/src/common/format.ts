/** Indian digit grouping, e.g. 150000 -> "₹1,50,000". Shared by PDFs and server-side messages. */
export function formatINR(value: number, opts: { decimals?: boolean } = {}): string {
  const neg = value < 0;
  const abs = Math.abs(value);
  const hasPaise = Math.round(abs * 100) % 100 !== 0;
  const [int, dec] = abs.toFixed(opts.decimals || hasPaise ? 2 : 0).split('.');
  const grouped = int.length <= 3 ? int : int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + int.slice(-3);
  return `${neg ? '-' : ''}₹${grouped}${dec ? `.${dec}` : ''}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDate = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
