import * as express from "express";
import pkg from "express";
import { mongoose, Types } from "mongoose";
import bodyParser from "body-parser";
import session from "express-session";

// const express = require("express");
const app = express();

mongoose.connect("mongodb://localhost/blogapp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({ secret: "your-secret-key", resave: true, saveUninitialized: true })
);

app.set("view engine", "ejs");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);

app.get("/", async (req, res) => {
  try {
    const posts = await Post.find().populate("author");
    res.render("home", { user: req.session.user, posts });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app
  .route("/login")
  .get((req, res) => {
    res.render("login", { errorMessage: "" });
  })
  .post(async (req, res) => {
    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username, password });

      if (user) {
        req.session.user = user;
        res.redirect("/");
      } else {
        res.render("login", { errorMessage: "Invalid username or password" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  });

app
  .route("/register")
  .get((req, res) => {
    res.render("register", { errorMessage: "" });
  })
  .post(async (req, res) => {
    const { fname, lname, email, password } = req.body;

    try {
      const existingUser = await User.findOne({ fname });

      if (existingUser) {
        res.render("register", { errorMessage: "Username already exists" });
      } else {
        const newUser = new User({ fname, lname, email, password });
        await newUser.save();

        req.session.user = newUser;
        res.redirect("/");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  });

app
  .route("/post/create")
  .get((req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    res.render("create-post", { user: req.session.user });
  })
  .post(async (req, res) => {
    try {
      const { title, content } = req.body;
      const author = req.session.user._id;

      const newPost = new Post({ title, content, author });
      await newPost.save();

      res.redirect("/");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  });

app
  .route("/post/edit/:id")
  .get(async (req, res) => {
    try {
      const postId = req.params.id;
      const post = await Post.findById(postId).populate("author");

      if (
        !post ||
        !req.session.user ||
        post.author._id.toString() !== req.session.user._id.toString()
      ) {
        return res.redirect("/");
      }

      res.render("edit-post", { user: req.session.user, post });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  })
  .post(async (req, res) => {
    try {
      const postId = req.params.id;
      const { title, content } = req.body;

      await Post.findByIdAndUpdate(postId, { title, content });

      res.redirect("/");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  });

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
