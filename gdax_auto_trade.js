var async = require('async');
var Gdax = require('gdax');
var sleep = require('sleep');

// COMAND LINE ARGS

configFile = process.argv[2];
transactionMode = process.argv[3];
productId = process.argv[4];
percentageSwing = process.argv[5];
ante = process.argv[6];
basePrice = process.argv[7];
openOrder = null;
totalProfit = 0;
totalBuys = 0;
totalSells = 0;
slopeUpCount = 0;
slopeDownCount = 0;

// CHECK CLI PARAMETERS
if (transactionMode == null || productId == null || percentageSwing == null || ante == null) {
  console.log('----------------------------------------------------------------------');
  console.log('USAGE');
  console.log('----------------------------------------------------------------------');
  console.log('node trade.js [transactionMode] [productId] [percentageSwing] [ante] [basePrice]');
  console.log();
  console.log('[config] = config filename');
  console.log('[transactionMode] = what mode to start script in [buy,sell,pending-buy,pending-sell]');
  console.log('[productId] = gdax product id [ETH-USD, BTC-USD, etc]');
  console.log('[percentageSwing] = % range from base price that triggers buy / sell action');
  console.log('[ante] = how many coins will be bought / sold when a buy / sell action is triggered');
  console.log();

}

if (configFile == null) {
  console.log('>>> must pass config filename');
  process.exit();
}

if (transactionMode == null) {
  console.log('>>> must pass transaction mode to start [buy,sell,pending-buy,pending-sell]');
  process.exit();
}

if (productId == null) {
  console.log('>>> must specific a gdax product id [ETH-USD, BTC-USD, etc]');
  process.exit();
}

if (percentageSwing == null) {
  console.log('>>> must specify a percentage swing');
  process.exit();
}

if (ante == null) {
  console.log('>>> must provide ante');
  process.exit();
}

// LOAD CONFIG FILE
var config = require(configFile);

var gdaxAuthentication = config.gdax;

// INIT GDAX CLIENT ENDPOINTS
var publicClient = new Gdax.PublicClient(productId, gdaxAuthentication.apiURI);
var authedClient = new Gdax.AuthenticatedClient(gdaxAuthentication.key, gdaxAuthentication.b64secret, gdaxAuthentication.passphrase, gdaxAuthentication.apiURI);
var websocket = new Gdax.WebsocketClient(productId, null, gdaxAuthentication.authentication, gdaxAuthentication.apiURI);

// BUY
var buy = function (price, callback) {
  price = +(price);

  totalBuys = totalBuys + 1;
  console.log('');
  console.log('**** BUY! - ' + price);

  var buyParams = {
    'type': 'market',
    'size': ante,
    'product_id': productId
  };

  basePrice = price;

  authedClient.buy(buyParams, function(err, response, data) {
    console.log(data);
    openOrderId = data.id;
    transactionMode = 'pending-buy';
    basePrice = price;
    callback();
  });

};

// SELL
var sell = function (price, callback) {
  price = +(price);

  var profit = (ante * (+(price) - +(basePrice))) - (ante * +(basePrice) * .003);
  var fee = (ante * +(basePrice) * .003);
  // var fee = 0;

  totalProfit = totalProfit + profit;
  totalSells = totalSells + 1;

  var sellParams = {
    'type': 'market',
    'size': ante,
    'product_id': productId
  };

  console.log('');
  console.log('***SELL***');
  console.log('SELL PRICE: ' + price);
  console.log('(BUY) BASE PRICE: ' + basePrice);
  console.log('ANTE: ' + ante);
  console.log('FEE: ' + fee);

  console.log('APPROX PROFIT: ' + profit);

  console.log('TOTAL PROFIT: ' + totalProfit);
  basePrice = price;

  authedClient.sell(sellParams, function(err, response, data) {
    console.log(data);
    openOrderId = data.id;
    transactionMode = 'pending-sell';
    callback();
  });


};

// CHECK SELL ORDER
var checkSellOrder = function (openOrderId, callback) {
  authedClient.getOrder(openOrderId, function (err, response, data) {
    // console.log(data);
    if (data.status == 'done') {
      transactionMode = 'buy';
      //basePrice = data.price;
    }
    callback();
  });
};

// CHECK BUY ORDER
var checkBuyOrder = function (openOrderId, callback) {
  authedClient.getOrder(openOrderId, function (err, response, data) {
    //console.log(data);
    if (data.status == 'done') {
      transactionMode = 'sell';
      //basePrice = data.price;
    }
    callback();
  });
};

function evalRules (transactionMode, basePrice, percentageSwing, currentMatch, lastMatch, callback) {

  var percentFromBasePrice =  ((currentMatch.price-basePrice)/basePrice) * 100;

  //process.stdout.write(currentMatch.trend);
  if (currentMatch.trend !== lastMatch.trend) {
    console.log('');
    process.stdout.write('[' + transactionMode + ']['+ currentMatch.price + ' is ' + percentFromBasePrice + '% from ' + basePrice + '][TOTAL PROFIT => ' + totalProfit + ']');
    console.log('');
  }


  console.log('***');
  console.log('TRANSACTION_MODE => ' + transactionMode);
  console.log('BASE_PRICE => ' + basePrice);
  console.log('PERCENTAGE_SWING => ' + percentageSwing);
  console.log('---');
  console.log('TIMESTAMP => ' + Date.parse(currentMatch.time));
  console.log('TIMESTAMP => ' + currentMatch.time);
  console.log('MATCH PRICE => ' + currentMatch.price);
  console.log('MATCH SIZE => ' + currentMatch.size);
  console.log('MATCH SIDE => ' + currentMatch.side);
  console.log('% FROM BASE PRICE => ' + ((currentMatch.price-basePrice)/basePrice) * 100 + '%');
  console.log('CURRENT SLOPE  => ' + currentSlope);
  console.log('TREND => ' + currentMatch.trend);
  console.log('---');
  console.log('TOTAL PROFIT  => ' + totalProfit);
  console.log('TOTAL BUYS  => ' + totalBuys);
  console.log('TOTAL SELLS  => ' + totalSells);



  switch (transactionMode) {
      case 'buy':
        if (Math.abs(percentFromBasePrice) > percentageSwing && percentFromBasePrice < 0) {
          buy(currentMatch.price, function () {
            // process.exit();
          });
        }

      break;

      case 'sell':
        if (Math.abs(percentFromBasePrice) > percentageSwing && percentFromBasePrice > 0) {
          sell(currentMatch.price, function () {

          });
        }

      break;

      case 'pending-sell':
        checkSellOrder(openOrderId, function () {

        });
      break;

      case 'pending-buy':
        checkBuyOrder(openOrderId, function () {

        });
      break;


  }

  callback();
}

async.series([
    // SET DEFAULT BASE PRICE
    function(callback_step_1) {
      console.log('---');
      console.log('STEP 1: INIT');
      console.log('---');
      if (basePrice == null) {

        publicClient.getProductTicker(function(err, response, data) {
          console.log(data);
          basePrice = data.price;

          if (basePrice == null) {
            console.log('error trying to get default base pricee from gdax');
          } else {
            basePrice = +(basePrice);
          }

          console.log('BASE PRICE SET (BASED UPON CURRENT PRICE PER GDAX)=> ' + basePrice);
          callback_step_1();

        });

      } else {
        basePrice = +(basePrice);
        console.log('BASE PRICE => ' + basePrice);
        callback_step_1();
      }

    },
    // SHOW CURRENT ACCOUNT SUMMARY
    function(callback_step_2) {
      console.log('---');
      console.log('STEP 2: SHOW CURRENT ACCOUNT SUMMARY');
      console.log('---');
      authedClient.getAccounts(function(err, response, data) {
        console.log(data);
        callback_step_2();
      });
    },
    // WATCH GDAX AND TAKE ACTION
    function(callback_step_3) {

      lastMatch = null;
      currentMatch = null;
      currentSlope = 0;

      console.log('---');
      console.log('STEP 3: WATCH AND TRADE');
      console.log('---');

      websocket.on('message', function(data) {
        //console.log(data);
        if (data.type == 'match') {

          if (lastMatch == null) {
            lastMatch = data;
            lastMatch.trend = '%';
            lastMatch.slope = 0;
          } else {

            currentMatch = data;

            currentMatch.slope = (+(currentMatch.price) - +(lastMatch.price)) / (Date.parse(currentMatch.time) - Date.parse(lastMatch.time));

            if (currentMatch.slope  > 0) {
              currentMatch.trend = '+';
            } else if (currentMatch.slope  < 0) {
              currentMatch.trend = '-';
            } else {
              currentMatch.trend = '%';
            }
            process.stdout.write(currentMatch.trend);
            evalRules(transactionMode, basePrice, percentageSwing, currentMatch, lastMatch, function () {
              lastMatch = currentMatch;
            });

          }



        }

      });

      callback_step_3();

    }]);
