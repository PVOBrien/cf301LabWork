'use strict';

// RESOURCES+LIBRARIES

const express = require('express');
const superagent = require('superagent');
// const { request, response } = require('express');
const pg = require('pg');
require ('dotenv').config();
require ('ejs');
const methodOverride = require('method-override'); //npm i -S methodOverride

// GLOBAL VARS + INITIAL SETUP

const app = express();
const PORT = process.env.PORT || 3001;
const client = new pg.Client(process.env.DATABASE_URL)

// MIDDLEWARE

app.set('view engine', 'ejs'); // sets default extension of view engine pages to second parameter, ie dot ejs.
app.use(express.static('./public')); // This is where express goes to "USE" for CSS and other ... static-y(?) pages?
app.use(express.urlencoded({extended: true})); // Prevents mixed content warning from unsecured to secured data via secure protocol.
app.use(methodOverride('_method'));

// ROUTES

app.get('/', renderHomePage);
app.get('/new', renderSearchPage);
app.post('/searches', collectSearchResults);
app.post('/books', addFaveBooks);
app.get('/books/:id', renderSingleBook);// Everything after the : are paramaters
app.put('/books/:id', updateBook);
app.delete('/books/:id',deleteBook);

function deleteBook(request, response) {
  let id = request.params.id;
  // let {image, title, authors, description, isbn} = request.body;
  let sql = 'DELETE FROM books WHERE id=$1;';

  let safeValues = [id];

  client.query(sql, safeValues)
    .then(() => response.status(200).redirect('/')); // THIS WORKS! removed the deadend parameter name.
}

function updateBook (request, response) {
  let id = request.params.id;
  let {image, title, authors, description, isbn} = request.body;
  let sql = 'UPDATE books SET image=$1, title=$2, authors=$3, description=$4, isbn=$5 WHERE id=$6;';

  let safeValues = [image, title, authors, description, isbn, id];

  client.query(sql, safeValues)
    .then(()=> response.status(200).redirect('/'));
}

app.get('*', (request, response) => {
  response.status(404).send(`<h1>surely you are lost</h1>`);
});

function renderHomePage (request, response) {
  let sql = 'SELECT * FROM books;';
  client.query(sql)
    .then(results => {
      let books = results.rows;
      response.render('pages/index.ejs', {potato: books});
    })
  // response.render('pages/index'); // add .ejs to index || or not, works both ways.
}


function addFaveBooks(request,response) {
  let formData = request.body;
  console.log(formData);

  let {image, title, authors, description, isbn} = request.body;
  let sql = `INSERT INTO books (image, title, authors, description, isbn) VALUES ($1, $2, $3, $4, $5) RETURNING id;`;
  let safeValues = [image, title, authors, description, isbn];

  client.query(sql, safeValues)
    .then(results => {
      let id = results.rows[0].id;
      response.status(200).redirect(`/books/${id}`);
    }).catch(error => {
      console.log('ERROR', error);
      response.status(500).send('we\'re not here yet!');
    });
}

// server, turn on button
client.connect()
  .then (() => {
    app.listen(PORT, () => console.log(`Listen heARe on PORT: ${PORT}.`));
  }).catch(err => console.log('ERROR', err));
//====================

// FUNCTIONS ====================


function renderSearchPage(request,response){
  response.render('pages/searches/new');
}

function collectSearchResults(request, response) {
  let query = request.body.search[0];
  let category = request.body.search[1];

  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  if (category === 'title') {url+= `+intitle:${query}`}
  if (category === 'author') {url+= `+inauthor:${query}`}

  url += '&maxResults=10';

  superagent.get(url)
    .then(results => {
      let bookArray = results.body.items;
      console.log("The bookArray: " + results.body.items[0].volumeInfo.imageLinks.thumbnail);
      let count = 0;
      const finalBookArray = bookArray.map(book => {
        let theImage = 'https://i.imgur.com/JSLVHEL.jpg';
        if (results.body.items[count].volumeInfo.imageLinks) {
          theImage = results.body.items[count].volumeInfo.imageLinks.thumbnail ? results.body.items[count].volumeInfo.imageLinks.thumbnail : 'https://i.imgur.com/JSLVHEL.jpg';
        }
        count++;
        console.log("working over the bookarray: " + theImage);
        // console.log("working over the bookarray: " + results.body.items[1].volumeInfo.imageLinks.thumbnail);
        return new Book(book.volumeInfo, theImage);
      });
      console.log("Final book array" + finalBookArray);
      response.render('pages/searches/show.ejs', {searchResults: finalBookArray});
    }).catch((error) => {
      console.log('ERROR', error);
      response.status(500).send('the books, were burned :(');
    });
}

function renderSingleBook(request, response){
  let id = request.params.id;// It has to match name given in the route
  let sql = 'SELECT * FROM books WHERE id=$1;';
  let safeValues = [id];
  client.query(sql, safeValues)
    .then(results => {
      let selectedBook = results.rows;//0 because it is only returning one row

      response.render('pages/books/show.ejs', {potato:selectedBook});
      // pages/searches/show.ejs
    })
}

function Book(obj, passedImg) {
  this.image = passedImg; // 
  this.language = obj.language ? obj.language : 'no language, nuh-uh';
  this.title = obj.title ? obj.title : 'no title available';
  this.authors = obj.authors[0] ? obj.authors[0] : 'no author available'; // because authors is an array!
  this.description = obj.description ? obj.description : 'no description available';
  this.isbn = obj.industryIdentifiers[0].identifier ? obj.industryIdentifiers[0].identifier : 'no ISBN available'; // getting the isbn type ISNB_10 from the api options. TODO: make a function to properly return this for both ISBN types.
  // this.image = obj.imageLinks.thumbnail ? obj.imageLinks.thumbnail : 'NONE';
  console.log("The book's isbn: " + this.isbn);
}
