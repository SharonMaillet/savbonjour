//jshint esversion:6
// require les packages installer avec npm
require('dotenv').config(); //zero-dependency module that loads environment variables from a .env file into process.env
const express = require("express"); //web framework for node
const fileUpload = require('express-fileupload'); //express middleware for uploading files.
const bodyParser = require("body-parser"); //Node.js body parsing middleware.
const ejs = require("ejs"); //templating language that lets generate HTML markup with plain JS
const mongoose = require('mongoose'); //MongoDB object modeling for Node.js
const ObjectId = mongoose.Types.ObjectId;
const session = require('express-session'); //Create a session middleware
const passport = require('passport'); // authentication middleware for Node.js.
const passportLocalMongoose = require('passport-local-mongoose'); // Mongoose plugin that simplifies building username and password login with Passport.
const path = require("path"); //core ejs module
const app = express();

app.set('view engine', 'ejs'); //moteur de modèle à utiliser

app.use(bodyParser.json());       
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static("public")); //serve images, CSS files, and JavaScript files in a directory 

app.use(session({ //express-session
    secret: process.env.SESSION_SECRET, // key used for signing and/or encrypting cookies. Ensure that random person can't access admin
    resave: false, 
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session()); //passport

app.use(fileUpload({
    createParentPath: true
}));

mongoose.connect("mongodb+srv://sharon:admin@cluster0-uvxzz.mongodb.net/savDB", {  //connexion a la bdd savDB
    useUnifiedTopology: true, 
    useNewUrlParser: true, 
    useCreateIndex: true 
});
     
const companySchema = {  //on defini le schema de la db, cela permet de définir les types de variables et de structurer vos données
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

const Company = mongoose.model("Company", companySchema);  //permet d'insérer des données dans MongoDB en respectant le schéma précisé et d'aller faire des requêtes

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());     //a metter apres User car sinon User n'est pas défini

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {  //affichage de la page home
    Company.find({}, function (err, foundCompanies) {
        res.render("home", {
            name: foundCompanies.name,
            companies: foundCompanies
        });
    }).sort({ name: 1 }); // Ordre Alphabetique
});

app.get("/savs", function (req, res) {  //affichage de la page home
    Company.find({}, function (err, foundCompanies) {
        res.render("liste-savs", {
            name: foundCompanies.name,         
            companies: foundCompanies
        });
    }).sort({name:1}); 
});

app.get("/phone", function (req, res) {  //affichage de la page home
    Company.find({'type':/phone/}, function (err, foundCompanies) {
        res.render("liste-savs", {
            name: foundCompanies.name,
            companies: foundCompanies
        });
    }).sort({ name: 1 });
});

app.get("/hardware", function (req, res) {  //affichage de la page home
    Company.find({ 'type': /hardware/ }, function (err, foundCompanies) {
        res.render("liste-savs", {
            name: foundCompanies.name,
            companies: foundCompanies
        });
    }).sort({ name: 1 });
});

app.get("/computer", function (req, res) {  //affichage de la page home
    Company.find({ 'type': /computer/ }, function (err, foundCompanies) {
        res.render("liste-savs", {
            name: foundCompanies.name,
            companies: foundCompanies
        });
    }).sort({ name: 1 });
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
            res.redirect("register");
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
            res.redirect("/login");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("admin");
            });
        }
    });

});

app.get("/company/:CompName", function (req, res, err) {  //affichage de la page de la société
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
});

app.get("/admin", function (req, res) {  //affichage de la page de la admin
    if(req.isAuthenticated()) { //si admin est authentifier
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
    } else {
        res.redirect("login");
    }
});

app.post("/admin", function (req, res) {  //affichage de la page de la admin add   
    let fileExt = req.files.logo.mimetype; //pour filter seulement les images
    let lastSlash = fileExt.lastIndexOf('/'); //pour avoir l'extention
    let ext = fileExt.substring(lastSlash + 1);
    
    let newFileName = "logo-" + req.body.name.toLowerCase() + "." + ext;
    let clearName = newFileName.replace(/\s+/g, ''); //le nom sans espace et characteres spéciaux

    const company = new Company({ //creation d'une nouvelle entrée
        name: req.body.name,
        phone: req.body.phone,
        phone2: req.body.phone2,
        mail: req.body.mail,
        type: req.body.type,
        filename: clearName
    });    
    
    if( (!req.files || (fileExt !== 'image/jpeg' && fileExt !== 'image/png')) ) { //si il n'y a pas de fichier ou que le fichier n'est pas une image
        res.redirect("/admin");
    } else {
        let logo = req.files.logo;
        //Use the mv() method to place the file the upload directory
        logo.mv('public/upload/' + clearName);
        //send response
        company.save(function (err) {
        if (!err) {
            res.redirect("/admin");
        } else {
            res.redirect("/admin");
        }
    });
}
});


app.post("/admin-edit", function (req, res) {  //edition
  
    if (!req.files) { //si il n'y a pas de nouveau fichier, on update toutes les autres entrées SAUF fichier
    let id = ObjectId(req.body.id);
    Company.updateOne({ _id: id }, { name:req.body.name, phone:req.body.phone, phone2:req.body.phone2,  mail:req.body.mail,  type:req.body.type}, function (err) {
        if (err) {
        throw (err);   //si il y a une erreur, on passe a la ligne suivante         
        }
    });
    res.redirect("/admin");        
    } else { // sinon on update tout
        let fileExt = req.files.newFile.mimetype;
        let lastSlash = fileExt.lastIndexOf('/');
        let ext = fileExt.substring(lastSlash + 1);

        if( fileExt !== 'image/jpeg' && fileExt !== 'image/png' ) {
            res.redirect("/admin"); //si les fichiers ne sont pas des images on redirige vers admin et on stop l'update
        } else {
            let newFile = req.files.newFile;
            let newFileName = "logo-" + req.body.name.toLowerCase() + "." + ext;
            let clearName = newFileName.replace(/\s+/g, '');
            newFile.mv('public/upload/' + clearName);
            //on update tout
            Company.updateOne({name: req.body.name}, { phone:req.body.phone, phone2:req.body.phone2,  mail:req.body.mail, type:req.body.type, filename: clearName}, function(err){
                if (err) {
                    console.log(err);
                    res.redirect("/admin");
                }
            });
            res.redirect("/admin");
        }
    }
}); 


app.post("/admin-delete", function (req, res) {

   const deletedItem = req.body.suppr;

   Company.findByIdAndDelete(deletedItem, function (err) {
        if (!err) {
            res.redirect("/admin");
        } else {
            res.redirect("/admin");
        }
    });
});

let port = process.env.PORT; //connexion a heroku
if (port === null || port == '') {
    port= 3000;     //connexion au localhost:3000
}

 app.listen(3000, function () { 
    console.log("Server started");
});