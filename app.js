const express = require("express");
const app = express();
var csrf = require("tiny-csrf");
const { Todo,User } = require("./models");
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(express.urlencoded({extended:false}));
var cookieParser=require("cookie-parser");

const bcrypt = require('bcrypt');

const saltRounds=10;

const passport=require('passport');
const connectEnsureLogin = require('connect-ensure-login');
const session = require('express-session');
const LocalStrategy = require('passport-local');

app.use(cookieParser("ssh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));


app.set("view engine","ejs");
const path = require('path');



app.use(express.static(path.join(__dirname,"public")));

app.use(session({
  secret:"my-secret-super-key-21728172615261562",
  cookie:{
    maxAge:24*60*60*1000
  }
}))

app.use(passport.initialize());
app.use(passport.session());



passport.use(new LocalStrategy({
  usernameField:'email',
  passwordField:'password'
},(username,password,done)=>{
  User.findOne({where:{email:username}})
  .then(async(user)=>{
    const result= await bcrypt.compare(password,user.password)
    if(result){
      return done(null,user);
    }
    else{
      return done("Invalid password");
    }
    
  }).catch((error)=>{
    return (error)
  })
}
))

passport.serializeUser((user,done)=>{
  console.log("Serializing user in session",user.id)
  done(null,user.id)
});
passport.deserializeUser((id,done)=>{
  User.findByPk(id)
  .then(user=>{
    done(null,user)
  })
  .catch(error=>{
    done(error,null)
  })
});


app.get("/",async  function (request, response) {
  console.log(request.user)
    response.render("index", {
      title: "Todo application",
      csrfToken: request.csrfToken(),
    });
  
});

app.get("/todos", connectEnsureLogin.ensureLoggedIn(), async  function (request, response) {
  console.log(request.user)
  const allTodos = await Todo.getTodos();
  const overdue = await Todo.overdue();
  const dueToday = await Todo.dueToday();
  const dueLater = await Todo.dueLater();
 const completed = await Todo.completed();
  if (request.accepts("html")) {
    response.render("todos", {
      title: "Todo application",
      overdue,
      dueToday,
      dueLater,
      completed,
      csrfToken: request.csrfToken(),
    });
  }
  else{
    response.json({
      overdue,
      dueToday,
      dueLater,
      completed,
    })
  }
});

app.get("/signup",(request,response)=>{
  response.render("signup",{title:"Signup",csrfToken: request.csrfToken()})
  
})

app.post("/users",async (request,response)=>{
 
  const hashedpwd = await bcrypt.hash(request.body.password,saltRounds)
  console.log(hashedpwd)
try{
  const user= await User.create({
    firstName:request.body.firstName,
    lastName:request.body.lastName,
    email:request.body.email,
    password:hashedpwd,
  
  });
  request.login(user,(err)=>{
    if(err){
      console.log(err);
    }
    response.redirect("/todos");
  })
}
catch(error){
console.log(error);
}

})

app.get('/login',(request,response)=>{
  response.render("login",{title:"login",csrfToken:request.csrfToken()});
})

app.get("/signout",(request,response,next)=>{
  request.logout((err)=>{
    if(err)
    {
      return next(err);
    }
    response.redirect("/");
  })
})


app.post("/session",passport.authenticate( 'local',{failureRedirect:"/login"}), (request,response)=>{
  console.log(request.user);
  response.redirect("/todos");

})

app.get("/todos/:id", async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/todos",connectEnsureLogin.ensureLoggedIn(), async (request, response)=> {
  try {
    await Todo.addTodo({
      title:request.body.title,
      dueDate:request.body.dueDate,
    });
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id",connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.setCompletionStatus(request.body.completed);
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id",connectEnsureLogin.ensureLoggedIn(), async (request, response) =>{
  try{
    await Todo.remove(request.params.id);
    return response.json(true);
  }
  catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

module.exports = app;
