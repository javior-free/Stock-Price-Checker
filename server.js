'use strict';
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

// === CSP EXACTA requerida por FCC ===
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'"
  );
  next();
});

// === DB CONNECTION ===
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("Database error:", err));

// === STATIC ===
app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors()); // suficiente para FCC
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// === INDEX ===
app.route('/')
  .get((req, res) => {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// === FCC TESTING ===
fccTestingRoutes(app);

// === API ===
apiRoutes(app);

// === 404 ===
app.use((req, res) => {
  res.status(404).type('text').send('Not Found');
});

// === SERVER + TESTS ===
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Server on port ' + listener.address().port);

  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(() => runner.run(), 3500);
  }
});

module.exports = app;
