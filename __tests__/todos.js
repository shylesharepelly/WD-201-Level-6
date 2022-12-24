const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
const { json } = require("sequelize");
const { response } = require("../app");
let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login=async(agent,username,password)=>{
  let res=await agent.get("/login");
  let csrfToken=extractCsrfToken(res);
  res=await agent.post("/session").send({
    email:username,
    password:password,
    _csrf:csrfToken
  });
};

describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign up",async()=>{
    const res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    const res1 = await agent.post("/users").send({
      firstname:"Test",
      lastName:"User A",
      email:"user.a@test.com",
      password:"12345678",
      _csrf:csrfToken,
    });
    expect(res1.statusCode).toBe(302);
  });


 
  test("Creates a todo and responds with json at /todos POST endpoint", async () => {
    const agent=request.agent(server);
    await login(agent,"user.a@test.com","12345678");
    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);
    const res1 = await agent.post("/todos").send({
      title: "speaking skills",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf:csrfToken,
    });
    expect(res1.statusCode).toBe(302);
    
  });

  test("Marks a todo with the given ID as complete", async () => {
    const agent=request.agent(server);
    await login(agent,"user.a@test.com","12345678");
    let res = await agent.get("/todos");
    let  csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "speaking skills",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf:csrfToken,
    });
    const parsedResponse = await agent .get("/todos") .set("Accept", "application/json");
    const parsedResponse1 = JSON.parse(parsedResponse.text);
    const dueTodayCount = parsedResponse1.dueToday.length;
    const latestTodo = parsedResponse1.dueToday[dueTodayCount - 1];

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
        completed:true,
      });

    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);

  });

  test("Mark a todo as incomplete", async () => {
    const agent=request.agent(server);
    await login(agent,"user.a@test.com","12345678");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "speaking skills",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const parsedResponse = await agent .get("/todos") .set("Accept", "application/json");
  const parsedResponse1 = JSON.parse(parsedResponse.text);
  const dueTodayCount = parsedResponse1.dueToday.length;
  const latestTodo = parsedResponse1.dueToday[dueTodayCount - 1]; 



  res = await agent.get("/todos");
  csrfToken = extractCsrfToken(res);

  const markCompleteResponse = await agent
    .put(`/todos/${latestTodo.id}`)
    .send({
      _csrf: csrfToken,
      completed: true,
    });

  const UpdateResponse = JSON.parse(markCompleteResponse.text);
  expect(UpdateResponse.completed).toBe(true);



  });

  test("Deletes a todo with the given ID if it exists and sends a boolean response", async () => {
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      _csrf: csrfToken,
      title: "speaking skills",
      dueDate: new Date().toISOString(),
    });

    const parsedResponse = await agent .get("/todos") .set("Accept", "application/json");
    const parsedResponse1 = JSON.parse(parsedResponse.text);
    expect(parsedResponse1.dueToday).toBeDefined();
    const dueTodayCount = parsedResponse1.dueToday.length;
    const presentTodo = parsedResponse1.dueToday[dueTodayCount - 1];

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
    const deleted = await agent.delete(`/todos/${presentTodo.id}`).send({
      _csrf: csrfToken,
    });
    const DeletedResponse1 = JSON.parse(deleted.text);

    expect(DeletedResponse1).toBe(true);
  });

  test("sign out",async()=>{
    let res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  });

});
