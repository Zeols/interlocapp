"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type CurrencyType = "NIO" | "USD";

interface CurrencyContextValue {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  exchangeRate: number; // Tasa oficial BCN de conversión (1 USD = 36.62 NIO)
  formatPrice: (amountInNIO: number) => string;
  convertPrice: (amountInNIO: number) => number;
  symbol: string;
}

const EXCHANGE_RATE_USD_NIO = 36.62;

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyType>("NIO");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("interlocapp_currency") as CurrencyType;
      if (saved === "NIO" || saved === "USD") {
        setCurrencyState(saved);
      }
    }
  }, []);

  const setCurrency = (newCurrency: CurrencyType) => {
    setCurrencyState(newCurrency);
    if (typeof window !== "undefined") {
      localStorage.setItem("interlocapp_currency", newCurrency);
      document.cookie = `interlocapp_currency=${newCurrency}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(
        new CustomEvent("currency-changed", { detail: { currency: newCurrency } })
      );
    }
  };

  const convertPrice = (amountInNIO: number): number => {
    const num = Number(amountInNIO) || 0;
    if (currency === "USD") {
      return Number((num / EXCHANGE_RATE_USD_NIO).toFixed(2));
    }
    return Number(num.toFixed(2));
  };

  const formatPrice = (amountInNIO: number): string => {
    const num = Number(amountInNIO) || 0;
    if (currency === "USD") {
      const usdVal = num / EXCHANGE_RATE_USD_NIO;
      return `$ ${usdVal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `C$ ${num.toLocaleString("es-NI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const symbol = currency === "USD" ? "$" : "C$";

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        exchangeRate: EXCHANGE_RATE_USD_NIO,
        formatPrice,
        convertPrice,
        symbol,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    return {
      currency: "NIO" as CurrencyType,
      setCurrency: () => {},
      exchangeRate: EXCHANGE_RATE_USD_NIO,
      formatPrice: (amount: number) => `C$ ${Number(amount || 0).toFixed(2)}`,
      convertPrice: (amount: number) => Number(amount || 0),
      symbol: "C$",
    };
  }
  return context;
}
