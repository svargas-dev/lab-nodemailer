const { Router } = require('express');
const router = new Router();

const User = require('./../models/user');
const bcryptjs = require('bcryptjs');
const nodemailer = require('nodemailer');

router.get('/', (req, res, next) => {
  res.render('index');
});

router.get('/sign-up', (req, res, next) => {
  res.render('sign-up');
});

// GENERATE RANDOM TOKEN
const generateId = length => {
  const characters =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += characters[Math.floor(Math.random() * characters.length)];
  }
  return token;
};



router.post('/sign-up', (req, res, next) => {
  const { name, email, password } = req.body;
  const token = generateId(32);
  // NODEMAILER
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  bcryptjs
  .hash(password, 10)
  .then(hash => {
    return User.create({
      name,
      email,
      passwordHash: hash,
      confirmationCode: token
    });
  })
  .then(user => {
    req.session.user = user._id;
    res.redirect('/');
    transporter.sendMail({
      from: `"My Awesome Project" <${process.env.EMAIL_USER}>`,
      to: `${req.body.email}`, 
      subject: 'Ironhack Lab - Confirm Your Email', 
      text: `Welcome to Ironhack Lab - Emails. Go to 
      http://localhost:3000/auth/confirm/${token} 
      to confirm your email address`,
      html: `
      <h1>Welcome to Ironhack Lab - Emails</h1>
      <p><a href="http://localhost:3000/auth/confirm/${token}/">
          Click here</a> to confirm your email address</p>
      `
    })
    .then(email => console.log('EMAIL SENT'))
    .catch(error => console.log('Email unsuccessful.', error));
  })
  .catch(error => {
      next(error);
    });
});

router.get('/auth/confirm/:token', (req, res, next) => {
  User.findOneAndUpdate({confirmationCode: req.params.token}, {status: 'Active'})
  .then(user => {
    res.redirect('/auth/verification-successful')
  })
  .catch(err => console.log(err));
});

router.get('/auth/verification-successful', (req, res, next) => {
  res.render('confirmation')
});


router.get('/sign-in', (req, res, next) => {
  res.render('sign-in');
});

router.post('/sign-in', (req, res, next) => {
  let userId;
  const { email, password } = req.body;
  User.findOne({ email })
    .then(user => {
      if (!user) {
        return Promise.reject(new Error("There's no user with that email."));
      } else {
        userId = user._id;
        return bcryptjs.compare(password, user.passwordHash);
      }
    })
    .then(result => {
      if (result) {
        req.session.user = userId;
        res.redirect('/');
      } else {
        return Promise.reject(new Error('Wrong password.'));
      }
    })
    .catch(error => {
      next(error);
    });
});

router.post('/sign-out', (req, res, next) => {
  req.session.destroy();
  res.redirect('/');
});

const routeGuard = require('./../middleware/route-guard');

router.get('/private', routeGuard, (req, res, next) => {
  res.render('private');
});

router.get('/profile', routeGuard, (req, res, next) => {
  res.render('profile', { User: req.user });
  console.log(req.user);
});

module.exports = router;
