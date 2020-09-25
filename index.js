const express = require('express');
require('dotenv').config();
let yup = require('yup');
const app = express();
const { nanoid } = require('nanoid');

// getting host and port from .env file
const host = process.env.HOST;
const port = process.env.PORT;
const db = require('monk')(process.env.MONGO_DB_URL);

// getting urls table from urlshortner database
const urls = db.get('urls');

// process json request..very much required..this middleware common to all requests
app.use(express.json());

// yup object creation for schema validation
const schema = yup.object().shape({
  slug: yup
    .string()
    .trim()
    .matches(/^[\w\-]+$/i),
  url: yup.string().trim().url().required(),
});

// redirects if slug exist in database
app.get('/:id', (req, res) => {
  let { id } = req.params;
  urls
    .findOne({ slug: id })
    .then((found) => {
      console.log(found);
      res.redirect(found.url);
    })
    .catch((error) => res.send({ error: 'slug doesnt exist' }));
});

// creation of slug url mapping
app.post('/url', (req, res) => {
  let { slug, url } = req.body;
  console.log(slug);
  console.log(url);

  let isSchemaValid = schema.validate({ slug, url }); // returns promise

  isSchemaValid
    .then((valid) => {
      console.log(`schema validity ${valid}`);
      // handle case when slug is present in request
      if (slug) {
        // check in db in slug exist already..if yes return slug in use
        let existing = urls.findOne({ slug });
        console.log('existing is', existing); // promise
        existing.then((doc) => {
          if (!doc) {
            urls
              .insert({
                url,
                slug,
              })
              .then((created) => {
                console.log('successfully created record..', created);
                res.json(created);
              });
          } else {
            res.json({ error: 'slug already in use..' });
          }
        });
      }
      // case when slug not present in request..so creating slug first and dn inserting
      else {
        slug = nanoid(5);
        urls.insert({ url, slug }).then((created) => res.send(created));
      }
    })
    .catch((err) => {
      res.send(err);
    });
});

app.listen(port, () => {
  console.log(`Example app listening at http://${host}:${port}`);
});
