const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {

  this.timeout(5000);

  // Variables para reutilizar símbolos y likes
  let likesBefore;

  suite('GET /api/stock-prices => stockData object', function () {

    test('1 stock', function (done) {
      chai
        .request(server)
        .get('/api/stock-prices')
        .query({ stock: 'GOOG' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, 'stockData');
          assert.property(res.body.stockData, 'stock');
          assert.property(res.body.stockData, 'price');
          assert.property(res.body.stockData, 'likes');
          assert.equal(res.body.stockData.stock, 'GOOG');
          likesBefore = res.body.stockData.likes;
          done();
        });
    });

    test('1 stock with like', function (done) {
      chai
        .request(server)
        .get('/api/stock-prices')
        .query({ stock: 'GOOG', like: 'true' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, 'stockData');
          assert.equal(res.body.stockData.stock, 'GOOG');
          assert.isAtLeast(res.body.stockData.likes, likesBefore + 1);
          likesBefore = res.body.stockData.likes;
          done();
        });
    });

    test('1 stock with like again (should not double count)', function (done) {
      chai
        .request(server)
        .get('/api/stock-prices')
        .query({ stock: 'GOOG', like: 'true' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, 'stockData');
          assert.equal(res.body.stockData.stock, 'GOOG');
          assert.equal(res.body.stockData.likes, likesBefore);
          done();
        });
    });

    test('2 stocks', function (done) {
      chai
        .request(server)
        .get('/api/stock-prices')
        .query({ stock: ['GOOG', 'MSFT'] })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, 'stockData');
          assert.isArray(res.body.stockData);
          assert.lengthOf(res.body.stockData, 2);

          res.body.stockData.forEach(stock => {
            assert.property(stock, 'stock');
            assert.property(stock, 'price');
            assert.property(stock, 'rel_likes');
          });

          done();
        });
    });

    test('2 stocks with like', function (done) {
      chai
        .request(server)
        .get('/api/stock-prices')
        .query({ stock: ['GOOG', 'MSFT'], like: 'true' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, 'stockData');
          assert.isArray(res.body.stockData);
          assert.lengthOf(res.body.stockData, 2);

          const [stock1, stock2] = res.body.stockData;

          assert.property(stock1, 'stock');
          assert.property(stock1, 'price');
          assert.property(stock1, 'rel_likes');

          assert.property(stock2, 'stock');
          assert.property(stock2, 'price');
          assert.property(stock2, 'rel_likes');

          // La suma de rel_likes siempre debe ser 0
          assert.equal(stock1.rel_likes + stock2.rel_likes, 0);

          done();
        });
    });

  });
});
