let request = require('request');

module.exports = {
    getTicker: function(coinName, callback) {
        request({
            'method': 'GET',
            'url': 'https://vip.bitcoin.co.id/api/' + coinName + '_idr/ticker',
            'headers': {}
        }, function(error, response) {
            if (error) throw new Error(error);
            callback(JSON.parse(response.body));
        });
    },
    getTrades: function(coinName, callback) {
        request({
            'method': 'GET',
            'url': 'https://vip.bitcoin.co.id/api/' + coinName + '_idr/trades',
            'headers': {}
        }, function(error, response) {
            if (error) throw new Error(error);
            try {
                callback(JSON.parse(response.body));
            } catch (e) {
                console.log("- error: " + JSON.stringify(e));
                callback([]);
            }
        });
    },
    dataStructureCleaning_trades: function(coinName, originalData) {
        return {
            pair_name: coinName + '_idr',
            timestamp: parseFloat(originalData.date),
            price: parseFloat(originalData.price),
            amount: parseFloat(originalData.amount),
            tid: parseFloat(originalData.tid),
            type: originalData.type
        }
    },
    dataStructureCleaning_price: function(coinName, originalData) {
        return {
            pair_name: coinName + '_idr',
            timestamp: originalData.server_time,
            price_high_24h: parseFloat(originalData.high),
            price_low_24h: parseFloat(originalData.low),
            coin_volume_24h: parseFloat(originalData['vol_' + coinName]),
            idr_volume_24h: parseFloat(originalData.vol_idr),
            price_latest: parseFloat(originalData.last),
            price_buy: parseFloat(originalData.buy),
            price_sell: parseFloat(originalData.sell),
        }
    }
};