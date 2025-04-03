import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import dotenv from "dotenv";
// import multer from "multer";

dotenv.config();
const app = express();
const port = 3000;
const saltRounds = 10;
// const stroage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "image");
//   filename: (req, file, cb) => {
//     cb(null, Date.now()+ path.extname(file.orginalname));
// } }
// })
// const upload = multer({dest: 'uploads/'})
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
// app.use('/uploads', express.static('uploads')); // Serve uploaded images
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_LOCALHOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();


app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});


app.get("/user", async function (req, res) {
  const result = await db.query("SELECT * FROM posts");
  const posts = result.rows;
  if (posts ) {
    res.render("user.ejs", { posts: posts, currentUser: req.user.id });
  } else {
    res.render("user.ejs", { posts: null });
  }
  
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
  //res.render("register.ejs", { errors: [] });
});

app.get("/post", async function (req, res) {
res.render("post.ejs")
});

app.post("/post", async function (req, res) {
  if (!req.user || !req.user.id) {
    return res.status(400).send("User is not logged in.");
  }
  const submittedTitle = req.body.title;
  const submittedPost = req.body.post;
  const userId = req.user.id;
  const userName = req.user.name;
  console.log(userName)

  if (!userId) {
    return res.status(400).send("User ID not found.");
  }
  console.log(submittedPost);
  try {
    const result = await db.query("INSERT INTO posts (title, content, user_id, user_name) VALUES ($1, $2, $3, $4) RETURNING id",
      [submittedTitle, submittedPost, userId, userName]);
    const post = result.rows[0];
    res.redirect("/user")

  } catch (err) {
    console.log(err)
  }

});

// <-------------------------------VISIT PROFILE-------------------------------->
app.get("/user/:postId", async (req, res) => {
  try {
    const id = req.params.postId;
    const postResult = await db.query("SELECT user_id FROM posts WHERE user_id = $1", [id]);
    console.log("id: "+ id)
    const userId = postResult.rows[0];
    console.log("user ID:" + userId.user_id);
    const userResult = await db.query("SELECT * FROM users WHERE id = $1", [userId.user_id]);
    const users = userResult.rows[0];
    res.render("view-user-profile.ejs", { user: users });

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/post/:id/edit",async function (req,res) {
    const id = req.params.id;
    const result = await db.query("SELECT id, title, content FROM posts WHERE id = $1", [id]);
    const post = result.rows[0];
    console.log(post)
    res.render("edit-post.ejs", {post: post});
});

app.post("/post/:id/edit", async function (req, res) {
  const id = req.params.id;
  const submittedTitle = req.body.title;
  const submittedPost = req.body.post;
  const userId = req.user.id;
  console.log(parseInt(id))
  const result = await db.query("SELECT title, content FROM posts WHERE id = $1 AND user_id = $2 ", [id, userId]);
  const currentData = result.rows[0]; 
  console.log("The current post: " + currentData.content);
  console.log("The current title: " + currentData.title);
  const updateTitle = submittedTitle || currentData.title;
  const updatePost = submittedPost || currentData.content;
  console.log("New post: " + updatePost);
  console.log("New Title: " + updateTitle);
  const updateResult = await db.query("UPDATE posts SET title = $1, content = $2 WHERE id = $3",
      [updateTitle, updatePost, id]);
  res.redirect("/user");
});
app.post("/post/:id/delete", async function (req, res) {
  const id = req.params.id;
  const userId = req.user.id;
  const updateResult = await db.query("DELETE FROM posts WHERE id = $1 AND user_id = $2", [id, userId]);
  res.redirect("/user");
});

app.post("/delete-account", async function (req, res) {
  try {
    if (req.isAuthenticated()) {
      const result = await db.query("DELETE FROM users WHERE email = $1", [req.user.email]);
      req.session.destroy((err) => {
        if (err) {
          console.error("Error logging out:", err);
        }
      });
      res.redirect("/");
    }
  } catch (err) {
    console.log(err);
  }
})

app.get("/profile", async function (req, res) {
  if (req.isAuthenticated()) {
    const result = await db.query("SELECT * FROM users WHERE email = $1",
      [req.user.email]
    );
    const users = result.rows[0];
    if (users) {
      res.render("profile.ejs", { users: users });
    } else {
      res.render("profile.ejs", { users: null });
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit.ejs")
  } else {
    res.redirect("/login")
  }
})

app.post("/login", passport.authenticate("local", {
  failureRedirect: "/login",
  successRedirect: "/user"
}));

app.post("/register",  async (req, res) => {
  const name = req.body.name;
  const mobile = req.body.mobile;
  const email = req.body.username;
  const image = req.body.image;
  const password = req.body.password;
  //const password2 = req.body.password;
  // let errors = [];

  // if (!name || !mobile || !email || !password) {
  //   errors.push({ message: "Please enter all fields" });
  // }
  // if (password.length < 6) {
  //   errors.push({ message: "Password should be at least 6 characters" });
  // }
  // if (password != password2) {
  //   errors.push({ message: "Passwords are not matched" });
  // }

  // if (errors.length > 0) {
  //   return res.render("register.ejs", { errors : errors });
  // }
console.log(image);


  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);


    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (name, mobile, email, password, img) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, mobile, email, hash, image]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/user");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});


app.post("/submit", async function (req, res) {
  const submittedName = req.body.name;
  const submittedMobileNum = req.body.mobile;
  const submittedEmail = req.body.email;

  try {

    const userResult = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
    const currentUser = userResult.rows[0];

    const nameToUpdate = submittedName || currentUser.name;
    const mobileToUpdate = submittedMobileNum || currentUser.mobile;
    const emailToUpdate = submittedEmail || currentUser.email;

    await db.query(
      "UPDATE users SET name = $1, mobile = $2, email = $3 WHERE email = $4",
      [nameToUpdate, mobileToUpdate, emailToUpdate, req.user.email]
    );
    req.user.email = emailToUpdate;

    res.redirect("/profile");
  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred while updating the user data.");
  }
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      let result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
      let role = "user";
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              user.role = role;
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb(null, false); 
      }
    } catch (err) {
      console.error("Error querying database:", err);
      return cb(err);
    }
  })
);
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});