# gdax-trading-cli

Monitors a single crypto currency trading stream on the [GDAX](https://www.gdax.com) and initiates **buy / sell** orders when trading price hits thresholds above and below a base price.

> NOTE

> This was created for fun and the algorithm is not super fancy.

> It makes no real money but is fun to watch.

> It is also fun to walk away from the computer and know your crypto is being bought / sold by the computer.

## how is works in a nutshell

- A **basePrice** and **percentageSwing** is initially set when the script is first started by querying last match price on gdax (**basePrice** can be passed into the script if a different starting price is desired)


- A **ante** (amount of coins you are playing with) is also initiated when started

- The script then monitors the gdax websocket feed (https://docs.gdax.com/#websocket-feed) looking for **match** trades to track current price and takes actions based upon current **transactionMode** and the trading percentage price difference from **basePrice**.  


	| Transaction Mode  | Description  |
	|---------------|----------------|
	| **buy**  |   If last trading price less than **percentageSwing** from current **basePrice**, a market **buy** transaction is initiated using the [Order API](https://docs.gdax.com/#orders) with a size of **ante**<br /><br />The **transactionMode**  is then set to `pending-buy`|
	| **sell**  |   If last trading price greater than **percentageSwing** from current **basePrice**, a market **buy** transaction is initiated using the [Orders API resource](https://docs.gdax.com/#orders) with a size of **ante**<br /><br />The **transactionMode** is then set to `pending-sell`   |
	| **pending-buy**    |   While in this mode, once each transaction is received from the gdax websocket feed, it checks to see if the order has been filled using the [Fills API resource](https://docs.gdax.com/#fills)<br /><br />Once the buy order has been filled the **transactionMode**	is changed to `sell` and the **basePrice** is set to the current price |
	| **pending-sell**    |   While in this mode, once each transaction is received from the gdax websocket feed, it checks to see if the order has been filled using the [Fills API resource](https://docs.gdax.com/#fills)<br /><br />Once the sell order has been filled the **transactionMode**	is changed to `buy` and the **basePrice** is set to the current price  |

	> The script also tracks the slope of the each trade to determine if the price is going up / down (based upon last trade).  In addition to the price delta it will also ensure the slope has at least shifted in prevent a sell / buy if the market is still moving.  This is way too sensitive in reality b/c it is only looking back one price point.

## how to install / run

- Clone repo

- `npm install` the packages

- Update `config.json` with your gdax api credentials

- Run the script

	```
	$ node gdax_auto_trade.js [transactionMode] [productId] [percentageSwing] [ante] [basePrice]
	```
	```
	[config] = config filename
	[transactionMode] = what mode to start script in [buy,sell,pending-buy,pending-sell]
	[productId] = gdax product id [ETH-USD, BTC-USD, etc]
	[percentageSwing] = % range from base price that triggers buy / sell action
	[ante] = how many coins will be bought / sold when a buy / sell action is triggered
	[basePrice] (optional) = starting base price when script is run (typically read from gdax upon startup of script)

## just want to monitor the gdax feed?

```
	$ node gdax_stream.js [productId] [transactionType]
```

```
	[productId] = gdax product id [ETH-USD, BTC-USD, etc]
	[transactionType] = transaction to track (`match` will provide output of current price)
```
