var Sqlize = require("sequelize");

module.exports = function(sqlize, DataTypes) {
	return sqlize.define("Migration", {
		key: {
			type: DataTypes.STRING(255),
			allowNull: false,
			primaryKey: true
		},
		hash: {
			type: DataTypes.STRING(40),
			allowNull: false,
			unique: true
		}
	}, {
		freezeTableName: true,
		tableName: "_migration"
	});
};