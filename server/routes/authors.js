'use strict';

const express = require('express');
const router = express.Router();

const environment = process.env.NODE_ENV || 'development';
const knexConfig = require('../knexfile')[environment];
const knex = require('knex')(knexConfig);

router.get('/', (req, res, next) => {
  knex('authors').select()
    .then((authors) => {
      res.send(authors);
    })
    .catch((err) => {
      return next(err);
    });
});

router.post('/', (req, res, next) => {
  knex('authors').returning('*')
    .insert(req.body)
    .then((insertedAuthors) => {
      res.send(insertedAuthors[0]);
    })
    .catch((err) => {
      return next(err);
    });
});

router.get('/:id', (req, res, next) => {
  knex('authors').first()
    .where('id', req.params.id)
    .then((author) => {
      res.send(author);
    })
    .catch((err) => {
      return next(err);
    });
});

router.put('/:id', (req, res, next) => {
  knex('authors').where('id', req.params.id)
    .update(req.body)
    .then((author) => {
      res.send(author);
    })
    .catch((err) => {
      return next(err);
    });
});

router.delete('/:id', (req, res, next) => {
  knex('authors').where('id', req.params.id)
    .del()
    .then((response) => {
      res.send(response);
    })
    .catch((err) => {
      return next(err);
    });
});

module.exports = router;