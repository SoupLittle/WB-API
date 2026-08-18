# TODO

Add watchlists / stocks for it to run through

Remove dead files

Test run it continuously for minimum 12 hours

Deploy on a raspberry pi (to run continuously on PAPER/DEMO mode), and run for a minimum of 2 month

IF everything is good after, change to live mode



# Worth remembering
Selling Orders: To execute a sell order, you must provide a negative value for the quantity parameter (e.g., -10.5). This is a core convention of the API.

Fetch All Instruments: You can query the global metadata endpoint (/api/v0/equity/metadata/instruments) to pull the complete list of all tradable tickers, names, and exchange details.

Filtering: You can build your own custom watchlist locally by filtering the master instrument list using the ticker symbols you care about.

Watchlists: Custom watchlists must be created and managed directly inside the mobile or web user interface.

NASD and SEC guidelines for day-trading? Pattern day trader, part-time day trader, full-time day trader and the minimum cash in the account at the end of the day 