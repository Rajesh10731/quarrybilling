import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert numbers into Indian Rupee words (e.g., 76309 -> "Rupees Seventy Six Thousand Three Hundred Nine Only")
export function numberToWords(num: number): string {
  if (isNaN(num) || num <= 0) return "Rupees Zero Only";

  const single = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return single[n];
    const tensDigit = Math.floor(n / 10);
    const unitDigit = n % 10;
    return `${tens[tensDigit]}${unitDigit ? " " + single[unitDigit] : ""}`;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let str = "";
    if (hundred > 0) {
      str += `${single[hundred]} Hundred`;
    }
    if (remainder > 0) {
      if (str !== "") str += " ";
      str += convertTwoDigits(remainder);
    }
    return str;
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let words = "";

  const crore = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crore > 0) {
    words += `${convertTwoDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigits(thousand)} Thousand `;
  }
  if (rem > 0) {
    words += `${convertThreeDigits(rem)} `;
  }

  words = words.trim();
  let result = words ? `Rupees ${words}` : "Rupees Zero";

  if (decimalPart > 0) {
    result += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }

  result += " Only";
  return result;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
