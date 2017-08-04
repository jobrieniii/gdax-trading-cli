var Gdax = require('gdax');

productId = process.argv[2];
transactionType = process.argv[3];

var websocket = new Gdax.WebsocketClient(productId);

websocket.on('message', function(data) {
  if ( typeof transactionType !== 'undefined' && transactionType ) {
    if (data.type==transactionType) {
      console.log(Date.parse(data.time) + ',' + data.time + ',' + data.type + ','  + data.side + ',' + data.price + ',' + data.order_id + ',' + data.remaining_size + ',' + data.product_id + ',' + data.sequence);
    }
  } else {
    console.log(Date.parse(data.time) + ',' + data.time + ',' + data.type + ','  + data.side + ',' + data.price + ',' + data.order_id + ',' + data.remaining_size + ',' + data.product_id + ',' + data.sequence);
  }
});
