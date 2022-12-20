const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
const { json } = require("sequelize");
let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

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

  test("Creates a todo and responds with json at /todos POST endpoint", async () => {
    const res = await agent.get("/");
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
    let res = await agent.get("/");
    let  csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "speaking skills",
      dueDate: new Date().toISOString(),
      completed: true,
      _csrf:csrfToken,
    });
    const parsedResponse = await agent .get("/") .set("Accept", "application/json");
    const parsedResponse1 = JSON.parse(parsedResponse.text);
    const dueTodayCount = parsedResponse1.dueToday.length;
    const latestTodo = parsedResponse1.dueToday[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
      });

    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(false);



  });

  test("Mark a todo as incomplete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "speaking skills",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const parsedResponse = await agent .get("/") .set("Accept", "application/json");
  const parsedResponse1 = JSON.parse(parsedResponse.text);
  const dueTodayCount = parsedResponse1.dueToday.length;
  const latestTodo = parsedResponse1.dueToday[dueTodayCount - 1]; 



  res = await agent.get("/");
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
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      _csrf: csrfToken,
      title: "speaking skills",
      dueDate: new Date().toISOString(),
    });

    const parsedResponse = await agent .get("/") .set("Accept", "application/json");
    const parsedResponse1 = JSON.parse(parsedResponse.text);
    expect(parsedResponse1.dueToday).toBeDefined();
    const dueTodayCount = parsedResponse1.dueToday.length;
    const presentTodo = parsedResponse1.dueToday[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);
    const deleted = await agent.delete(`/todos/${presentTodo.id}`).send({
      _csrf: csrfToken,
    });
    const DeletedResponse1 = JSON.parse(deleted.text);

    expect(DeletedResponse1).toBe(true);
  });
});
