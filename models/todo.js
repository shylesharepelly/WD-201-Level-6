"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    static associate(models) {
      // define association here

      Todo.belongsTo(models.User,{
        foreignKey:'userId'
      })
    }

    static addTodo({ title, dueDate ,userId}) {
      return this.create({ title: title, dueDate: dueDate, completed: false, userId });
    }
    static async overdue(userId) {
      return this.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
          userId,
          completed: false,
        },
      });
    }

    static async dueLater(userId) {
      return this.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
          userId,
          completed: false,
        },
      });
    }

    static async dueToday(userId) {
      return this.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date(),
          },
          userId,
          completed: false,
        },
      });
    }
    static async remove(id,userId) {
      return this.destroy({
        where: {
          id,
          userId
        },
      });
    }
    static async completed(userId) {
      return this.findAll({
        where: {
          completed: true,
          userId
        },
      });
    }

    static getTodos(userId)
    {
      return this.findAll({
        where:{
          userId,
        },
      });
    }
    setCompletionStatus(completed) {
      return this.update({ completed});
    }
  }
  Todo.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
     }, dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
