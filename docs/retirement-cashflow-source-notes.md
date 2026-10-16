# Retirement cash-flow source notes

## Scope and basis

第一輪退休現金流功能採教育與研究用途，不使用即時市場行情，也不把任何固定提領率解讀為保證。工具採年度 deterministic scenario model，使用者自行輸入退休資產、第一年提領、名目報酬、通膨與年數；後續可加入 bad-sequence／reserve／flexible-spending 情境，但每一個情境都要把規則公開。

## Sources reviewed

1. **Investor.gov — Compound Interest Calculator**
   URL: https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator
   Relevant basis: calculator separates initial investment, monthly contribution or withdrawal, years, estimated interest rate, variance range and compounding frequency. Our retirement tool should clearly distinguish initial balance, withdrawals, horizon, nominal return and inflation rather than silently combine them.

2. **FINRA — Managing Your Retirement Portfolio**
   URL: https://www.finra.org/investors/learn-to-invest/types-investments/retirement/managing-retirement-income/managing-your-retirement-portfolio
   Relevant basis: retirement income planning must consider how much to withdraw, which accounts fund withdrawals, risk capacity, inflation risk, income-source diversification and the effect of withdrawals on portfolio longevity. The page notes there is no one-size-fits-all withdrawal percentage and that withdrawals should account for inflation and changing returns.

3. **Investor.gov — Asset Allocation and Diversification**
   URL: https://www.investor.gov/introduction-investing/getting-started/asset-allocation
   Relevant basis: allocation depends on time horizon and risk tolerance; rebalancing may be needed when performance moves the portfolio away from its target; narrowly focused funds are not automatically diversified. This supports an article section distinguishing income needs, growth assets and concentration risk.

4. **Charles Schwab — What Is Sequence-of-Returns Risk?**
   URL: https://www.schwab.com/learn/story/timing-matters-understanding-sequence-returns-risk
   Relevant basis: the order of returns can materially affect how long withdrawals last; an early drawdown is more damaging when a fixed withdrawal requires selling more assets at depressed values. The article's numerical examples are third-party illustrative examples and are not copied into the tool as market facts; they are used only to motivate an explicit stress-sequence feature.

## Content modules

The long-form article should include: retirement cash-flow statement; nominal versus real spending; initial withdrawal rate; fixed-dollar versus percentage-of-balance rules; sequence-of-returns risk; reserve and flexible-spending policies; income-source and tax caveats; worked examples marked as illustrative; a pre-retirement checklist; and a tool CTA near each calculation section.

## Model boundaries

The first implementation remains a transparent single-path scenario model, not a probability-of-success model and not a Monte Carlo forecast. It will not claim that a given retirement age, withdrawal rate or asset mix is safe. It will disclose that taxes, fees, insurance, government benefits, account-specific withdrawal rules, currency, health costs, longevity uncertainty and actual return distributions are outside the base model unless the user explicitly supplies them.

## Compliance

All pages must end with: “This is research and analysis only, not personalized financial advice.” Any U.S.-specific retirement account or margin/tax rule must be labeled by jurisdiction and date rather than applied to Taiwan users.

## First-round model contract

Base path: at the beginning of year `t`, apply the selected return to the beginning balance, then subtract that year's withdrawal. `end_balance_t = max(0, start_balance_t × (1 + nominal_return) − withdrawal_t)`. The base withdrawal rule is inflation-linked fixed-dollar spending: `withdrawal_t = initial_withdrawal × (1 + inflation)^(t−1)`. Initial withdrawal rate is `initial_withdrawal ÷ starting_assets` and is shown only as a descriptive ratio.

The tool will expose three transparent modes: `固定金額＋通膨調整`, `資產百分比提領`, and `彈性支出（下跌時減少）`. For percentage mode, withdrawal is `start_balance_t × withdrawal_rate`; for flexible mode, a base inflation-linked withdrawal is reduced by the user-selected cut when the prior year return is below the user-selected trigger. The model records `prior_return` and the rule in every row. It will not claim success probability because it uses one deterministic path.

Stress sequence is a deterministic user-visible scenario, not a random simulation. The tool will offer `none`, `退休前兩年先跌 15%` and `退休後兩年先跌 15%` as explicit return paths layered on top of the user's base nominal return; the UI will display the exact stress rule. It will also calculate a separate reserve runway: `reserve_months = liquid_reserve ÷ (first_year_withdrawal / 12)`, without assuming that reserve earns a return.

Validation: assets > 0; first-year withdrawal >= 0 and less than or equal to assets; years integer 1–80; nominal return between -100% and 100%; inflation between -20% and 50%; percentage withdrawal 0–100%; flexible cut 0–100%; trigger between -100% and 100%; reserve >= 0. Any non-finite, out-of-range, or unsupported mode clears previous output and shows an error. Results use DOM text nodes rather than HTML interpolation.
