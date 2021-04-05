//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-ryan:BingBong1234@album-backlog.pewr9.mongodb.net/musicDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const albumsSchema = mongoose.Schema({
  artist: {
    type: String
    //required: [true, "All entries need an artist name."]
  },
  title: {
    type: String
  }
});

const Album = mongoose.model("Album", albumsSchema);


//example albums that will populate the backlog if it is empty
const beUpAHello = new Album({
  artist: "Squarepusher",
  title: "Be Up A Hello"
});

const melee = new Album({
  artist: "Dogleg",
  title: "Melee"
});

const noDream = new Album({
  artist: "Jeff Rosenstock",
  title: "NO DREAM"
});

const defaultItems = [beUpAHello, melee, noDream];


//Used for custom backlogs, perhaps based on genre
const listSchema = {
  name: String,
  items: [albumsSchema]
};

const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {
  Album.find(function(err, albums) {
    //insert default albums if the list is empty
    if (albums.length === 0) {
      Album.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully saved albums.")
        }
      });
      //kickback to root route then skip straight to the last else block
      res.redirect("/");
    } else {
      res.render("list", {
        listTitle: "Album Backlog",
        newListItems: albums
      });
    }
  });
});

app.post("/", function(req, res) {
  //creates a new Album document and saves it to the database
  const artistName = req.body.newArtist;
  const albumTitle = req.body.newTitle;
  const listName = req.body.list;

  const newAlbum = new Album({
    artist: artistName,
    title: albumTitle
    //genre: genreName
  });

  if(listName === "Album Backlog"){
    newAlbum.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(newAlbum);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});


//deletes list entries and deletes document from database
app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  //will delete entries from each custom list
  const listName = req.body.listName;

  //if check to see if deleted item is from default list or custom list
  if(listName === "Album Backlog") {
    Album.findOneAndDelete(checkedItemId, function(err) {
      if (!err) {
        console.log("Entry deleted.");
        res.redirect("/");
      }
    });
  } else {
    //drops a document from the items array without traversing the whole array
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if(!err){
        res.redirect("/" + listName);
      }
    });
  }
});

app.get("/:customListName", function(req, res) {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName}, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        //create a new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });

        list.save();
        res.redirect("/" + customListName);
      } else {
        //show existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });
});

app.get("/about", function(req, res) {
  res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started on port 3000");
});
