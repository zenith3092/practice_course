const router = require("express").Router();
const registerValidation = require("../validation").registerValidation;
const loginValidation = require("../validation").loginValidation;
const User = require("../models").user;
const jwt = require("jsonwebtoken");

router.use((req, res, next) => {
  console.log("Receiving a req about auth.");
  next();
});

router.get("/testAPI", (req, res) => {
  return res.send("Succeed to connect auth route...");
});

router.post("/register", async (req, res) => {
  let { error } = registerValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const emailExise = await User.findOne({ email: req.body.email });
  if (emailExise)
    return res.status(400).send("This email address have been registered");

  let { email, username, password, role } = req.body;
  let newUser = new User({ email, username, password, role });
  try {
    let saveUser = await newUser.save();
    console.log("Register successfully.");
    return res.send({
      msg: "This user data is saved in database successfully.",
    });
  } catch (e) {
    return res.status(500).send("Cannot save this user data.");
  }
});

router.post("/login", async (req, res) => {
  let { error } = loginValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const foundUser = await User.findOne({ email: req.body.email });
  if (!foundUser) {
    return res
      .status(401)
      .send("Cannot find this user. Please confirm whether email is correct.");
  }
  foundUser.comparePassword(req.body.password, (err, isMatch) => {
    if (err) return res.status(500).send(err);
    if (isMatch) {
      // make JWT
      const tokenObject = { _id: foundUser._id, email: foundUser.email };
      const token = jwt.sign(tokenObject, process.env.PASSPORT_SECRET);
      return res.send({
        message: "Login successfully.",
        token: "JWT " + token,
        user: foundUser,
      });
    } else {
      return res.status(401).send("Password incorrect.");
    }
  });
});

module.exports = router;
