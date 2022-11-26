const router = require("express").Router();
const Course = require("../models").course;
const courseValidation = require("../validation").courseValidation;

router.use((req, res, next) => {
  console.log("course route is receiving a req...");
  next();
});

router.get("/", async (req, res) => {
  try {
    let courseFound = await Course.find({})
      // query object (thenable object)
      .populate("instructor", ["username", "email"])
      .exec();
    return res.send(courseFound);
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.get("/instructor/:instructor_id", async (req, res) => {
  let { instructor_id } = req.params;
  let coursesFound = await Course.find({ instructor: instructor_id })
    .populate("instructor", ["username", "email"])
    .exec();
  return res.send(coursesFound);
});

router.get("/student/:student_id", async (req, res) => {
  let { student_id } = req.params;
  let coursesFound = await Course.find({ students: student_id })
    .populate("instructor", ["username", "email"])
    .exec();
  return res.send(coursesFound);
});

router.get("/findByName/:name", async (req, res) => {
  let { name } = req.params;
  try {
    let courseFound = await Course.find({
      title: { $regex: `.*${name}*.`, $options: "i" },
    })
      .populate("instructor", ["email", "username"])
      .exec();
    return res.send(courseFound);
  } catch (e) {
    return res.status(500).send(e);
  }
});

router.get("/:id", async (req, res) => {
  let { _id } = req.params;
  try {
    let courseFound = await Course.findOne({ _id })
      .populate("instructor", "email")
      .exec();
    return res.send(courseFound);
  } catch (e) {
    return res.status(500).send(e);
  }
});

// create courses
router.post("/", async (req, res) => {
  // 驗證
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  if (req.user.isStudent()) {
    return res
      .status(400)
      .send(
        "Only instructor can launch new courses. If you are an instructor, please login with your instructor account."
      );
  }
  let { title, description, price } = req.body;
  try {
    let newCourse = new Course({
      title,
      description,
      price,
      instructor: req.user._id,
    });
    let saveCourse = await newCourse.save();
    return res.send("This new course is saved in database.");
  } catch (e) {
    console.log(e);
    return res.status(500).send("Cannot launch a new courses.");
  }
});

// enroll courses
router.post("/enroll/:_id", async (req, res) => {
  let { _id } = req.params;
  try {
    let course = await Course.findOne({ _id }).exec();
    course.students.push(req.user._id);
    await course.save();
    return res.send("註冊完成");
  } catch (e) {
    return res.send(e);
  }
});

// udpate courses
router.patch("/:id", async (req, res) => {
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let { _id } = req.params;
  try {
    let courseFound = await Course.findOne({ _id });
    // confirm this course exists
    if (!courseFound) {
      return res
        .status(400)
        .send("Cannot Find the course you enter, udpate function failed.");
    }
    // confirm id
    if (courseFound.instructor.equals(res.user._id)) {
      let updatedCourse = await Course.findOneAndUpdate({ _id }, req.body, {
        new: true,
        runValidators: true,
      });
      return res.send({
        message: "This course is updated successfully.",
        updatedCourse,
      });
    } else {
      return res.status(403).send("You are not the instructor of this course.");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

// delete course
router.delete("/:id", async (req, res) => {
  let { _id } = req.params;
  try {
    let courseFound = await Course.findOne({ _id });
    // confirm this course exists
    if (!courseFound) {
      return res
        .status(400)
        .send("Cannot Find the course you enter, delete function failed.");
    }
    // confirm id
    if (courseFound.instructor.equals(res.user._id)) {
      await Course.deleteOne({ _id }).exec();
      return res.send("This course is deleted.");
    } else {
      return res.status(403).send("You are not the instructor of this course.");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

module.exports = router;
