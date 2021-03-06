const mongoose = require("mongoose");
const express = require("express");
const exphbs = require("express-handlebars");
const axios = require("axios");
const cheerio = require("cheerio");

const db = require("./models");

const PORT = process.env.PORT || 8080;

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

let MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/newsDB";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

 app.get('/', function (req, res) {
  res.render('index');
});

app.get('/scrape', function(req, res) {
  axios.get("https://www.nytimes.com")
  .then(function(results) {
    let $ = cheerio.load(results.data);
    $("article").each(function(i, element) {
      let scrapedArticle = {};

      scrapedArticle.headline = $(this).find("h2")
        .text();
      scrapedArticle.summary = $(this).find("p").text();
      scrapedArticle.link = $(this).find("a").attr("href");
      
      db.Article.create(scrapedArticle)
        .then(function(newArticle) {
          console.log(newArticle);
        }) 
        .catch(function(err) {
          console.log(err);
        });
    });

    res.redirect('/');

  });
});

app.get('/articles', function(req, res) {
  db.Article.find({})
  .then(function(results) {
    res.json(results);
  })
  .catch(function(err) {
    res.json(err)
  });
});

app.get('/articles/:id', function(req, res) {
  db.Article.findOne({_id: req.params.id})
  .populate('comments')
  .then(function(results) {
    res.json(results);
  })
  .catch(function(err) {
    res.json(err);
  });
});

app.post('/articles/:id', function(req, res) {
  db.Comment.create(req.body)
  .then(function(newComment) {
    return db.Article.findOneAndUpdate({_id: req.params.id}, {$push: {comments: newComment._id}}, {new: true});
  })
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function (err) {
    res.json(err);
  });
});

app.listen(PORT, function() {
  console.log(`App running on port ${PORT}!`);
});

