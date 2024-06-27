const mongoose = require("mongoose");
require("dotenv").config();

const dbURI = process.env.MONGODB_URI;

mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log(`Connection successful to ${dbURI}`);
})
.catch((error) => {
  console.error(`Error connecting to the database. \n${error}`);
});
