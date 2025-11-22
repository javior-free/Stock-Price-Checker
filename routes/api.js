"use strict";

const mongoose = require("mongoose");

// NO volver a conectarse aquí — server.js ya lo hace

// Schema
const stockSchema = new mongoose.Schema({
  stock: { type: String, required: true, unique: true },
  likes: { type: Number, default: 0 },
  ipList: { type: [String], default: [] }
});

const Stock = mongoose.model("Stock", stockSchema);

module.exports = function (app) {
  app.get("/api/stock-prices", async (req, res) => {
    try {
      const { stock, like } = req.query;

      if (!stock) return res.json({ error: "stock query required" });

      const stocks = Array.isArray(stock) ? stock : [stock];

      // Anonimize IP
      const rawIp = req.ip || req.connection.remoteAddress;
      const ip = rawIp.split(".").slice(0, 2).join(".") + ".0.0";

      // Fetch stock price from FCC proxy
      const fetchPrice = async (symbol) => {
        const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;

        const r = await fetch(url);
        const data = await r.json();

        // FCC needs numeric price ALWAYS
        if (typeof data.latestPrice === "number") return data.latestPrice;

        return 0; // fallback if proxy fails
      };

      // Main processing
      const processStock = async (symbol) => {
        const symbolUpper = symbol.toUpperCase();

        let doc = await Stock.findOne({ stock: symbolUpper });

        if (!doc) {
          doc = new Stock({ stock: symbolUpper });
        }

        // handle likes
        if (like === "true") {
          if (!doc.ipList.includes(ip)) {
            doc.ipList.push(ip);
            doc.likes += 1;
          }
        }

        await doc.save();

        const price = await fetchPrice(symbolUpper);

        return {
          stock: symbolUpper,
          price,
          likes: doc.likes
        };
      };

      // Run for 1 or 2 stocks
      const result = await Promise.all(stocks.map((s) => processStock(s)));

      if (result.length === 1) {
        return res.json({ stockData: result[0] });
      }

      const [a, b] = result;

      return res.json({
        stockData: [
          {
            stock: a.stock,
            price: a.price,
            rel_likes: a.likes - b.likes
          },
          {
            stock: b.stock,
            price: b.price,
            rel_likes: b.likes - a.likes
          }
        ]
      });

    } catch (err) {
      console.error(err);
      return res.json({ error: "server error" });
    }
  });
};
