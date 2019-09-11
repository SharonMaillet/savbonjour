//jshint esversion:6

// require les packages installer avec npm
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const path = require("path"); //core ejs module
const multer = require("multer");
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static("public"));

app.use(session({ //express-session
    secret: "Our little secret",
    resave: false, 
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session()); //passport

mongoose.connect("mongodb+srv://sharon:admin@cluster0-uvxzz.mongodb.net/savDB", { useNewUrlParser: true }); //connexion a la bdd savDB
     

// Set The Storage Engine
var storage = multer.diskStorage({
    destination: 'public/upload',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

var upload = multer({ storage: storage });


// Check File Type
function checkFileType(file, cb) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}


const companySchema = {  //schema de la db
    name: String,
    phone: Number,
    phone2: Number,
    mail: String,
    type: String,
    filename: String,
};

const userSchema = new mongoose.Schema ({
    username: String, /* I*/
    password: String
});

userSchema.plugin(passportLocalMongoose); //hash and salt

const Company = mongoose.model("Company", companySchema);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {  //affichage de la page home
    
    Company.find({}, function (err, foundCompanies) {
        res.render("home", {
            name: foundCompanies.name,
            companies: foundCompanies
        });
    }).sort({ name: 1 });
});

app.get("/savs", function (req, res) {  //affichage de la page home
    
    Company.find({}, function (err, foundCompanies) {
        res.render("liste-savs", {
            name: foundCompanies.name,         
            companies: foundCompanies
            
        });
    }).sort({name:1}); // Ordre Alphabetique
});

app.get("/company", function (req, res) {  //affichage de la page de la société
    res.render("company");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("admin");
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("admin");
            });
        }
    });
});


app.get("/login", function (req, res) {
    res.render("login");
});


app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("admin");
            });
        }
    });

});

app.get("/company/:CompName", function (req, res) {  //affichage de la page de la société
    if (err) {
        res.redirect('home');
    } else {
    const requestedCompany = req.params.CompName;

    Company.findOne({name: requestedCompany}, function(err, company){
        
        res.render("company", {
            name: company.name,
            phone: company.phone,
            phone2: company.phone2,
            mail: company.mail,
            filename: company.filename,
            companies: company
        });            

    });         
    }

 
});

app.get("/admin", function (req, res) {  //affichage de la page de la admin
   /* if(req.isAuthenticated()) { */
        Company.find({}, function (err, company) {
            res.render("admin", {
                name: company.name,
                phone: company.phone,
                phone2: company.phone2,
                mail: company.mail,
                type: company.type,
                companies: company
            });
        }).sort({ name: 1 });
    /*} else {
        res.redirect("login");
    } */
});

app.post("/admin", function (req, res) {  //affichage de la page de la admin add
    
    const company = new Company({
        name: req.body.name,
        phone: req.body.phone,
        phone2: req.body.phone2,
        mail: req.body.mail,
        type: req.body.type
    });

    global.newItem = req.body.name;

    company.save(function (err) {
        if (!err) {
            res.redirect("/admin-upload");
            console.log("Item added successfully");
            newItem = req.body.name;
            console.log(newItem);
        } else {
            console.log(err);
            res.redirect("/admin");
        }
    });
});

app.get("/admin-edit", function (req, res) {  //affichage de la page de la admin
    Company.find({}, function (err, company) {
        res.render("admin-edit", {
            id: company._id,
            name: company.name,
            phone: company.phone,
            phone2: company.phone2,
            mail: company.mail,
            type: company.type,
            filename: company.filename,
            companies: company
        });
    }).sort({ name: 1 });
});


app.post("/admin-edit", function (req, res) {  //affichage de la page de la admin add

    var id = ObjectId(req.body.id);

    Company.updateOne({ _id: id }, { name:req.body.name, phone:req.body.phone}, function (err) {
        if (err)
            throw (err);
    });
    res.redirect("/admin");
}); 


app.post("/admin-delete", function (req, res) {
    const deletedItem = req.body.suppr;
    
    Company.findByIdAndDelete(deletedItem, function (err) {
        if (!err) {
            console.log("Successfully deleted item");
            res.redirect("/admin");
        } else {
            res.send("Error");
        }
    });
});

app.post("admin-update", function (req, res) {

});

app.get("/admin-upload", function (req, res) {  //affichage de la page de la admin
        res.render("admin-upload");
});

app.post("/admin-upload", upload.single("logo"), function (req, res) {  //affichage de la page de la admin add
    
   const company = Company({
        name: newItem,
        filename: req.file.fieldname
    });
    filename = req.file.filename
    Company.updateOne({ name: newItem }, { $set: { filename: filename }}, function (err) {
        if (err)
            throw (err);          
    }); 
    res.redirect('/admin');
}); 



 app.listen(3000, function () { //connexion au localhost
    console.log("Server started on port 3000");
});