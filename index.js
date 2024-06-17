const port = 4000;
const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')// using this path we can get path for our present working directory
const cors = require('cors')
const dotenv = require("dotenv");


const app = express();
app.use(cors());
dotenv.config()
app.use(express.json()); // using this every req will be parsed through json

// db connection with mongodb
//mongodb+srv://balabittu1143:abcdef123@cluster0.rhabnqx.mongodb.net/

mongoose.connect(process.env.MONGO_URL);
 

// api

app.get("/",(req,res)=>{
    res.send("app is running");
})

// image storage engine
// const storage = multer.diskStorage({
//     destination: './upload/images',
//     filename: (req,file,cb)=>{
//         return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
//     }
// })
// // using multer we create one upload function 
// const upload = multer({storage:storage});
// // creating upload end-point 
// app.use('/images',express.static("upload/images"));


// app.post("/upload",upload.single('product'), async (req,res)=>{
//     // await cloudinary.uploader.upload(req.file.filename,{
//     //     upload_preset: presetName
//     // })
//     res.json({
//         success:1,
//         image_url: `http://localhost:${port}/images/${req.file.filename}`
//     })
// })  


// schema for products
const Product = mongoose.model("Product",{
    id: {
        type: Number,
        required: true,
    },
    name:{
        type: String,
        required: true,
    },
    image:{
        type: String,
        required: true,
    },
    category:{
        type: String,
        required: true,
    },
    new_price:{
        type: Number,
        required: true,
    },
    old_price:{
        type: Number,
        required: true,
    },
    date:{
        type:Date,
        default: Date.now(),
    },
    available:{
        type: Boolean,
        default: true,
    },
}); // we use this schema to add product to our database


// endpoint for uploading product into database
app.post('/addproduct',async (req,res)=>{
    const products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);// getting last product and making it array
        let last_product = last_product_array[0]; // as last_product_array have only one ele we access it using 0
        id = last_product.id+1;
    }
    else{
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price
    });
    console.log(product);
    await product.save(); // we need to save every product we uploaded to database using .save()
    console.log("saved");
    res.json({
        success: true,
        name:req.body.name,
    })
});

// endpoint for deleting product from database
app.post("/removeproduct",async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("removed");
    res.json({
        success: true,
        name: req.body.name,
    })
});

// api for getting all products
app.get("/allproducts",async (req,res)=>{
    let products = await Product.find({});
    console.log("all products fetched");
    res.send(products);
});
// api for specific product
app.get("/product/:id",async (req,res)=>{
    const id = req.params.id;
    let product = await Product.find({id:id});
    res.send(product);
});

// schema creation for user

const Users = mongoose.model("Users",{
    name:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        unique: true,
    },
    password:{
        type: String,
        required: true,
    },
    cartData:{
        type:Object
    },
    date:{
        type:Date,
        default: Date.now(),
    }
})

// creating End-point for regestring the user

app.post("/signup",async (req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.json({success:false,errors: "This email is already in Use"});
    }
    let cart = {};
    for(let i = 0;i<300;i++){
        cart[i] = 0;   
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password: req.body.password,
        cartData: cart,
    });
    await user.save(); // here we saved the user to database

    // jwt authentication
    const key = { // key for encryption using jwt
        user : { 
            id: user.id,
        }
    }
    const token = jwt.sign(key,'secret_ecom'); // secret_ecom is our salt here we are encrypting 1 round

    return res.json({success:true,token});
});


//creating endpoint for user login

app.post("/login",async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const comparePasssword = req.body.password === user.password;
        if(comparePasssword){
            const key = {
                user:{
                    id: user.id,
                }
            }
            const token = jwt.sign(key,'secret_ecom');
            res.json({success:true,token})
        }
        else{
            res.json({success:false,errors:"Wrong password"});
        }
    }
    else{
        res.json({success:false,errors:`No account found with ${req.body.email}`});
    }
})

// creating end point for new collections
app.get("/newcollections",async (req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8); // get recently added new collections
    console.log("New collections fetched");
    res.send(newcollection);
})

// creating end point for popular in women category
app.get("/popularinwomen",async (req,res)=>{
    let products = await Product.find({category:"women"});
    let popularwomen = products.slice(0,4); // get recently added new collections
    console.log("popular women fetched");
    res.send(popularwomen);
})
// creating end point for user data retrival
app.get("/profile",async (req,res)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"});
    }
    else{
        try{
            const data = jwt.verify(token,'secret_ecom');
            let userData = await Users.findOne({_id:data.user.id});
            res.send(userData);
        }catch(e){
            res.status(401).send({errors:"Please authenticate using valid token"});
        }
    }
})
// creating middleware to fetch user
const fetchuser = async (req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"});
    }
    else{
        try{
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        }catch(e){
            res.status(401).send({errors:"Please authenticate using valid token"});
        }
    }
}

// creating endpoint for adding products in cartdata
app.post("/addcart",fetchuser,async (req,res)=>{
    console.log("added",req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId]+=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})

//create end-point to remove cart item
app.post("/removefromcart",fetchuser,async (req,res)=>{
    console.log("removed",req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

// create endpoint to retrive data for cart
app.post("/getcart",fetchuser,async (req,res)=>{
    console.log("getcart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})
app.listen(port,()=>console.log(`running server on port ${port}`));