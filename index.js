const express=require("express");
const app=express();
const MongoClient=require("mongodb").MongoClient;
const bodyParser=require("body-parser");
const fs=require("fs");
const json2xls= require("json2xls");
var db;

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname+"/views"));
app.use(express.static(__dirname+"/public"));

MongoClient.connect("mongodb://127.0.0.1:27017",{useUnifiedTopology: true},(err,client)=>{
    if(err){
        throw err;
    }
    db=client.db("libraryInventory");
    console.log("Database connection successful.");
});

app.get("/",(req,res)=>{
    async function getDetails(){
        let result=await db.collection("inventory").find({}).project({_id: 0}).toArray();
        await fs.writeFile("public/BookDetails.json",JSON.stringify(result,null,4),async(err)=>{
            if(err){
                await console.log(err);
            }
        });
        xls=await json2xls(result);
        await fs.writeFile("public/BookDetails.xlsx",xls,'binary',async (err)=>{
            if(err){
                await console.log(err);
            }
        });
        await res.render("index.ejs",{
            data: result
        })
    }
    getDetails();
});
app.get("/edit",(req,res)=>{
    let bId=req.query["id"];
    if(bId.trim()==""){
        res.redirect("/");
        return;
    }
    else{
        async function getDetails(){
            let result=await db.collection("inventory").findOne({"bookId": bId});
            if(result==null){
                await res.redirect("/");
                return;
            }
            await res.render("edit.ejs",{
                "data": result,
                "error": ""
            })
        }
        getDetails();
    }
});
app.post("/edit",(req,res)=>{
    async function updateBook(){
        let query=req.body;
        let keys=Object.keys(query);
        for(let i=0;i<keys.length;i++){
            if(query[keys[i]].trim("")==""){
                await res.redirect(`/edit?id=${query["bookId"]}`);
                return;
            }
        }
        await db.collection("inventory").updateOne({"bookId": query["bookId"]},{$set: req.body});
        await res.redirect("/");
    }
    updateBook();
});
app.get("/delete",(req,res)=>{
    let bId=req.query["id"];
    async function deleteBook(){
        await db.collection("inventory").deleteOne({"bookId":bId});
        await res.redirect("/");
    }
    deleteBook();
});
app.get("/addBook",(req,res)=>{
    res.render("addbook.ejs",{
        "error": ""
    });
})
app.post("/addBook",(req,res)=>{
    async function addBook(){
        let query=req.body;
        let keys=Object.keys(query);
        for(let i=0;i<keys.length;i++){
            if(query[keys[i]].trim("")==""){
                res.render("addbook.ejs",{
                    "error": "All Fields are required."
                });
                return;
            }
        }
        let result=await db.collection("inventory").findOne({"bookId":req.body["bookId"]});
        if(result==null){
            await db.collection("inventory").insertOne(req.body);
            await res.redirect("/");
        }
        else{
            await res.render("addbook.ejs",{
                "error": "Book ID given already exists."
            })
        }
    }
    addBook();
});

app.listen(2020,()=>{
    console.log("Listening at port 2020.");
})