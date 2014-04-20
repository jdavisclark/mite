module.exports = Migration;

function Migration(data) {
	this.up = data.up;
	this.down = data.down;
	this.key = data.key;
	this.hash = data.hash;

	this.submodule = data.submodule || ".";
}