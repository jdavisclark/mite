module.exports = function(sqlize) {
	return {
		Migration: sqlize.import(__dirname + "/migrationModel")
	};
};