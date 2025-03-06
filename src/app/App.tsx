import React, { useEffect, useState } from 'react'
import './App.css'
import { getLiquidityPositionStats } from '../libs/stats'
import { getProvider } from '../libs/provider'
import {
  formatBaseCurrencyPrice,
  formatCurrencyAmountsWithQuote,
  toQuoteCurrencyAmount,
} from '../libs/util/uniswap'
import { LiquidityPositionStats } from '../libs/types'
import { CurrencyAmount, Fraction, Token } from '@uniswap/sdk-core'
import { CHAINS, DEFAULT_CHAIN } from '../libs/config'

/* eslint-disable */
const App = () => {
  const [positionId, setPositionId] = useState<string>('1628115')
  const [stats, setStats] = useState<LiquidityPositionStats | null>(null)
  const [statsText, setStatsText] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedChain, setSelectedChain] = useState<string>(DEFAULT_CHAIN)

  useEffect(() => {
    if (stats === null) {
      setStatsText([])
      return
    }

    const aprFormatted = (() => {
      const apr = stats.yieldPerDay.map((v, i) => {
        try {
          // Check if deposit is zero or extremely small to avoid division by zero
          if (stats.deposited[i].equalTo(CurrencyAmount.fromRawAmount(stats.deposited[i].currency, 0)) || 
              stats.deposited[i].lessThan(CurrencyAmount.fromRawAmount(stats.deposited[i].currency, 1))) {
            console.log(`UI: Skipping APR calculation for zero or near-zero deposit at index ${i}`);
            return {
              value: new Fraction(0, 1),
              currency: v.currency,
            };
          }
          
          return {
            value: v.divide(stats.deposited[i]).multiply(365).asFraction,
            currency: v.currency,
          };
        } catch (error) {
          console.error(`UI: Error calculating APR at index ${i}:`, error);
          return {
            value: new Fraction(0, 1),
            currency: v.currency,
          };
        }
      })

      const yieldPerDayQuoteAmount = toQuoteCurrencyAmount(
        stats.yieldPerDay,
        stats.avgYieldPrice
      )
      const depositedQuoteAmount = toQuoteCurrencyAmount(
        stats.deposited,
        stats.avgDepositPrice
      )
      // Add safety check to prevent division by zero when calculating aprQuoteAmount
      let aprQuoteAmount: Fraction;
      try {
        // Check if depositedQuoteAmount is zero or extremely small
        if (depositedQuoteAmount.equalTo(CurrencyAmount.fromRawAmount(depositedQuoteAmount.currency, 0)) || 
            depositedQuoteAmount.lessThan(CurrencyAmount.fromRawAmount(depositedQuoteAmount.currency, 1))) {
          console.log('UI: Skipping quote APR calculation for zero or near-zero deposit');
          aprQuoteAmount = new Fraction(0, 1);
        } else {
          aprQuoteAmount = yieldPerDayQuoteAmount
            .divide(depositedQuoteAmount)
            .multiply(365).asFraction;
        }
      } catch (error) {
        console.error('UI: Error calculating quote APR:', error);
        aprQuoteAmount = new Fraction(0, 1);
      }
      const fmtApr = (apr: { value: Fraction; currency: Token }) =>
        `${apr.value.multiply(100).toFixed(2)}% ${apr.currency.symbol}`
      return `${apr.map(fmtApr).join(' ')} (= ${fmtApr({
        value: aprQuoteAmount,
        currency: yieldPerDayQuoteAmount.currency,
      })} at ${formatBaseCurrencyPrice(stats.avgYieldPrice)})`
    })()

    setStatsText([
      `positionId: ${stats.positionId.toString()}`,
      `range: ${formatBaseCurrencyPrice(
        stats.lowerTickPrice
      )} ${formatBaseCurrencyPrice(stats.upperTickPrice)}`,
      `price: ${formatBaseCurrencyPrice(stats.currentPrice)}`,
      `deposited: ${formatCurrencyAmountsWithQuote(
        stats.deposited,
        stats.avgDepositPrice
      )}`,
      `withdrawn: ${formatCurrencyAmountsWithQuote(
        stats.withdrawn,
        stats.avgWithdrawnPrice
      )}`,
      `current: ${formatCurrencyAmountsWithQuote(
        stats.current,
        stats.currentPrice
      )}`,
      `yield: ${formatCurrencyAmountsWithQuote(
        stats.totalYield,
        stats.avgYieldPrice
      )}`,
      `dateRange: ${stats.dateOpened.toLocaleString()} ${
        stats.dateClosed ? stats.dateClosed.toLocaleString() : 'N/A'
      } (${(stats.durationPositionHeld / 86_400_000).toFixed(1)} days)`,
      `yieldPerDay: ${formatCurrencyAmountsWithQuote(
        stats.yieldPerDay,
        stats.avgYieldPrice
      )}`,
      `apr: ${aprFormatted}`,
      `impermanent loss lower: ${stats.impermanentLossLower.multiply(100).toFixed(2)}% (break-even in ${stats.breakEvenDaysLower === Number.POSITIVE_INFINITY ? '∞' : stats.breakEvenDaysLower.toFixed(1)} days)`,
      `impermanent loss upper: ${stats.impermanentLossUpper.multiply(100).toFixed(2)}% (break-even in ${stats.breakEvenDaysUpper === Number.POSITIVE_INFINITY ? '∞' : stats.breakEvenDaysUpper.toFixed(1)} days)`,
    ])
  }, [stats])

  const handleGetStatsClick = async () => {
    if (!positionId) {
      alert('Please enter a Liquidity Position ID')
      return
    }

    setLoading(true)
    try {
      console.log(`Fetching stats for chain: ${selectedChain}, position ID: ${positionId}`)
      const provider = getProvider(selectedChain)
      console.log('Provider obtained:', provider)
      
      const stats = await getLiquidityPositionStats(
        provider,
        positionId,
        selectedChain
      )
      setStats(stats)
      console.log('Stats loaded successfully:', stats)
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      
      // Check for specific error types and messages
      if (error.code === 'POSITION_NOT_FOUND' || 
          error.code === 'POSITION_DATA_ERROR' ||
          (error.message && error.message.includes('call revert exception')) ||
          (error.message && error.message.includes('does not exist on this network')) ||
          (error.message && error.message.includes('data cannot be retrieved'))) {
        alert(`Position ID ${positionId} cannot be accessed on the ${CHAINS[selectedChain].name} network. \n\nPlease try a different position ID or switch to a different network.`);
      } 
      // Handle division by zero errors
      else if (error.message && (error.message.includes('Division by zero') || 
                error.message.includes('division by zero'))) {
        console.error('Division by zero error in calculations:', error);
        alert(`Error calculating statistics for position ID ${positionId}: Division by zero error. \n\nThis usually happens with positions that have zero or extremely small deposits. Try a different position.`);
      } 
      // Other errors
      else {
        alert(`Error fetching stats: ${error.message || String(error)}`);
      }
      
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <h1>UniswapV3 Stats Viewer</h1>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Select Chain:</label>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          style={{ padding: '5px', marginRight: '10px' }}
        >
          {Object.entries(CHAINS).map(([id, config]) => (
            <option key={id} value={id}>{config.name}</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        onChange={(e) => setPositionId(e.target.value)}
        value={positionId}
        placeholder="Liquidity Position ID"
        style={{ textAlign: 'center' }}
      />
      <button onClick={handleGetStatsClick}>
        Get Liquidity Position Stats
      </button>

      {(loading && (
        <div className="loader" style={{ margin: '20px 0' }}></div>
      )) ||
        (stats && (
          <div style={{ marginTop: '20px' }}>
            {/* <h3>Liquidity Position Stats</h3> */}
            <table style={{ textAlign: 'left' }}>
              <tbody>
                {statsText.map((stat, index) => (
                  <tr key={index}>
                    <td>{stat.split(': ')[0]}</td>
                    <td>{stat.split(': ')[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  )
}

export default App
