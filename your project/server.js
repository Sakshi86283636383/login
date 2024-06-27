const express = require("express");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { engine } = require("express-handlebars");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const User = require("./models/user");
require("dotenv").config();
require("./db/conn");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse the body of POST requests
app.use(express.urlencoded({ extended: false }));

// Setup Handlebars as the template engine
app.engine("hbs", engine({ extname: "hbs", defaultLayout: false }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "templates"));

// Serve static files
app.use("/assets", express.static(path.join(__dirname, "public")));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Middleware to add user to response locals
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Route to render the home page
app.get("/", (req, res) => {
  res.render("home");
});

// Route to render the sign-up form
app.get("/sign-up", (req, res) => {
  res.render("sign-up");
});

// Route to handle sign-up form submission with validation
app.post("/sign-up", [
  body("username").notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Enter a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).render("sign-up", { errors: errors.array() });
  }

  const { username, email, password } = req.body;

  const newUser = new User({
    username,
    email,
    password,
  });

  try {
    await newUser.save();
    res.redirect("/login");
  } catch (error) {
    res.status(500).render("sign-up", { errorMessage: "Error saving user: " + error.message });
  }
});

// Route to render the login form
app.get("/login", (req, res) => {
  res.render("login");
});

// Route to handle login form submission
app.post("/login", [
  body("username").notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).render("login", { errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || !await user.comparePassword(password)) {
      return res.status(401).render("login", { errorMessage: "Invalid username or password" });
    }

    req.session.user = user;
    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).render("login", { errorMessage: "Error logging in: " + error.message });
  }
});

// Route to render the dashboard (protected)
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("dashboard");
});

// Route to handle logout
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send("Error logging out");
    }
    res.redirect("/");
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
