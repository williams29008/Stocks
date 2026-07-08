It's running on demo data for 5 sample tickers (AAPL, MSFT, GOOGL, AMZN, NVDA) right now. 
To make it show your actual portfolio:

Open script.js and edit the HOLDINGS array with your own tickers (and share counts, 
if you want a real total portfolio value rather than per-share prices).
Set up a Google Sheet with GOOGLEFINANCE() formulas for price, day change %, and a 1-year-ago price 
to compute yearly change — dividend yield isn't a live GOOGLEFINANCE field, so that column needs 
to be entered manually.
File → Share → Publish to web → CSV, then paste that URL into SHEET_CSV_URL at the top of script.js.
Reload the page — it fetches the CSV, and quietly falls back to demo data if anything's wrong with the fetch.

The table headers are clickable to sort, columns use tabular monospace figures so decimals line up, 
and the top strip shows a live-computed total value/day change/year change weighted across your holdings. 
All of this is explained inline in the page itself too, under "Connecting real Google Finance data."
