import { useEffect, useRef, useState } from 'react'

/**
 * Subscribes to a Binance combined mini-ticker stream for BTC, ETH, SOL
 * and polls EUR/USD every 60s from a free exchange rate API.
 *
 * Returns:
 * {
 *   BTC: { price, change, changePercent, isPositive },
 *   ETH: { price, change, changePercent, isPositive },
 *   SOL: { price, change, changePercent, isPositive },
 *   EURUSD: { price, isPositive },
 * }
 */
const DEFAULT_PRICES = {
    BTC: { price: null, changePercent: 0, isPositive: true },
    ETH: { price: null, changePercent: 0, isPositive: true },
    SOL: { price: null, changePercent: 0, isPositive: true },
    EURUSD: { price: null, isPositive: true },
}

const SYMBOL_MAP = {
    'btcusdt': 'BTC',
    'ethusdt': 'ETH',
    'solusdt': 'SOL',
}

let wsInstance = null
let listeners = 0
let sharedPrices = { ...DEFAULT_PRICES }
let subscribers = new Set()

function notify() {
    subscribers.forEach(fn => fn({ ...sharedPrices }))
}

function connectWS() {
    if (wsInstance) return
    const url = 'wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker'
    wsInstance = new WebSocket(url)

    wsInstance.onmessage = (event) => {
        const { stream, data } = JSON.parse(event.data)
        const symbolKey = stream.split('@')[0]
        const key = SYMBOL_MAP[symbolKey]
        if (!key) return

        const price = parseFloat(data.c)
        const changePercent = parseFloat(data.P)

        sharedPrices = {
            ...sharedPrices,
            [key]: {
                price,
                changePercent,
                isPositive: changePercent >= 0,
            }
        }
        notify()
    }

    wsInstance.onerror = () => {
        wsInstance = null
        // Reconnect after 3s on error
        setTimeout(() => { if (listeners > 0) connectWS() }, 3000)
    }

    wsInstance.onclose = () => {
        wsInstance = null
        setTimeout(() => { if (listeners > 0) connectWS() }, 3000)
    }
}

function disconnectWS() {
    if (wsInstance) {
        wsInstance.close()
        wsInstance = null
    }
}

async function fetchForex() {
    try {
        // Free, no API key required
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR')
        const json = await res.json()
        const rate = json.rates?.USD
        if (rate) {
            sharedPrices = {
                ...sharedPrices,
                EURUSD: { price: rate, isPositive: rate >= 1.0 }
            }
            notify()
        }
    } catch (e) {
        console.warn('Forex fetch failed', e)
    }
}

export function useLivePrices() {
    const [prices, setPrices] = useState(sharedPrices)
    const forexTimer = useRef(null)

    useEffect(() => {
        // Subscribe to shared state
        const handler = (p) => setPrices(p)
        subscribers.add(handler)
        listeners++

        if (listeners === 1) {
            connectWS()
            fetchForex()
            forexTimer.current = setInterval(fetchForex, 60_000)
        }

        return () => {
            subscribers.delete(handler)
            listeners--
            if (listeners === 0) {
                disconnectWS()
                clearInterval(forexTimer.current)
            }
        }
    }, [])

    return prices
}

/**
 * Formats a raw price number into a display string.
 * e.g. 84321.56 -> "$84,321.56"
 */
export function formatPrice(value, decimals = 2) {
    if (value === null || value === undefined) return '...'
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}
