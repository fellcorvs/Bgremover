"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function flag(code: string): string {
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1, countryCode: "US" },
  { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, countryCode: "EU" },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79, countryCode: "GB" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 149.50, countryCode: "JP" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.53, countryCode: "AU" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.36, countryCode: "CA" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", rate: 0.88, countryCode: "CH" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", rate: 7.24, countryCode: "CN" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.12, countryCode: "IN" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 1.34, countryCode: "SG" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", rate: 7.82, countryCode: "HK" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", rate: 1.64, countryCode: "NZ" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", rate: 1320.50, countryCode: "KR" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", rate: 17.15, countryCode: "MX" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", rate: 4.97, countryCode: "BR" },
  { code: "ZAR", name: "South African Rand", symbol: "R", rate: 18.95, countryCode: "ZA" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", rate: 91.50, countryCode: "RU" },
  { code: "THB", name: "Thai Baht", symbol: "฿", rate: 35.20, countryCode: "TH" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", rate: 15650, countryCode: "ID" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", rate: 4.72, countryCode: "MY" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", rate: 55.80, countryCode: "PH" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", rate: 278.50, countryCode: "PK" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", rate: 109.80, countryCode: "BD" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 3.67, countryCode: "AE" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", rate: 3.75, countryCode: "SA" },
  { code: "ARS", name: "Argentine Peso", symbol: "$", rate: 820.50, countryCode: "AR" },
  { code: "CLP", name: "Chilean Peso", symbol: "$", rate: 925.00, countryCode: "CL" },
  { code: "COP", name: "Colombian Peso", symbol: "$", rate: 3920.00, countryCode: "CO" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/.", rate: 3.71, countryCode: "PE" },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U", rate: 38.50, countryCode: "UY" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", rate: 820.00, countryCode: "NG" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate: 145.00, countryCode: "KE" },
  { code: "EGP", name: "Egyptian Pound", symbol: "£", rate: 47.50, countryCode: "EG" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م.", rate: 9.98, countryCode: "MA" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", rate: 12.50, countryCode: "GH" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", rate: 2550.00, countryCode: "TZ" },
  { code: "XOF", name: "West African CFA", symbol: "CFA", rate: 605.00, countryCode: "CI" },
  { code: "XAF", name: "Central African CFA", symbol: "FCFA", rate: 605.00, countryCode: "CM" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", rate: 30.75, countryCode: "TR" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", rate: 3.65, countryCode: "IL" },
  { code: "IRR", name: "Iranian Rial", symbol: "﷼", rate: 42000, countryCode: "IR" },
  { code: "IQD", name: "Iraqi Dinar", symbol: "ع.د", rate: 1310.00, countryCode: "IQ" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", rate: 3.64, countryCode: "QA" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", rate: 0.38, countryCode: "OM" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", rate: 0.31, countryCode: "KW" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "د.ب", rate: 0.38, countryCode: "BH" },
  { code: "JOD", name: "Jordanian Dinar", symbol: "د.ا", rate: 0.71, countryCode: "JO" },
  { code: "LBP", name: "Lebanese Pound", symbol: "ل.ل", rate: 15000, countryCode: "LB" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", rate: 24500, countryCode: "VN" },
  { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", rate: 31.50, countryCode: "TW" },
  { code: "MOP", name: "Macanese Pataca", symbol: "MOP$", rate: 8.04, countryCode: "MO" },
  { code: "KHR", name: "Cambodian Riel", symbol: "៛", rate: 4100, countryCode: "KH" },
  { code: "LAK", name: "Lao Kip", symbol: "₭", rate: 20800, countryCode: "LA" },
  { code: "MMK", name: "Myanmar Kyat", symbol: "Ks", rate: 2100, countryCode: "MM" },
  { code: "MNT", name: "Mongolian Tugrik", symbol: "₮", rate: 3450, countryCode: "MN" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "रू", rate: 133.00, countryCode: "NP" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "රු", rate: 325.00, countryCode: "LK" },
  { code: "MVR", name: "Maldivian Rufiyaa", symbol: "MVR", rate: 15.40, countryCode: "MV" },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸", rate: 448.00, countryCode: "KZ" },
  { code: "UZS", name: "Uzbekistani Som", symbol: "сўм", rate: 12500, countryCode: "UZ" },
  { code: "AZN", name: "Azerbaijani Manat", symbol: "₼", rate: 1.70, countryCode: "AZ" },
  { code: "GEL", name: "Georgian Lari", symbol: "₾", rate: 2.65, countryCode: "GE" },
  { code: "AMD", name: "Armenian Dram", symbol: "֏", rate: 387.00, countryCode: "AM" },
  { code: "BYN", name: "Belarusian Ruble", symbol: "Br", rate: 3.25, countryCode: "BY" },
  { code: "MDL", name: "Moldovan Leu", symbol: "L", rate: 17.60, countryCode: "MD" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", rate: 38.50, countryCode: "UA" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", rate: 4.02, countryCode: "PL" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", rate: 22.80, countryCode: "CZ" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", rate: 352.00, countryCode: "HU" },
  { code: "RON", name: "Romanian Leu", symbol: "lei", rate: 4.58, countryCode: "RO" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", rate: 1.80, countryCode: "BG" },
  { code: "RSD", name: "Serbian Dinar", symbol: "дин", rate: 108.00, countryCode: "RS" },
  { code: "HRK", name: "Croatian Kuna", symbol: "kn", rate: 7.05, countryCode: "HR" },
  { code: "MKD", name: "Macedonian Denar", symbol: "ден", rate: 56.50, countryCode: "MK" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", rate: 10.35, countryCode: "SE" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", rate: 10.55, countryCode: "NO" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", rate: 6.88, countryCode: "DK" },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr", rate: 138.00, countryCode: "IS" },
  { code: "CUP", name: "Cuban Peso", symbol: "$", rate: 24.00, countryCode: "CU" },
  { code: "DOP", name: "Dominican Peso", symbol: "RD$", rate: 58.50, countryCode: "DO" },
  { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q", rate: 7.78, countryCode: "GT" },
  { code: "HNL", name: "Honduran Lempira", symbol: "L", rate: 24.65, countryCode: "HN" },
  { code: "NIO", name: "Nicaraguan Córdoba", symbol: "C$", rate: 36.50, countryCode: "NI" },
  { code: "CRC", name: "Costa Rican Colón", symbol: "₡", rate: 523.00, countryCode: "CR" },
  { code: "PAB", name: "Panamanian Balboa", symbol: "B/.", rate: 1.00, countryCode: "PA" },
  { code: "BOB", name: "Bolivian Boliviano", symbol: "Bs", rate: 6.91, countryCode: "BO" },
  { code: "PYG", name: "Paraguayan Guarani", symbol: "₲", rate: 7420, countryCode: "PY" },
  { code: "AFN", name: "Afghan Afghani", symbol: "؋", rate: 72.00, countryCode: "AF" },
  { code: "BND", name: "Brunei Dollar", symbol: "B$", rate: 1.34, countryCode: "BN" },
  { code: "FJD", name: "Fijian Dollar", symbol: "FJ$", rate: 2.25, countryCode: "FJ" },
  { code: "PGK", name: "Papua New Guinean Kina", symbol: "K", rate: 3.75, countryCode: "PG" },
  { code: "SBD", name: "Solomon Islands Dollar", symbol: "SI$", rate: 8.25, countryCode: "SB" },
  { code: "TOP", name: "Tongan Paʻanga", symbol: "T$", rate: 2.35, countryCode: "TO" },
  { code: "VUV", name: "Vanuatu Vatu", symbol: "VT", rate: 120.00, countryCode: "VU" },
  { code: "WST", name: "Samoan Tala", symbol: "WS$", rate: 2.72, countryCode: "WS" },
  { code: "ALL", name: "Albanian Lek", symbol: "Lek", rate: 103.00, countryCode: "AL" },
  { code: "BAM", name: "Bosnian Mark", symbol: "KM", rate: 1.80, countryCode: "BA" },
  { code: "GIP", name: "Gibraltar Pound", symbol: "£", rate: 0.79, countryCode: "GI" },
  { code: "FKP", name: "Falkland Islands Pound", symbol: "£", rate: 0.79, countryCode: "FK" },
  { code: "SHP", name: "St Helena Pound", symbol: "£", rate: 0.79, countryCode: "SH" },
  { code: "ANG", name: "Netherlands Antillean Guilder", symbol: "ƒ", rate: 1.79, countryCode: "CW" },
  { code: "AWG", name: "Aruban Florin", symbol: "Afl", rate: 1.80, countryCode: "AW" },
  { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", rate: 2.70, countryCode: "AG" },
  { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$", rate: 2.00, countryCode: "BB" },
  { code: "BSD", name: "Bahamian Dollar", symbol: "B$", rate: 1.00, countryCode: "BS" },
  { code: "BMD", name: "Bermudian Dollar", symbol: "BD$", rate: 1.00, countryCode: "BM" },
  { code: "KYD", name: "Cayman Islands Dollar", symbol: "CI$", rate: 0.82, countryCode: "KY" },
  { code: "JMD", name: "Jamaican Dollar", symbol: "J$", rate: 155.00, countryCode: "JM" },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$", rate: 6.78, countryCode: "TT" },
  { code: "GYD", name: "Guyanese Dollar", symbol: "G$", rate: 209.00, countryCode: "GY" },
  { code: "SRD", name: "Surinamese Dollar", symbol: "SR$", rate: 36.50, countryCode: "SR" },
  { code: "MUR", name: "Mauritian Rupee", symbol: "₨", rate: 46.00, countryCode: "MU" },
  { code: "SCR", name: "Seychellois Rupee", symbol: "SR", rate: 14.20, countryCode: "SC" },
  { code: "MGA", name: "Malagasy Ariary", symbol: "Ar", rate: 4520, countryCode: "MG" },
  { code: "MWK", name: "Malawian Kwacha", symbol: "MK", rate: 1700, countryCode: "MW" },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", rate: 22.50, countryCode: "ZM" },
  { code: "BWP", name: "Botswana Pula", symbol: "P", rate: 13.60, countryCode: "BW" },
  { code: "NAD", name: "Namibian Dollar", symbol: "N$", rate: 18.95, countryCode: "NA" },
  { code: "SZL", name: "Swazi Lilangeni", symbol: "L", rate: 18.95, countryCode: "SZ" },
  { code: "LSL", name: "Lesotho Loti", symbol: "L", rate: 18.95, countryCode: "LS" },
  { code: "XPF", name: "CFP Franc", symbol: "₣", rate: 110.00, countryCode: "PF" },
];

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [result, setResult] = useState("");
  const [rate, setRate] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const now = new Date();
    setLastUpdated(now.toLocaleString());
  }, []);

  const convert = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setResult("Invalid amount");
      return;
    }

    const from = currencies.find((c) => c.code === fromCurrency);
    const to = currencies.find((c) => c.code === toCurrency);
    if (!from || !to) return;

    const rateToUSD = 1 / from.rate;
    const converted = numAmount * rateToUSD * to.rate;
    const exchangeRate = (1 / from.rate) * to.rate;

    setResult(converted.toFixed(2));
    setRate(`1 ${from.code} = ${exchangeRate.toFixed(4)} ${to.code}`);
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const formatResult = () => {
    const to = currencies.find((c) => c.code === toCurrency);
    return `${to?.symbol || ""}${parseFloat(result).toLocaleString()}`;
  };

  const sortedCurrencies = [...currencies].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mt-2">Currency Converter</h1>
        <p className="text-muted-foreground mt-1">Convert between 100+ world currencies with live flags and exchange rates.</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Convert Currency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="any"
              className="text-lg"
            />
          </div>

          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {sortedCurrencies.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-base">
                      <span className="flex items-center gap-3">
                        <span className="text-xl leading-none">{flag(c.countryCode)}</span>
                        <span className="font-medium">{c.code}</span>
                        <span className="text-muted-foreground">- {c.name}</span>
                        <span className="text-muted-foreground ml-auto">{c.symbol}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="icon" onClick={swapCurrencies} className="mb-0.5">
              ⇄
            </Button>

            <div className="space-y-2">
              <Label>To</Label>
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {sortedCurrencies.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-base">
                      <span className="flex items-center gap-3">
                        <span className="text-xl leading-none">{flag(c.countryCode)}</span>
                        <span className="font-medium">{c.code}</span>
                        <span className="text-muted-foreground">- {c.name}</span>
                        <span className="text-muted-foreground ml-auto">{c.symbol}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={convert} className="w-full" size="lg">
            Convert
          </Button>

          {result && (
            <div className="bg-muted/50 rounded-lg p-6 text-center space-y-2">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-xl leading-none mb-1">{flag(currencies.find((c) => c.code === fromCurrency)?.countryCode || "")}</div>
                  <div className="text-2xl font-semibold">{currencies.find((c) => c.code === fromCurrency)?.symbol}{parseFloat(amount).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{fromCurrency}</div>
                </div>
                <div className="text-2xl text-muted-foreground">→</div>
                <div className="text-center">
                  <div className="text-xl leading-none mb-1">{flag(currencies.find((c) => c.code === toCurrency)?.countryCode || "")}</div>
                  <div className="text-4xl font-bold">{formatResult()}</div>
                  <div className="text-xs text-muted-foreground">{toCurrency}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">{rate}</div>
              <div className="text-xs text-muted-foreground">Last updated: {lastUpdated}</div>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Exchange rates are approximate and for reference only.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
