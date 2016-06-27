'use strict';

const express = require('express');
const router = express.Router();

const environment = process.env.NODE_ENV || 'development';
const knexConfig = require('../knexfile')[environment];
const knex = require('knex')(knexConfig);
const _ = require('lodash');

const bcrypt = require('bcrypt');

const bookToCamelCase = function(book) {
  return {
    id: book.book_id,
    title: book.title,
    genre: book.genre,
    description: book.description,
    coverUrl: book.cover_url,
    authorId: book.author_id
  };
};

const userToCamelCase = function(user) {
  return {
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email
  };
};

router.post('/', (req, res, next) => {
  let email = req.body.email;
  let password = req.body.password;

  knex('users').where('email', email)
    .then((data) => {
      if (data.length) {
        let err = new Error('Email already exists');
        err.status = 409;
        return next(err);
      }

      bcrypt.hash(password, 10, (err, hash) => {
        knex('users').returning('*')
          .insert({
            first_name: req.body.firstName,
            last_name: req.body.lastName,
            email: email,
            password: hash
          })
          .then((user) => {
            res.status(200).send(userToCamelCase(user[0]));
            // login newly registered user
          })
          .catch((err) => {
            return next(err);
          });
      });
    })
    .catch((err) => {
      return next(err);
    });
});

router.get('/:id/books', (req, res, next) => {
  const id = Number.parseInt(req.params.id);

  knex('books').innerJoin('users_books', 'users_books.book_id', 'books.id')
    .where('users_books.user_id', id)
    .then((books) => {
      res.send(books.map(bookToCamelCase));
    })
    .catch((err) => {
      return next(err);
    });
});

router.get('/:userId/books/:bookId', (req, res, next) => {
  const userId = Number.parseInt(req.params.userId);
  const bookId = Number.parseInt(req.params.bookId);

  knex('books').innerJoin('users_books', 'users_books.book_id', 'books.id')
    .where({
      'books.id': bookId,
      'users_books.user_id': userId
    })
    .then((books) => {
      if (!books.length) {
        return res.sendStatus(404);
      }

      res.send(bookToCamelCase(books[0]));
    })
    .catch((err) => {
      return next(err);
    });
});

router.post('/:userId/books/:bookId', (req, res, next) => {
  const userId = Number.parseInt(req.params.userId);
  const bookId = Number.parseInt(req.params.bookId);

  knex('users_books').returning('*')
    .insert({
      book_id: bookId,
      user_id: userId
    })
    .then((insertedUserBook) => {
      res.send(bookToCamelCase(insertedUserBook[0]));
    })
    .catch((err) => {
      return next(err);
    });
});

router.delete('/:userId/books/:bookId', (req, res, next) => {
  const userId = req.params.userId;
  const bookId = req.params.bookId;

  knex('users_books').where({
      user_id: userId,
      book_id: bookId
    })
    .del()
    .then(() => {
      res.send(`Deleted book from your library.`);
    })
    .catch((err) => {
      return next(err);
    });
});

router.post('/authentication', (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  knex('users').first()
    .where('email', email)
    .then((user) => {
      if (!user) {
        let err = new Error('User does not exist');
        err.status = 400;
        return next(err);
      }

      bcrypt.compare(password, user.password, function (err, isMatch) {
        if(err) {
          return next(err);
        }

        if (!isMatch) {
          const err = new Error('User email or password is not correct');
          err.status = 400;
          return next(err);
        }

        req.session.user = userToCamelCase(user);

        res.cookie('userId', user.id);
        res.sendStatus(200);
      });
    })
    .catch((err) => {
      return next(err);
    });
});

router.delete('/authentication', (req, res, next) => {
  req.session = null;
  res.clearCookie('userId');
  res.sendStatus(200);
});

module.exports = router;